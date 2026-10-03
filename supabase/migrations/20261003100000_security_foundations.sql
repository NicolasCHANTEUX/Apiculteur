-- Socle de securite (ROADMAP lot 0) : limitation de debit persistante et
-- journal d'audit des actions administrateur.
-- Cf. CAHIER_DES_CHARGES.md sections 17.12 et 20.

-- Limitation de debit -----------------------------------------------------
-- La cle est une empreinte HMAC calculee cote serveur (jamais l'IP ou
-- l'email en clair). Table et fonction reservees au role service : ni
-- anon ni authenticated ne peuvent les lire ou consommer un quota.

create table public.rate_limits (
  key text primary key check (char_length(key) = 64),
  count integer not null check (count > 0),
  reset_at timestamptz not null
);

create index rate_limits_reset_at_idx on public.rate_limits (reset_at);

alter table public.rate_limits enable row level security;
revoke all privileges on table public.rate_limits
  from public, anon, authenticated;

-- Consomme une unite du quota. Renvoie false si la limite est atteinte pour
-- la fenetre en cours. Atomique : l'upsert verrouille la ligne concernee.
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Parametres de limitation invalides';
  end if;

  insert into public.rate_limits as rl (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when rl.reset_at <= now() then 1 else rl.count + 1 end,
    reset_at = case
      when rl.reset_at <= now() then excluded.reset_at
      else rl.reset_at
    end
  where rl.reset_at <= now() or rl.count < p_limit
  returning count into accepted;

  -- Menage opportuniste des fenetres expirees depuis plus d'un jour.
  delete from public.rate_limits
  where reset_at < now() - interval '1 day';

  return accepted is not null;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

-- Journal d'audit -----------------------------------------------------------
-- Ecrit uniquement par le serveur (role service) ; lisible par les admins.
-- Sert aussi d'historique des commandes (CAHIER section 17.4).

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 50),
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
revoke all privileges on table public.audit_logs from public, anon;
revoke insert, update, delete on table public.audit_logs from authenticated;

create policy "Admins can read the audit log"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

comment on table public.audit_logs is
  'Journal des actions admin et des evenements de commande. Insertion '
  'reservee au serveur (service role) ; aucune modification ni suppression.';
