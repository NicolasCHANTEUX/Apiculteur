-- Avis clients maison (Readme.md section 13). Lien securise par token
-- envoye par email apres commande ; pas de compte client necessaire.

create type public.review_status as enum (
  'pending', 'displayed', 'hidden', 'refused'
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  status public.review_status not null default 'pending',
  admin_reply text,
  featured boolean not null default false,
  -- Consentement explicite du client pour affichage public (section 13
  -- et RGPD, section 23).
  customer_consent boolean not null default false,
  access_token uuid not null default gen_random_uuid(),
  token_expires_at timestamptz not null default (now() + interval '30 days'),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index reviews_access_token_key on public.reviews (access_token);
create index reviews_order_id_idx on public.reviews (order_id);
create index reviews_product_id_idx on public.reviews (product_id);
create index reviews_status_idx on public.reviews (status);

comment on column public.reviews.access_token is
  'Token du lien securise envoye par email. La lecture/ecriture via ce '
  'token passe par une Route Handler dediee cote serveur (service role), '
  'pas par une policy RLS (evite d''exposer access_token via l''API '
  'publique en le rendant lisible/filtrable par n''importe qui).';

alter table public.reviews enable row level security;

create policy "Displayed reviews are publicly readable"
  on public.reviews for select
  to anon, authenticated
  using (status = 'displayed');

create policy "Admins have full access to reviews"
  on public.reviews for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
