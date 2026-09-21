-- Clients, commandes, lignes de commande.
-- Cf. Readme.md sections 7, 8, 9, 10, 12, 17.
--
-- Choix d'architecture : en v1 les clients n'ont pas de compte (section 18),
-- donc aucune policy RLS publique n'est definie ici pour anon/authenticated
-- sur customers/orders/order_items. La creation d'une commande depuis le
-- site public passe par une Server Action Next.js qui utilise la service
-- role key (contourne RLS), ce qui permet d'executer la logique metier
-- (paliers de prix, seuil de validation manuelle, etc.) en code de
-- confiance plutot que dans des policies SQL. Les admins accedent via
-- is_admin() avec leur session Supabase Auth normale.

create type public.delivery_method as enum ('delivery', 'pickup');

create type public.order_fulfillment_status as enum (
  'pending',    -- recue, pas encore traitee
  'preparing',  -- a preparer
  'ready',      -- prete
  'shipped',    -- expediee
  'delivered',  -- livree
  'cancelled'   -- annulee
);

create type public.order_validation_status as enum (
  'not_required', -- pas de validation manuelle necessaire
  'pending',      -- en attente de decision admin (grosse commande)
  'accepted',
  'refused'
);

create type public.payment_status as enum (
  'unpaid', 'pending', 'paid', 'refunded', 'cancelled'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'FR',
  latitude double precision,
  longitude double precision,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un email = un client : permet de rattacher automatiquement les
-- commandes suivantes au meme client (historique, section 17) sans
-- compte utilisateur.
create unique index customers_email_key on public.customers (lower(email));

create trigger set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('CMD-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.customers (id) on delete restrict,

  delivery_method public.delivery_method not null default 'delivery',
  -- Adresse de livraison "snapshot" au moment de la commande : ne doit
  -- pas bouger si le client (ou son adresse) est modifie plus tard.
  delivery_address_line1 text,
  delivery_address_line2 text,
  delivery_postal_code text,
  delivery_city text,
  delivery_country text default 'FR',
  delivery_latitude double precision,
  delivery_longitude double precision,
  distance_km numeric(6, 1),
  requested_date date,

  customer_message text,

  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),

  fulfillment_status public.order_fulfillment_status not null default 'pending',
  validation_status public.order_validation_status not null default 'not_required',
  admin_validation_note text,
  admin_internal_note text,

  payment_status public.payment_status not null default 'unpaid',
  payment_method text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint delivery_address_required_when_delivery check (
    delivery_method <> 'delivery' or delivery_postal_code is not null
  )
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_fulfillment_status_idx on public.orders (fulfillment_status);
create index orders_validation_status_idx on public.orders (validation_status);

create trigger set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- on delete restrict : un produit vendu ne doit pas pouvoir etre
  -- supprime et casser l'historique de commandes/factures. L'admin doit
  -- "masquer" un produit (section 3) plutot que le supprimer.
  product_id uuid not null references public.products (id) on delete restrict,
  product_name_snapshot text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- RLS ---------------------------------------------------------------------
-- Voir le commentaire en tete de fichier : pas de policy anon/authenticated
-- ici, seulement acces admin. Les ecritures publiques passent par la
-- service role key cote serveur.

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Admins have full access to customers"
  on public.customers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins have full access to orders"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins have full access to order items"
  on public.order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
