-- Demandes d'avis par lien securise (ROADMAP lot 8, CAHIER section 13).
-- Une invitation par commande retiree ou livree, envoyee apres le delai
-- review_request_delay_days. Seule l'empreinte SHA-256 du jeton du lien est
-- conservee ; le depot passe par une fonction reservee au serveur.

create table public.review_invitations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  -- Date a partir de laquelle l'email peut partir.
  send_after timestamptz not null,
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  sent_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  review_id uuid references public.reviews (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index review_invitations_due_idx on public.review_invitations (send_after) where sent_at is null;

create trigger set_updated_at
  before update on public.review_invitations
  for each row execute function public.set_updated_at();

-- L'admin suit les invitations sans jamais lire l'empreinte du jeton ;
-- ecritures par le serveur (role service).
alter table public.review_invitations enable row level security;
revoke all privileges on table public.review_invitations from public, anon, authenticated;
grant select (id, order_id, send_after, sent_at, expires_at, used_at, review_id, created_at, updated_at)
  on table public.review_invitations to authenticated;

create policy "Admins can read review invitations"
  on public.review_invitations for select
  to authenticated
  using (public.is_admin());

-- Un seul avis par commande.
drop index if exists public.reviews_order_id_idx;
create unique index reviews_order_id_key on public.reviews (order_id);

-- Depot d'un avis avec le jeton du lien : verifie, enregistre (en attente
-- de moderation) et marque l'invitation utilisee, dans une transaction.
-- Le produit n'est retenu que si la commande n'en contient qu'un.
create function public.submit_review(
  p_token_hash text,
  p_rating integer,
  p_comment text,
  p_display_name text,
  p_consent boolean
)
returns table (review_id uuid, order_id uuid, order_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.review_invitations;
  v_product uuid;
  v_review uuid;
  v_number text;
begin
  select * into v_invitation
    from public.review_invitations i
   where i.token_hash = p_token_hash
   for update;
  if not found then
    raise exception 'Lien invalide' using errcode = 'P0002';
  end if;
  if v_invitation.used_at is not null then
    raise exception 'Avis deja depose' using errcode = '23505';
  end if;
  if v_invitation.expires_at is null or v_invitation.expires_at < now() then
    raise exception 'Lien expire' using errcode = '22023';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Note invalide' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 2 and 40
     or char_length(coalesce(p_comment, '')) > 2000 then
    raise exception 'Champs invalides' using errcode = '22023';
  end if;

  select case when count(distinct oi.product_id) = 1 then min(oi.product_id::text)::uuid end
    into v_product
    from public.order_items oi
   where oi.order_id = v_invitation.order_id;

  insert into public.reviews (order_id, product_id, customer_name, rating, comment, status, customer_consent, submitted_at)
  values (
    v_invitation.order_id, v_product, btrim(p_display_name), p_rating,
    nullif(btrim(coalesce(p_comment, '')), ''), 'pending', coalesce(p_consent, false), now()
  )
  returning id into v_review;

  update public.review_invitations
     set used_at = now(), review_id = v_review
   where id = v_invitation.id;

  select o.order_number into v_number from public.orders o where o.id = v_invitation.order_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (null, 'review.submitted', 'review', v_review,
          jsonb_build_object('order_number', v_number, 'rating', p_rating));

  return query select v_review, v_invitation.order_id, v_number;
end;
$$;

revoke all on function public.submit_review(text, integer, text, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_review(text, integer, text, text, boolean) to service_role;

comment on table public.review_invitations is
  'Demandes d''avis envoyees apres retrait ou livraison. Jeton du lien conserve '
  'sous forme d''empreinte SHA-256 uniquement ; ecriture reservee au serveur.';
