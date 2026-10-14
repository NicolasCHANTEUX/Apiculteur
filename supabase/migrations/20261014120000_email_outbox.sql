-- File d'envoi des emails (ROADMAP lot 6, hypothese H7 ; CAHIER section 14).
-- Chaque email est enregistre avant d'etre envoye : rien ne se perd si le
-- fournisseur est absent ou en panne, et l'admin voit le journal complet.
-- Sans fournisseur configure, les emails restent « a envoyer » et l'admin
-- peut les envoyer depuis sa messagerie.

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  -- Modele (« order_received », « order_accepted »…) et cle d'unicite :
  -- le meme email d'une meme etape n'est jamais mis deux fois en file.
  template text not null check (char_length(template) between 1 and 60),
  dedupe_key text unique check (char_length(dedupe_key) <= 200),
  to_email text not null check (char_length(to_email) between 3 and 254),
  to_name text check (char_length(to_name) <= 120),
  reply_to text check (char_length(reply_to) <= 254),
  subject text not null check (char_length(subject) between 1 and 200),
  html text not null,
  text_body text not null,
  order_id uuid references public.orders (id) on delete set null,
  -- pending : en attente (ou « a envoyer » sans fournisseur) ; skipped :
  -- ecarte par l'apiculteur (deja prevenu par telephone, par exemple).
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (char_length(last_error) <= 500),
  provider text check (char_length(provider) <= 40),
  provider_message_id text check (char_length(provider_message_id) <= 200),
  -- Envoye a la main depuis la messagerie de l'apiculteur.
  sent_manually boolean not null default false,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index email_outbox_status_idx on public.email_outbox (status, created_at desc);
create index email_outbox_order_id_idx on public.email_outbox (order_id, created_at);

create trigger set_updated_at
  before update on public.email_outbox
  for each row execute function public.set_updated_at();

-- Lecture par les admins ; ecritures uniquement par le serveur (role
-- service), apres verification des droits dans l'action.
alter table public.email_outbox enable row level security;
revoke all privileges on table public.email_outbox from public, anon;
revoke insert, update, delete on table public.email_outbox from authenticated;

create policy "Admins can read the email outbox"
  on public.email_outbox for select
  to authenticated
  using (public.is_admin());

-- Prise en charge atomique d'un envoi : un email n'est jamais envoye deux
-- fois en parallele. Un envoi bloque (processus interrompu) est repris au
-- bout de 10 minutes.
create function public.claim_outbox_email(p_id uuid)
returns setof public.email_outbox
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox
     set status = 'sending', attempts = attempts + 1
   where id = p_id
     and (status in ('pending', 'failed')
          or (status = 'sending' and updated_at < now() - interval '10 minutes'))
  returning *;
$$;

revoke all on function public.claim_outbox_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_outbox_email(uuid) to service_role;

comment on table public.email_outbox is
  'File et journal des emails envoyes aux clients et a l''apiculteur. '
  'Ecriture reservee au serveur (service role).';
