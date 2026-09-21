-- Catalogue : categories, produits, images, paliers de prix degressifs.
-- Cf. Readme.md sections 3, 4 et 5.

create type public.product_status as enum (
  'draft',      -- brouillon, jamais visible publiquement
  'published',  -- visible et commandable (selon purchase_mode)
  'hidden',     -- "temporairement masque" (section 3)
  'sold_out'    -- epuise
);

create type public.product_purchase_mode as enum (
  'standard',     -- ajout au panier classique
  'reservation',  -- disponible uniquement sur reservation
  'quote'         -- disponible uniquement sur devis
);

create type public.price_visibility as enum (
  'visible',    -- prix affiche normalement
  'hidden',     -- prix masque
  'on_request'  -- "prix sur demande"
);

create type public.stock_display_mode as enum (
  'hidden',         -- aucune info de stock affichee
  'exact',          -- quantite exacte affichee
  'status_label',   -- libelle parmi stock_status_label
  'custom_message'  -- message libre (stock_custom_message)
);

create type public.stock_status_label as enum (
  'available',
  'reservation_open',
  'limited',
  'coming_soon',
  'sold_out'
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  long_description text,
  base_price numeric(10, 2) not null check (base_price >= 0),
  price_visibility public.price_visibility not null default 'visible',
  purchase_mode public.product_purchase_mode not null default 'standard',
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  -- Stock reel, toujours suivi cote admin independamment de ce qui est
  -- affiche publiquement (section 6 : "stocker le stock reel cote admin").
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  stock_display_mode public.stock_display_mode not null default 'status_label',
  stock_status_label public.stock_status_label,
  stock_custom_message text,
  display_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_status_label_requires_mode check (
    stock_display_mode <> 'status_label' or stock_status_label is not null
  ),
  constraint stock_custom_message_requires_mode check (
    stock_display_mode <> 'custom_message' or stock_custom_message is not null
  )
);

create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create trigger set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt_text text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);

-- Prix degressifs par palier (section 5). La contrainte d'exclusion
-- empeche deux paliers de se chevaucher pour un meme produit (ex: [1,4]
-- et [3,9] seraient ambigus a l'affichage).
create table public.pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  min_quantity integer not null check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  quantity_range int4range generated always as (
    int4range(min_quantity, max_quantity, '[]')
  ) stored,
  exclude using gist (product_id with =, quantity_range with &&)
);

create index pricing_tiers_product_id_idx on public.pricing_tiers (product_id);

comment on table public.pricing_tiers is
  'Paliers de prix degressifs par produit. min/max_quantity inclusifs ; '
  'max_quantity NULL = pas de limite haute (ex: "a partir de 50 unites").';

-- RLS -------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.pricing_tiers enable row level security;

create policy "Active categories are publicly readable"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

create policy "Admins have full access to categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Published products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (status = 'published');

create policy "Admins have full access to products"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Images of published products are publicly readable"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.status = 'published'
    )
  );

create policy "Admins have full access to product images"
  on public.product_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Pricing tiers of published products are publicly readable"
  on public.pricing_tiers for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = pricing_tiers.product_id
        and p.status = 'published'
    )
  );

create policy "Admins have full access to pricing tiers"
  on public.pricing_tiers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
