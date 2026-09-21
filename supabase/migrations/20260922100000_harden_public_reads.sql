-- Les policies RLS filtrent des lignes, pas des colonnes. Les anciennes
-- policies publiques permettaient donc de lire le stock reel d'un produit
-- publie et le token d'un avis affiche. Cette migration expose des vues
-- explicitement limitees aux donnees publiques.

drop policy if exists "Published products are publicly readable"
  on public.products;

-- Les visiteurs anonymes ne peuvent plus lire directement la table.
revoke all privileges on table public.products from anon;

-- Les policies des images et paliers doivent pouvoir verifier la publication
-- sans redonner un acces direct a products. La fonction ne retourne qu'un
-- booleen et fixe son search_path pour eviter le detournement d'objet SQL.
create or replace function public.is_published_product(product_uuid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.products
    where id = product_uuid
      and status = 'published'
  );
$$;

revoke all on function public.is_published_product(uuid) from public;
grant execute on function public.is_published_product(uuid)
  to anon, authenticated;

drop policy if exists "Images of published products are publicly readable"
  on public.product_images;
create policy "Images of published products are publicly readable"
  on public.product_images for select
  to anon, authenticated
  using (public.is_published_product(product_id));

drop policy if exists "Pricing tiers of published products are publicly readable"
  on public.pricing_tiers;
create policy "Pricing tiers of published products are publicly readable"
  on public.pricing_tiers for select
  to anon, authenticated
  using (public.is_published_product(product_id));

-- Vue security-definer volontaire : elle est possedee par le role de
-- migration, mais ne publie qu'une liste blanche de colonnes et applique son
-- propre filtre. security_barrier empeche le moteur de pousser un predicat
-- appelant sous le filtre de la vue.
create view public.public_catalog_products
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
  updated_at
from public.products
where status = 'published';

revoke all privileges on table public.public_catalog_products
  from public, anon, authenticated;
grant select on table public.public_catalog_products to anon, authenticated;

drop policy if exists "Displayed reviews are publicly readable"
  on public.reviews;
revoke all privileges on table public.reviews from anon;

create view public.public_reviews
with (security_barrier = true)
as
select
  id,
  product_id,
  customer_name,
  rating,
  comment,
  admin_reply,
  featured,
  submitted_at,
  created_at
from public.reviews
where status = 'displayed'
  and customer_consent = true;

revoke all privileges on table public.public_reviews
  from public, anon, authenticated;
grant select on table public.public_reviews to anon, authenticated;

comment on view public.public_catalog_products is
  'Projection publique du catalogue sans stock interne ni seuil de stock.';
comment on view public.public_reviews is
  'Avis affichables ayant recu le consentement client, sans token ni order_id.';
