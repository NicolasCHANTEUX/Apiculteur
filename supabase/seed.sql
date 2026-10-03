-- Donnees de demonstration pour le developpement local uniquement.
-- Appliquees automatiquement par `supabase db reset`.
-- Reprend le contenu d'exemple de la maquette Figma (cf. src/data/demo.ts) :
-- les avis ci-dessous sont fictifs et ne doivent jamais aller en production.

insert into public.categories (name, slug, description, display_order) values
  ('Essaims', 'essaims', 'Essaims prets a demarrer une nouvelle colonie.', 1),
  ('Reines', 'reines', 'Reines fecondees, testees et marquees.', 2),
  ('Ruches', 'ruches', 'Ruches et ruchettes, neuves ou d''occasion.', 3),
  ('Matériel', 'materiel', 'Materiel apicole divers.', 4);

insert into public.products (
  category_id, name, slug, short_description, long_description, base_price,
  purchase_mode, status, featured, stock_quantity, stock_display_mode,
  stock_status_label, stock_custom_message, display_order,
  sku, tagline, sale_unit, delivery_mode, season_label, low_stock_threshold
)
select
  c.id, v.name, v.slug, v.short_description, v.long_description, v.base_price,
  v.purchase_mode::public.product_purchase_mode, 'published', v.featured,
  v.stock_quantity, v.stock_display_mode::public.stock_display_mode,
  v.stock_status_label::public.stock_status_label, v.stock_custom_message,
  v.display_order, v.sku, v.tagline, v.sale_unit,
  v.delivery_mode::public.product_delivery_mode, v.season_label, 3
from (values
  ('essaims', 'Essaim Buckfast sur 5 cadres', 'essaim-buckfast-5-cadres',
   'Essaim polyvalent, doux et productif. Idéal pour les apiculteurs de tous niveaux.',
   E'Essaim sur 5 cadres avec reine Buckfast de l''année, fécondée et testée.\n\nLa Buckfast est appréciée pour sa douceur, sa faible tendance à l''essaimage et sa bonne production. Un excellent choix pour démarrer ou renforcer un rucher.',
   160.00, 'standard', true, 25, 'status_label', 'available', null, 1,
   'ESS-BUCK-5', 'Buckfast · Reine fécondée et testée', 'essaim', 'pickup_only', 'Avril – juin'),
  ('essaims', 'Essaim Carnica', 'essaim-carnica',
   'Race alpine réputée pour son hivernage économique et sa douceur naturelle.',
   E'Essaim sur 5 cadres avec reine Carnica.\n\nAbeille calme, économe en hiver et rapide au démarrage du printemps.',
   165.00, 'standard', false, 4, 'status_label', 'limited', null, 2,
   'ESS-CARN-5', 'Carnica · Hivernage économique', 'essaim', 'pickup_only', 'Avril – juin'),
  ('essaims', 'Essaim local Normandie', 'essaim-local-normandie',
   'Abeilles locales adaptées au climat et à la flore de Normandie.',
   E'Essaim issu de souches locales, sélectionnées pour leur adaptation au climat normand.\n\nDisponible uniquement sur réservation pour la saison prochaine.',
   140.00, 'reservation', false, 0, 'custom_message', null,
   'Réservations ouvertes — saison 2027', 3,
   'ESS-LOCAL-5', 'Locale / Hybride · Adaptation locale', 'essaim', 'pickup_only', 'Saison 2027'),
  ('reines', 'Reine fécondée Buckfast', 'reine-fecondee-buckfast',
   'Reine fécondée en plein air, testée et marquée, livrée en cagette.',
   E'Reine Buckfast fécondée en plein air, testée et marquée de l''année.\n\nLivrée en cagette avec ses accompagnatrices.',
   38.00, 'standard', false, 30, 'custom_message', null, 'Sur demande', 4,
   'REINE-BUCK', 'Buckfast · Fécondée en plein air', 'reine', 'deliverable', 'Mai – août')
) as v (
  category_slug, name, slug, short_description, long_description, base_price,
  purchase_mode, featured, stock_quantity, stock_display_mode,
  stock_status_label, stock_custom_message, display_order,
  sku, tagline, sale_unit, delivery_mode, season_label
)
join public.categories c on c.slug = v.category_slug;

