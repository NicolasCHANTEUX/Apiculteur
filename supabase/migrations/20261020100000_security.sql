-- Corrections de sécurité du 15 octobre 2026 (revue de sécurité) :
-- 1. Demande de commande enregistrée d'un seul tenant : CGV acceptées,
--    frais, distance et zone de livraison dans la même transaction que la
--    commande (auparavant, une seconde écriture pouvait échouer sans bloquer
--    la confirmation).
-- 2. Administration réservée aux sessions à double authentification (aal2) :
--    un mot de passe seul ne donne plus aucun droit, ni dans l'application
--    ni en interrogeant l'API directement.

-- 1. Demande de commande -------------------------------------------------------
-- Même fonction qu'au lot 4, complétée : terms_version (version des CGV
-- publiée, vérifiée), delivery_fee, delivery_distance_km, delivery_zone_id,
-- delivery_latitude, delivery_longitude. Le total est calculé ici.
create or replace function public.submit_order_request(p_request jsonb)
returns table (order_id uuid, order_number text, already_submitted boolean)
language plpgsql
set search_path = public
as $$
declare
  v_key uuid := (p_request->>'submission_key')::uuid;
  v_email text := lower(trim(p_request->>'email'));
  v_method public.delivery_method := (p_request->>'delivery_method')::public.delivery_method;
  v_terms integer := nullif(p_request->>'terms_version', '')::integer;
  v_fee numeric := 0;
  v_subtotal numeric := (p_request->>'subtotal')::numeric;
  v_customer uuid;
  v_order public.orders;
begin
  if v_key is null then
    raise exception 'Cle d''envoi manquante' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_request->'items', '[]'::jsonb)) = 0 then
    raise exception 'Demande sans produit' using errcode = '22023';
  end if;

  select * into v_order from public.orders o where o.submission_key = v_key;
  if found then
    return query select v_order.id, v_order.order_number, true;
    return;
  end if;

  -- CGV : seule une version publiée peut être acceptée.
  if v_terms is not null and not exists (select 1 from public.legal_versions l where l.version = v_terms) then
    raise exception 'Version des CGV inconnue' using errcode = '22023';
  end if;
  if v_method = 'delivery' then
    v_fee := round(coalesce(nullif(p_request->>'delivery_fee', '')::numeric, 0), 2);
    if v_fee not between 0 and 99999.99 then
      raise exception 'Frais de livraison invalides' using errcode = '22023';
    end if;
  end if;

  -- Fiche client : creee au premier envoi, completee ensuite (jamais
  -- ecrasee) ; les coordonnees de chaque demande restent dans la commande.
  insert into public.customers as c (email, full_name, phone, address_line1, postal_code, city)
  values (
    v_email,
    p_request->>'name',
    nullif(p_request->>'phone', ''),
    nullif(p_request->>'address_line1', ''),
    nullif(p_request->>'postal_code', ''),
    nullif(p_request->>'city', '')
  )
  on conflict ((lower(email))) do update set
    phone = coalesce(c.phone, excluded.phone),
    address_line1 = coalesce(c.address_line1, excluded.address_line1),
    postal_code = coalesce(c.postal_code, excluded.postal_code),
    city = coalesce(c.city, excluded.city)
  returning c.id into v_customer;

  begin
    insert into public.orders (
      submission_key, customer_id, delivery_method,
      delivery_address_line1, delivery_postal_code, delivery_city, delivery_country,
      requested_date, customer_message, subtotal, delivery_fee, total_amount,
      fulfillment_status, validation_status,
      contact_name, contact_email, contact_phone, company_name, professional_id,
      review_reasons, terms_version,
      delivery_distance_km, delivery_zone_id, delivery_latitude, delivery_longitude
    )
    values (
      v_key,
      v_customer,
      v_method,
      nullif(p_request->>'address_line1', ''),
      nullif(p_request->>'postal_code', ''),
      nullif(p_request->>'city', ''),
      'FR',
      nullif(p_request->>'requested_date', '')::date,
      nullif(p_request->>'message', ''),
      v_subtotal,
      v_fee,
      v_subtotal + v_fee,
      'pending',
      'pending',
      p_request->>'name',
      v_email,
      nullif(p_request->>'phone', ''),
      nullif(p_request->>'company_name', ''),
      nullif(p_request->>'professional_id', ''),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(p_request->'review_reasons', '[]'::jsonb))),
        '{}'
      ),
      v_terms,
      case when v_method = 'delivery' then nullif(p_request->>'delivery_distance_km', '')::numeric end,
      case when v_method = 'delivery' then nullif(p_request->>'delivery_zone_id', '')::uuid end,
      case when v_method = 'delivery' then nullif(p_request->>'delivery_latitude', '')::double precision end,
      case when v_method = 'delivery' then nullif(p_request->>'delivery_longitude', '')::double precision end
    )
    returning * into v_order;
  exception when unique_violation then
    -- Envoi concurrent avec la meme cle : on renvoie la demande gagnante.
    select * into v_order from public.orders o where o.submission_key = v_key;
    return query select v_order.id, v_order.order_number, true;
    return;
  end;

  insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
  select
    v_order.id,
    (item->>'product_id')::uuid,
    item->>'name',
    (item->>'unit_price')::numeric,
    (item->>'quantity')::integer,
    (item->>'line_total')::numeric
  from jsonb_array_elements(p_request->'items') as item;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    null, 'order.submitted', 'order', v_order.id,
    jsonb_build_object('order_number', v_order.order_number, 'total', v_order.total_amount)
  );

  return query select v_order.id, v_order.order_number, false;
end;
$$;

-- 2. Double authentification des administrateurs -----------------------------
-- Le niveau d'authentification (aal) est porté par le jeton signé par
-- Supabase Auth : aal2 après la saisie d'un code à usage unique (TOTP).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users where id = auth.uid())
     and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

-- État d'accès d'un compte connecté, pour orienter l'application : 'admin'
-- (double authentification faite), 'mfa' (compte administrateur, code à
-- saisir ou à configurer), 'none'. Ne donne aucun droit.
create or replace function public.admin_access_state()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not exists (select 1 from public.admin_users where id = auth.uid()) then 'none'
    when coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2' then 'admin'
    else 'mfa'
  end;
$$;

revoke all on function public.admin_access_state() from public, anon;
grant execute on function public.admin_access_state() to authenticated;
