-- La quantite publique est calculee dans la table afin que la vue invoker
-- n'ait jamais besoin de lire stock_quantity (stock interne).
alter table public.products
  add column public_stock_quantity integer generated always as (
    case when stock_display_mode = 'exact' then stock_quantity else null end
  ) stored;

-- La vue conserve ses colonnes et son filtre. Seule la source de la quantite
-- affichee change ; la RLS et les privileges de l'appelant s'appliquent.
create or replace view public.public_catalog_products
with (security_barrier = true, security_invoker = true)
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
  public_stock_quantity as displayed_stock_quantity,
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

-- Les visiteurs n'ont acces qu'aux colonnes effectivement publiques.
-- L'acces admin (role authenticated + RLS is_admin) garde le stock interne.
revoke all privileges on table public.products from public, anon;
grant select (
  id, category_id, name, slug, short_description, long_description,
  base_price, price_visibility, purchase_mode, status, featured,
  stock_display_mode, stock_status_label, stock_custom_message,
  public_stock_quantity, display_order, seo_title, seo_description,
  created_at, updated_at, sku, tagline, condition, defect_description,
  compare_at_price, sale_unit, delivery_mode, season_label, published_at
) on table public.products to anon;

drop policy if exists "Published products are publicly readable"
  on public.products;
create policy "Published products are readable by visitors"
  on public.products for select
  to anon
  using (status = 'published');
