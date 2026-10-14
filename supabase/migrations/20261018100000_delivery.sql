-- Livraison et distance (ROADMAP lot 10, CAHIER sections 8.2 et 9).
-- Zones administrables ; distance a vol d'oiseau depuis l'exploitation
-- (hypothese H5, Base Adresse Nationale) ; frais estimes, confirmes par
-- l'apiculteur a l'acceptation (H2, H4).

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  -- Une zone ne s'active qu'avec un tarif strictement positif (section 9).
  active boolean not null default false,
  countries text[] not null default '{FR}'
    check (cardinality(countries) between 1 and 20),
  -- Prefixes de code postal inclus (vide : tout le pays) et exclus.
  include_prefixes text[] not null default '{}',
  exclude_prefixes text[] not null default '{}',
  fee numeric(10, 2) not null default 0 check (fee >= 0),
  -- Supplement par unite au-dela de la premiere (0 : forfait).
  extra_unit_fee numeric(10, 2) not null default 0 check (extra_unit_fee >= 0),
  -- Distance maximale depuis l'exploitation (vide : sans limite).
  max_distance_km integer check (max_distance_km > 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_zone_active_needs_fee check (not active or fee > 0)
);

create trigger set_updated_at
  before update on public.delivery_zones
  for each row execute function public.set_updated_at();

-- Zones actives lisibles par tous (tarifs affiches sur le site) ; gestion
-- par l'admin.
alter table public.delivery_zones enable row level security;
revoke all privileges on table public.delivery_zones from public, anon;
grant select on table public.delivery_zones to anon;
grant select, insert, update, delete on table public.delivery_zones to authenticated;

create policy "Active delivery zones are public"
  on public.delivery_zones for select
  to anon, authenticated
  using (active);

create policy "Admins manage delivery zones"
  on public.delivery_zones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Zone de depart (section 9) : France metropolitaine, desactivee, sans
-- tarif ; Corse et outre-mer exclus (sur devis).
insert into public.delivery_zones (name, countries, exclude_prefixes, display_order)
values ('France métropolitaine', '{FR}', '{20,97,98}', 0);

-- Distance et zone retenues pour une demande de livraison.
alter table public.orders
  add column delivery_distance_km numeric(7, 1) check (delivery_distance_km >= 0),
  add column delivery_zone_id uuid references public.delivery_zones (id) on delete set null;

-- Reglages du retrait et de la livraison (adresse de depart : cle
-- delivery_origin_address existante).
insert into public.app_settings (key, value, description) values
  ('delivery_settings',
   '{"pickupMode": "after_acceptance", "pickupInstructions": "", "transportNote": ""}',
   'Retrait (adresse publique, communiquee a l''acceptation ou sur demande), instructions, conditions de transport des essaims.')
on conflict (key) do nothing;

comment on table public.delivery_zones is
  'Zones de livraison : pays, prefixes postaux, tarif TTC, distance maximale. '
  'Active seulement avec un tarif strictement positif.';
