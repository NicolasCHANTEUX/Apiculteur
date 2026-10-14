-- Demandes clients (ROADMAP lot 7, CAHIER section 12) : contact, devis
-- grande quantite, signalement d'essaim. Enregistrees par le serveur (role
-- service) apres validation ; lues et traitees par l'admin.

create sequence public.contact_request_number_seq;

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  -- Numero communique au visiteur (« DEM-000042 »).
  reference text not null unique
    default ('DEM-' || lpad(nextval('public.contact_request_number_seq')::text, 6, '0')),
  -- Cle generee par le formulaire : un double clic ou un renvoi ne cree
  -- jamais deux demandes.
  submission_key uuid not null unique,
  kind text not null check (kind in ('contact', 'quote', 'swarm')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'answered', 'closed')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 40),
  subject text not null check (char_length(subject) between 1 and 120),
  message text not null check (char_length(message) between 20 and 5000),
  -- Champs propres au type (quantite, periode, lieu, hauteur…).
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 4000),
  -- Produit d'ou vient la demande (fiche produit), nom fige a l'envoi.
  product_id uuid references public.products (id) on delete set null,
  product_name text check (char_length(product_name) <= 200),
  consent_at timestamptz not null,
  admin_note text check (char_length(admin_note) <= 4000),
  answered_at timestamptz,
  -- Corbeille : suppression douce, restaurable avec les photos.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_requests_inbox_idx on public.contact_requests (deleted_at, status, created_at desc);

create trigger set_updated_at
  before update on public.contact_requests
  for each row execute function public.set_updated_at();

create table public.contact_request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_requests (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^requests/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  width integer check (width > 0),
  height integer check (height > 0),
  byte_size integer check (byte_size > 0),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index contact_request_photos_request_idx on public.contact_request_photos (request_id, position);

-- Droits : aucun acces visiteur. L'admin lit tout, et ne modifie que le
-- suivi (statut, note, corbeille) : jamais le message du client. Les
-- insertions passent par le serveur (role service).
alter table public.contact_requests enable row level security;
alter table public.contact_request_photos enable row level security;
revoke all privileges on table public.contact_requests from public, anon, authenticated;
revoke all privileges on table public.contact_request_photos from public, anon, authenticated;
grant select, delete on table public.contact_requests to authenticated;
grant update (status, admin_note, answered_at, deleted_at) on table public.contact_requests to authenticated;
grant select on table public.contact_request_photos to authenticated;
revoke all on sequence public.contact_request_number_seq from public, anon, authenticated;

create policy "Admins can read contact requests"
  on public.contact_requests for select
  to authenticated
  using (public.is_admin());

create policy "Admins can follow up contact requests"
  on public.contact_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete trashed contact requests"
  on public.contact_requests for delete
  to authenticated
  using (public.is_admin() and deleted_at is not null);

create policy "Admins can read contact request photos"
  on public.contact_request_photos for select
  to authenticated
  using (public.is_admin());

-- Photos jointes : bucket PRIVE (lecture par l'admin via une route serveur
-- protegee), WebP reencodes par le serveur uniquement. Reaffirme prive meme
-- s'il existait deja.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 5242880, array['image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Emails lies a une demande (accuse de reception, reponses de l'apiculteur).
alter table public.email_outbox
  add column contact_request_id uuid references public.contact_requests (id) on delete set null;
create index email_outbox_contact_request_idx on public.email_outbox (contact_request_id, created_at);

comment on table public.contact_requests is
  'Demandes envoyees depuis le formulaire de contact (contact, devis, essaim). '
  'Insertion reservee au serveur (service role) ; suivi par l''admin.';