-- Photos servies depuis public/images (photos d'exemple de la maquette).
insert into public.product_images (product_id, url, alt_text, display_order)
select p.id, v.url, v.alt_text, 0
from (values
  ('essaim-buckfast-5-cadres', '/images/essaims/buckfast-5-cadres.jpg',
   'Apiculteur portant un cadre de ruche dans une prairie'),
  ('essaim-carnica', '/images/essaims/carnica.jpg',
   'Apiculteur en tenue inspectant une ruchette avec un enfumoir'),
  ('essaim-local-normandie', '/images/essaims/local-normandie.jpg',
   'Abeilles à l''entrée d''une ruche en bois'),
  ('reine-fecondee-buckfast', '/images/essaims/reine-buckfast.jpg',
   'Rayon de cire operculé')
) as v (slug, url, alt_text)
join public.products p on p.slug = v.slug;

insert into public.product_attributes (product_id, label, value, unit, position)
select p.id, v.label, v.value, v.unit, v.position
from (values
  ('essaim-buckfast-5-cadres', 'Race', 'Buckfast', null, 0),
  ('essaim-buckfast-5-cadres', 'Cadres', '5', 'cadres Dadant', 1),
  ('essaim-buckfast-5-cadres', 'Reine', 'De l''année, fécondée et testée', null, 2),
  ('essaim-carnica', 'Race', 'Carnica', null, 0),
  ('essaim-carnica', 'Cadres', '5', 'cadres Dadant', 1),
  ('essaim-local-normandie', 'Race', 'Locale / hybride', null, 0),
  ('essaim-local-normandie', 'Cadres', '5', 'cadres Dadant', 1),
  ('reine-fecondee-buckfast', 'Race', 'Buckfast', null, 0),
  ('reine-fecondee-buckfast', 'Marquage', 'Marquée de la couleur de l''année', null, 1),
  ('reine-fecondee-buckfast', 'Conditionnement', 'Cagette avec accompagnatrices', null, 2)
) as v (slug, label, value, unit, position)
join public.products p on p.slug = v.slug;

insert into public.pricing_tiers (product_id, min_quantity, max_quantity, unit_price)
select p.id, v.min_quantity, v.max_quantity, v.unit_price
from (values
  ('essaim-buckfast-5-cadres', 1, 4, 160.00),
  ('essaim-buckfast-5-cadres', 5, 9, 150.00),
  ('essaim-buckfast-5-cadres', 10, null, 145.00),
  ('essaim-carnica', 1, 4, 165.00),
  ('essaim-carnica', 5, null, 148.00),
  ('essaim-local-normandie', 1, 4, 140.00),
  ('essaim-local-normandie', 5, null, 130.00),
  ('reine-fecondee-buckfast', 1, 9, 38.00),
  ('reine-fecondee-buckfast', 10, null, 35.00)
) as v (slug, min_quantity, max_quantity, unit_price)
join public.products p on p.slug = v.slug;

-- Avis fictifs : chaque avis est rattache a une commande (retrait sur
-- exploitation, livree et payee), comme le seront les vrais avis.
create temporary table seed_reviews (
  email text, customer_name text, product_slug text, quantity integer,
  rating smallint, comment text, admin_reply text, featured boolean,
  submitted_at timestamptz
);

insert into seed_reviews values
  ('claire.demo@example.com', 'Claire M.', 'essaim-buckfast-5-cadres', 3, 5,
   'Des essaims de très belle qualité, reçus en parfait état. Marc a pris le temps de répondre à toutes mes questions avant la livraison. Je recommande vivement !',
   'Merci Claire ! Ce fut un plaisir de vous accompagner. N''hésitez pas si vous avez des questions pendant la saison.',
   true, '2026-06-14 09:00:00+00'),
  ('julien.demo@example.com', 'Julien M.', 'essaim-carnica', 1, 5,
   'C''est la deuxième fois que je commande chez Marc. Sérieux, disponible, et ses abeilles sont vraiment douces. Un vrai professionnel passionné.',
   null, true, '2026-05-20 09:00:00+00'),
  ('elodie.demo@example.com', 'Élodie L.', 'essaim-local-normandie', 2, 4,
   'Très bon contact, livraison bien organisée malgré la distance. Les essaims se sont très bien développés. Quelques questions après réception, Marc a répondu rapidement.',
   'Merci pour ce retour Élodie ! Ravi que tout se soit bien passé malgré la distance.',
   true, '2026-04-18 09:00:00+00'),
  ('thomas.demo@example.com', 'Thomas B.', 'essaim-buckfast-5-cadres', 5, 5,
   'Première expérience en apiculture, Marc a su me rassurer et me guider. Les essaims sont repartis très fort. Déjà 3 hausses sur 5 ruches.',
   null, false, '2025-06-22 09:00:00+00'),
  ('amandine.demo@example.com', 'Amandine P.', 'reine-fecondee-buckfast', 10, 5,
   'Commande de 10 reines, toutes parfaites. Livraison soignée, reines bien accompagnées. Marc a même joint une petite note de conseils. Très professionnel.',
   null, false, '2025-05-15 09:00:00+00'),
  ('pierre-henri.demo@example.com', 'Pierre-Henri D.', 'essaim-carnica', 2, 4,
   'Bon essaim, bien développé à la réception. Le contact avec Marc est agréable. Un tout petit bémol sur le délai de livraison légèrement plus long que prévu mais Marc avait prévenu.',
   null, false, '2025-04-10 09:00:00+00');

insert into public.customers (email, full_name)
select email, customer_name from seed_reviews;

insert into public.orders (
  customer_id, delivery_method, subtotal, total_amount,
  fulfillment_status, payment_status, created_at
)
select c.id, 'pickup', t.unit_price * s.quantity, t.unit_price * s.quantity,
  'delivered', 'paid', s.submitted_at - interval '30 days'
from seed_reviews s
join public.customers c on c.email = s.email
join public.products p on p.slug = s.product_slug
join public.pricing_tiers t on t.product_id = p.id
  and s.quantity >= t.min_quantity
  and (t.max_quantity is null or s.quantity <= t.max_quantity);

insert into public.order_items (
  order_id, product_id, product_name_snapshot, unit_price, quantity, line_total
)
select o.id, p.id, p.name, o.subtotal / s.quantity, s.quantity, o.subtotal
from seed_reviews s
join public.customers c on c.email = s.email
join public.orders o on o.customer_id = c.id
join public.products p on p.slug = s.product_slug;

insert into public.reviews (
  order_id, product_id, customer_name, rating, comment, status, admin_reply,
  featured, customer_consent, submitted_at
)
select o.id, p.id, s.customer_name, s.rating, s.comment, 'displayed',
  s.admin_reply, s.featured, true, s.submitted_at
from seed_reviews s
join public.customers c on c.email = s.email
join public.orders o on o.customer_id = c.id
join public.products p on p.slug = s.product_slug;

drop table seed_reviews;
