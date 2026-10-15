-- Revue de sécurité (suite) : une demande de commande n'est enregistrée
-- qu'avec l'acceptation des CGV en vigueur, dès qu'une version est publiée.
-- L'application bloque déjà l'envoi quand elle ne peut pas lire les CGV ;
-- la base le garantit quoi qu'il arrive.

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
  v_current integer;
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

  -- CGV : dès qu'une version est publiée, la demande doit avoir accepté
  -- celle en vigueur ; sans version publiée, aucune ne peut être indiquée.
  select max(l.version) into v_current from public.legal_versions l;
  if v_current is not null and v_terms is distinct from v_current then
    raise exception 'CGV non acceptees (version en vigueur %)', v_current using errcode = '22023';
  end if;
  if v_current is null and v_terms is not null then
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
