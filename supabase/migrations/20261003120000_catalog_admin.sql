-- Catalogue gere par l'admin (ROADMAP lot 2 ; CAHIER sections 6 et 17.3).

-- Statut « archive » : masque, historique conserve. Non utilise dans cette
-- migration (une valeur d'enum ajoutee n'est utilisable qu'apres commit).
alter type public.product_status add value if not exists 'archived';

create type public.product_condition as enum (
  'new',           -- neuf
  'used',          -- occasion
  'second_choice'  -- second choix (defaut d'aspect)
);

create type public.product_delivery_mode as enum (
  'pickup_only',  -- retrait uniquement
  'deliverable',  -- livraison possible
  'quote'         -- transport sur devis (valeur prudente par defaut)
);

alter table public.products
  add column sku text unique
    check (sku ~ '^[A-Za-z0-9._-]{1,40}$'),
  -- Ligne courte sous le nom (« Buckfast · Reine fecondee et testee »).
  add column tagline text check (char_length(tagline) <= 90),
  add column condition public.product_condition not null default 'new',
  add column defect_description text
    check (char_length(defect_description) <= 2000),
  -- Prix barre : affiche seulement s'il depasse le prix de base.
  add column compare_at_price numeric(10, 2)
    check (compare_at_price is null or compare_at_price > base_price),
  add column sale_unit text not null default 'unité'
    check (char_length(sale_unit) between 1 and 30),
  add column delivery_mode public.product_delivery_mode not null default 'quote',
  add column season_label text check (char_length(season_label) <= 60),
  add column published_at timestamptz;

update public.products
set published_at = created_at
where status = 'published' and published_at is null;

-- Date de premiere publication (tri « nouveautes »).
create or replace function public.set_product_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger set_published_at
  before insert or update of status on public.products
  for each row execute function public.set_product_published_at();

-- Caracteristiques ----------------------------------------------------------

create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  value text not null check (char_length(value) between 1 and 120),
  unit text check (char_length(unit) <= 20),
  position integer not null default 0
);

create index product_attributes_product_id_idx
  on public.product_attributes (product_id, position);

alter table public.product_attributes enable row level security;

create policy "Attributes of published products are publicly readable"
  on public.product_attributes for select
  to anon, authenticated
  using (public.is_published_product(product_id));

create policy "Admins have full access to product attributes"
  on public.product_attributes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Images envoyees depuis l'admin ---------------------------------------------

alter table public.product_images
  add column storage_path text unique,
  add column width integer check (width > 0),
  add column height integer check (height > 0);

-- Bucket public des photos produit : uniquement des WebP produits par le
-- serveur (reencodage). Aucune politique d'ecriture : seul le role service
-- (cote serveur, apres verification admin) depose ou supprime des fichiers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- Vue publique : nouvelles colonnes ajoutees en fin de liste ----------------

create or replace view public.public_catalog_products
with (security_barrier = true)
as
select
  id,
  category_id,
  name,
  slug,
  short_description,
  long_description,
  base_price,
  price_visibility,
  purchase_mode,
  status,
  featured,
  stock_display_mode,
  stock_status_label,
  stock_custom_message,
  case
    when stock_display_mode = 'exact' then stock_quantity
    else null
  end as displayed_stock_quantity,
  display_order,
  seo_title,
  seo_description,
  created_at,
  updated_at,
  sku,
  tagline,
  condition,
  defect_description,
  compare_at_price,
  sale_unit,
  delivery_mode,
  season_label,
  published_at
from public.products
where status = 'published';

-- Enregistrement atomique d'un produit, de ses paliers et caracteristiques --
-- Security invoker : les politiques RLS admin s'appliquent en plus du
-- controle explicite. p_expected_updated_at detecte une modification
-- concurrente (autre onglet) : erreur 40001 « conflit ».

create or replace function public.admin_save_product(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_product jsonb,
  p_tiers jsonb,
  p_attributes jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.products (
      category_id, name, slug, sku, tagline, short_description,
      long_description, base_price, compare_at_price, price_visibility,
      purchase_mode, status, featured, condition, defect_description,
      sale_unit, delivery_mode, season_label, stock_quantity,
      low_stock_threshold, stock_display_mode, stock_status_label,
      stock_custom_message, display_order, seo_title, seo_description
    )
    values (
      nullif(p_product->>'category_id', '')::uuid,
      p_product->>'name',
      p_product->>'slug',
      nullif(p_product->>'sku', ''),
      nullif(p_product->>'tagline', ''),
      nullif(p_product->>'short_description', ''),
      nullif(p_product->>'long_description', ''),
      (p_product->>'base_price')::numeric,
      nullif(p_product->>'compare_at_price', '')::numeric,
      (p_product->>'price_visibility')::public.price_visibility,
      (p_product->>'purchase_mode')::public.product_purchase_mode,
      (p_product->>'status')::public.product_status,
      coalesce((p_product->>'featured')::boolean, false),
      (p_product->>'condition')::public.product_condition,
      nullif(p_product->>'defect_description', ''),
      p_product->>'sale_unit',
      (p_product->>'delivery_mode')::public.product_delivery_mode,
      nullif(p_product->>'season_label', ''),
      (p_product->>'stock_quantity')::integer,
      nullif(p_product->>'low_stock_threshold', '')::integer,
      (p_product->>'stock_display_mode')::public.stock_display_mode,
      nullif(p_product->>'stock_status_label', '')::public.stock_status_label,
      nullif(p_product->>'stock_custom_message', ''),
      coalesce((p_product->>'display_order')::integer, 0),
      nullif(p_product->>'seo_title', ''),
      nullif(p_product->>'seo_description', '')
    )
    returning id into v_id;
  else
    update public.products set
      category_id = nullif(p_product->>'category_id', '')::uuid,
      name = p_product->>'name',
      slug = p_product->>'slug',
      sku = nullif(p_product->>'sku', ''),
      tagline = nullif(p_product->>'tagline', ''),
      short_description = nullif(p_product->>'short_description', ''),
      long_description = nullif(p_product->>'long_description', ''),
      base_price = (p_product->>'base_price')::numeric,
      compare_at_price = nullif(p_product->>'compare_at_price', '')::numeric,
      price_visibility = (p_product->>'price_visibility')::public.price_visibility,
      purchase_mode = (p_product->>'purchase_mode')::public.product_purchase_mode,
      status = (p_product->>'status')::public.product_status,
      featured = coalesce((p_product->>'featured')::boolean, false),
      condition = (p_product->>'condition')::public.product_condition,
      defect_description = nullif(p_product->>'defect_description', ''),
      sale_unit = p_product->>'sale_unit',
      delivery_mode = (p_product->>'delivery_mode')::public.product_delivery_mode,
      season_label = nullif(p_product->>'season_label', ''),
      stock_quantity = (p_product->>'stock_quantity')::integer,
      low_stock_threshold = nullif(p_product->>'low_stock_threshold', '')::integer,
      stock_display_mode = (p_product->>'stock_display_mode')::public.stock_display_mode,
      stock_status_label = nullif(p_product->>'stock_status_label', '')::public.stock_status_label,
      stock_custom_message = nullif(p_product->>'stock_custom_message', ''),
      display_order = coalesce((p_product->>'display_order')::integer, 0),
      seo_title = nullif(p_product->>'seo_title', ''),
      seo_description = nullif(p_product->>'seo_description', '')
    where id = p_id
      and (p_expected_updated_at is null or updated_at = p_expected_updated_at)
    returning id into v_id;

    if v_id is null then
      if exists (select 1 from public.products where id = p_id) then
        raise exception 'Le produit a ete modifie entre-temps'
          using errcode = '40001';
      end if;
      raise exception 'Produit introuvable' using errcode = 'P0002';
    end if;
  end if;

  delete from public.pricing_tiers where product_id = v_id;
  insert into public.pricing_tiers (product_id, min_quantity, max_quantity, unit_price)
  select
    v_id,
    (tier->>'min')::integer,
    nullif(tier->>'max', '')::integer,
    (tier->>'price')::numeric
  from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier;

  delete from public.product_attributes where product_id = v_id;
  insert into public.product_attributes (product_id, label, value, unit, position)
  select
    v_id,
    attribute->>'label',
    attribute->>'value',
    nullif(attribute->>'unit', ''),
    (ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_attributes, '[]'::jsonb))
    with ordinality as item(attribute, ordinality);

  return v_id;
end;
$$;

revoke all on function public.admin_save_product(uuid, timestamptz, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.admin_save_product(uuid, timestamptz, jsonb, jsonb, jsonb)
  to authenticated;
