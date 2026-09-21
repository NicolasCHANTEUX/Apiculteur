-- Donnees de demonstration pour le developpement local uniquement.
-- Appliquees automatiquement par `supabase db reset`.

insert into public.categories (name, slug, description, display_order) values
  ('Essaims', 'essaims', 'Essaims prets a demarrer une nouvelle colonie.', 1),
  ('Ruches', 'ruches', 'Ruches et ruchettes, neuves ou d''occasion.', 2),
  ('Matériel', 'materiel', 'Materiel apicole divers.', 3);

insert into public.products (
  category_id, name, slug, short_description, base_price,
  status, featured, stock_quantity, stock_display_mode, stock_status_label
)
select
  c.id, 'Essaim sur 5 cadres', 'essaim-5-cadres',
  'Essaim d''abeilles noires sur 5 cadres, reine de l''annee.',
  180.00, 'published', true, 12, 'status_label', 'reservation_open'
from public.categories c where c.slug = 'essaims';

insert into public.pricing_tiers (product_id, min_quantity, max_quantity, unit_price)
select p.id, 1, 4, 180.00 from public.products p where p.slug = 'essaim-5-cadres'
union all
select p.id, 5, 9, 165.00 from public.products p where p.slug = 'essaim-5-cadres'
union all
select p.id, 10, null, 150.00 from public.products p where p.slug = 'essaim-5-cadres';
