-- Informations legales versionnees et droits des clients (ROADMAP lot 9,
-- CAHIER sections 17.6 et 19).

-- Versions approuvees des informations legales ---------------------------
-- Le brouillon reste dans app_settings (cle legal_draft, admin seulement).
-- Chaque approbation fige une copie complete : les pages publiques
-- (mentions legales, CGV, confidentialite) affichent la derniere version.
create table public.legal_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  config jsonb not null
    check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 60000),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz not null default now()
);

-- Contenu public par nature ; l'auteur de l'approbation reste interne.
-- Versions jamais modifiees ni supprimees (historique).
alter table public.legal_versions enable row level security;
revoke all privileges on table public.legal_versions from public, anon, authenticated;
grant select (id, version, config, approved_at) on table public.legal_versions to anon;
grant select, insert on table public.legal_versions to authenticated;

create policy "Approved legal versions are public"
  on public.legal_versions for select
  to anon, authenticated
  using (true);

create policy "Admins approve legal versions"
  on public.legal_versions for insert
  to authenticated
  with check (public.is_admin() and approved_by = auth.uid());

-- Version des CGV acceptee avec une demande de commande.
alter table public.orders
  add column terms_version integer check (terms_version > 0);

-- Effacement d'un client (droit a l'effacement, CAHIER section 19) -------
-- Sans commande : fiche supprimee. Avec commandes : elles restent pour la
-- comptabilite, mais nom, coordonnees, adresse et messages sont effaces.
-- Dans les deux cas : demandes de contact et emails a son adresse
-- supprimes, nom des avis remplace. Renvoie les fichiers photo a retirer
-- du stockage.
create function public.admin_forget_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers;
  v_orders uuid[];
  v_requests uuid[];
  v_paths text[];
  v_mode text;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  select * into v_customer from public.customers c where c.id = p_customer_id for update;
  if not found then
    raise exception 'Client introuvable' using errcode = 'P0002';
  end if;
  if v_customer.email like 'anonyme-%@anonymise.invalid' then
    raise exception 'Client deja anonymise' using errcode = '55000';
  end if;

  select coalesce(array_agg(o.id), '{}') into v_orders from public.orders o where o.customer_id = p_customer_id;
  select coalesce(array_agg(r.id), '{}') into v_requests
    from public.contact_requests r where lower(r.email) = lower(v_customer.email);
  select coalesce(array_agg(p.storage_path), '{}') into v_paths
    from public.contact_request_photos p where p.request_id = any(v_requests);

  delete from public.email_outbox e
   where lower(e.to_email) = lower(v_customer.email)
      or e.order_id = any(v_orders)
      or e.contact_request_id = any(v_requests);
  delete from public.contact_requests r where r.id = any(v_requests);
  update public.reviews v set customer_name = 'Client vérifié' where v.order_id = any(v_orders);

  if cardinality(v_orders) = 0 then
    delete from public.customers c where c.id = p_customer_id;
    v_mode := 'deleted';
  else
    update public.orders o
       set contact_name = 'Client anonymisé', contact_email = null, contact_phone = null,
           company_name = null, professional_id = null,
           delivery_address_line1 = null, delivery_address_line2 = null, delivery_city = null,
           delivery_latitude = null, delivery_longitude = null,
           customer_message = null, admin_validation_note = null, admin_internal_note = null
     where o.id = any(v_orders);
    update public.customers c
       set email = 'anonyme-' || replace(c.id::text, '-', '') || '@anonymise.invalid',
           full_name = 'Client anonymisé', phone = null,
           address_line1 = null, address_line2 = null, postal_code = null, city = null,
           latitude = null, longitude = null, internal_note = null
     where c.id = p_customer_id;
    v_mode := 'anonymized';
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'customer.' || v_mode, 'customer', p_customer_id,
          jsonb_build_object('orders', cardinality(v_orders), 'requests', cardinality(v_requests)));

  return jsonb_build_object(
    'mode', v_mode,
    'photo_paths', to_jsonb(v_paths),
    'orders', cardinality(v_orders),
    'requests', cardinality(v_requests)
  );
end;
$$;

revoke all on function public.admin_forget_customer(uuid) from public, anon;
grant execute on function public.admin_forget_customer(uuid) to authenticated;

comment on table public.legal_versions is
  'Versions approuvees des informations legales (mentions, CGV, confidentialite). '
  'Lecture publique ; insertion par un admin ; jamais modifiees.';
