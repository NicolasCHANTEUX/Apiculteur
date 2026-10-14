-- Demandes de commande et traitement par l'admin (ROADMAP lots 4 et 5 ;
-- CAHIER sections 8 et 17.4). Hypotheses du plan : H1 demande sans paiement
-- en ligne, H2 toute demande est acceptee ou refusee par l'apiculteur,
-- H3 stock decremente a l'acceptation, H4 retrait par defaut et livraison
-- « a organiser ».

-- Coordonnees figees dans la demande : la fiche client (une par email) ne
-- doit pas pouvoir etre ecrasee par un formulaire public.
alter table public.orders
  add column submission_key uuid unique,
  add column contact_name text check (char_length(contact_name) between 2 and 120),
  add column contact_email text check (char_length(contact_email) between 3 and 254),
  add column contact_phone text check (char_length(contact_phone) <= 30),
  add column company_name text check (char_length(company_name) <= 120),
  add column professional_id text check (char_length(professional_id) <= 40),
  -- Ce qui merite l'attention de l'apiculteur (grosse quantite, livraison a
  -- organiser, prix a confirmer…). Ne bloque rien (H2).
  add column review_reasons text[] not null default '{}',
  -- Vrai tant que le stock des produits vendus en commande directe est
  -- decompte pour cette commande (rendu a l'annulation).
  add column stock_reserved boolean not null default false,
  add column decided_at timestamptz,
  add constraint orders_customer_message_length check (char_length(customer_message) <= 2000);

alter table public.orders alter column delivery_method set default 'pickup';

create index orders_created_at_idx on public.orders (created_at desc);

-- Interrupteur de reception des demandes, ferme par defaut (CAHIER 1.1).
insert into public.app_settings (key, value, description) values
  ('orders_open', 'false',
   'Reception des demandes de commande depuis le site (true/false).')
on conflict (key) do nothing;

-- Enregistrement d'une demande -------------------------------------------
-- Appelee uniquement par le serveur (role service), apres validation des
-- champs et recalcul des prix depuis la base (src/app/(site)/commande).
-- Tout ou rien : client, commande, lignes et journal. Idempotente : la meme
-- cle d'envoi renvoie la demande deja creee (double clic, rechargement).

create or replace function public.submit_order_request(p_request jsonb)
returns table (order_id uuid, order_number text, already_submitted boolean)
language plpgsql
set search_path = public
as $$
declare
  v_key uuid := (p_request->>'submission_key')::uuid;
  v_email text := lower(trim(p_request->>'email'));
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
      review_reasons
    )
    values (
      v_key,
      v_customer,
      (p_request->>'delivery_method')::public.delivery_method,
      nullif(p_request->>'address_line1', ''),
      nullif(p_request->>'postal_code', ''),
      nullif(p_request->>'city', ''),
      'FR',
      nullif(p_request->>'requested_date', '')::date,
      nullif(p_request->>'message', ''),
      (p_request->>'subtotal')::numeric,
      0,
      (p_request->>'subtotal')::numeric,
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
      )
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

revoke all on function public.submit_order_request(jsonb) from public, anon, authenticated;
grant execute on function public.submit_order_request(jsonb) to service_role;

-- Acceptation : decompte atomique du stock (H3) ---------------------------
-- Seuls les produits vendus en commande directe ont un stock decompte ; les
-- reservations et devis n'en ont pas besoin. Refus explicite si le stock ne
-- suffit pas : l'admin ajuste le stock ou la demande, puis recommence.

create or replace function public.admin_accept_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_note text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_order public.orders;
  v_short text;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is not null and v_order.updated_at <> p_expected_updated_at then
    raise exception 'La commande a ete modifiee entre-temps' using errcode = '40001';
  end if;
  if v_order.validation_status <> 'pending' then
    raise exception 'Cette demande a deja ete traitee' using errcode = '55000';
  end if;

  -- Verrouille les produits concernes avant de verifier puis decompter.
  perform 1 from public.products
   where id in (select product_id from public.order_items where order_id = p_order_id)
   for update;

  select string_agg(format('%s (reste %s, demande %s)', p.name, p.stock_quantity, i.quantity), ', ')
    into v_short
    from (
      select product_id, sum(quantity) as quantity
        from public.order_items where order_id = p_order_id group by product_id
    ) i
    join public.products p on p.id = i.product_id
   where p.purchase_mode = 'standard' and p.stock_quantity < i.quantity;
  if v_short is not null then
    raise exception 'Stock insuffisant : %', v_short using errcode = 'P0001';
  end if;

  update public.products p
     set stock_quantity = p.stock_quantity - i.quantity
    from (
      select product_id, sum(quantity) as quantity
        from public.order_items where order_id = p_order_id group by product_id
    ) i
   where p.id = i.product_id and p.purchase_mode = 'standard';

  update public.orders
     set validation_status = 'accepted',
         fulfillment_status = 'preparing',
         stock_reserved = true,
         decided_at = now(),
         admin_validation_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_order_id;
end;
$$;

-- Refus (demande en attente) ou annulation (commande acceptee) ------------
-- Le stock decompte a l'acceptation est rendu. La commande reste dans
-- l'historique.

create or replace function public.admin_cancel_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_note text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is not null and v_order.updated_at <> p_expected_updated_at then
    raise exception 'La commande a ete modifiee entre-temps' using errcode = '40001';
  end if;
  if v_order.fulfillment_status in ('delivered', 'cancelled') or v_order.validation_status = 'refused' then
    raise exception 'Cette commande est deja terminee' using errcode = '55000';
  end if;

  if v_order.stock_reserved then
    update public.products p
       set stock_quantity = p.stock_quantity + i.quantity
      from (
        select product_id, sum(quantity) as quantity
          from public.order_items where order_id = p_order_id group by product_id
      ) i
     where p.id = i.product_id and p.purchase_mode = 'standard';
  end if;

  update public.orders
     set validation_status = case when validation_status = 'pending' then 'refused'::public.order_validation_status else validation_status end,
         fulfillment_status = 'cancelled',
         stock_reserved = false,
         decided_at = coalesce(decided_at, now()),
         admin_validation_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), admin_validation_note)
   where id = p_order_id;

  return case when v_order.validation_status = 'pending' then 'refused' else 'cancelled' end;
end;
$$;

revoke all on function public.admin_accept_order(uuid, timestamptz, text) from public, anon;
revoke all on function public.admin_cancel_order(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_accept_order(uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_cancel_order(uuid, timestamptz, text) to authenticated;
