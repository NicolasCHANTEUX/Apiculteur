-- Fin du lot 5 (ROADMAP ; CAHIER sections 8.2 et 17.4) : proposition de
-- modification au client, qui repond par un lien securise (H6), et ventes
-- manuelles saisies par l'apiculteur (marche, telephone, virement).

-- Statut « modification proposee » -----------------------------------------
-- Une nouvelle valeur d'enum n'est pas utilisable dans la transaction qui la
-- cree : elle n'apparait ci-dessous que dans des fonctions plpgsql, dont le
-- code n'est interprete qu'a l'execution.
alter type public.order_validation_status add value if not exists 'proposed' after 'pending';

-- Origine de la commande ; client facultatif -------------------------------
alter table public.orders
  add column source text not null default 'online' check (source in ('online', 'manual'));

-- Vente au comptoir a un client de passage, sans email : pas de fiche client.
alter table public.orders alter column customer_id drop not null;

-- Propositions de modification ---------------------------------------------
-- Une proposition remplace, si le client l'accepte, les lignes, le mode de
-- reception, la date et les frais de la demande. La demande telle qu'elle
-- etait est gardee dans `previous` (historique, affichage avant/apres).
create table public.order_proposals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  -- [{product_id, name, quantity, unit_price, line_total}]
  items jsonb not null
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30),
  delivery_method public.delivery_method not null,
  requested_date date,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  -- Message de l'apiculteur, repris dans l'email et sur la page du client.
  message text check (char_length(message) <= 2000),
  -- Demande au moment de la proposition : lignes, reception, date, totaux.
  previous jsonb not null check (jsonb_typeof(previous) = 'object'),
  -- Lien envoye au client : seule l'empreinte SHA-256 du jeton est gardee.
  -- Sans lien (client sans email, ou prevenu par telephone), l'apiculteur
  -- applique lui-meme la proposition une fois l'accord obtenu.
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  link_sent boolean not null default false,
  expires_at timestamptz not null,
  responded_at timestamptz,
  responded_by text check (responded_by in ('customer', 'admin')),
  customer_reply text check (char_length(customer_reply) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_proposals_total check (total_amount = subtotal + delivery_fee)
);

-- Une seule proposition en attente par commande.
create unique index order_proposals_pending_key on public.order_proposals (order_id) where status = 'pending';
create index order_proposals_order_idx on public.order_proposals (order_id, created_at desc);

create trigger set_updated_at
  before update on public.order_proposals
  for each row execute function public.set_updated_at();

-- L'admin lit les propositions sans jamais lire l'empreinte du jeton ;
-- ecritures par les fonctions ci-dessous uniquement.
alter table public.order_proposals enable row level security;
revoke all privileges on table public.order_proposals from public, anon, authenticated;
grant select (
  id, order_id, status, items, delivery_method, requested_date, subtotal, delivery_fee,
  total_amount, message, previous, link_sent, expires_at, responded_at, responded_by,
  customer_reply, created_by, created_at, updated_at
) on table public.order_proposals to authenticated;

create policy "Admins can read order proposals"
  on public.order_proposals for select
  to authenticated
  using (public.is_admin());

-- Lignes saisies par l'admin -----------------------------------------------
-- Verifie les lignes (produits existants, une ligne par produit, quantites
-- et prix bornes), reprend le nom du catalogue et calcule les totaux.
-- Interne : appelee par les fonctions admin ci-dessous.
create function public.order_lines_from_json(p_items jsonb, out items jsonb, out subtotal numeric)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_count integer;
  v_distinct integer;
  v_valid integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Lignes invalides' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count not between 1 and 30 then
    raise exception 'Entre 1 et 30 produits' using errcode = '22023';
  end if;
  select count(distinct t.item->>'product_id') into v_distinct from jsonb_array_elements(p_items) as t(item);
  if v_distinct <> v_count then
    raise exception 'Produit en double' using errcode = '22023';
  end if;

  select
    jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'quantity', (t.item->>'quantity')::integer,
        'unit_price', round((t.item->>'unit_price')::numeric, 2),
        'line_total', round((t.item->>'unit_price')::numeric, 2) * (t.item->>'quantity')::integer
      )
      order by t.ord
    ),
    count(p.id),
    coalesce(sum(round((t.item->>'unit_price')::numeric, 2) * (t.item->>'quantity')::integer), 0)
    into items, v_valid, subtotal
    from jsonb_array_elements(p_items) with ordinality as t(item, ord)
    join public.products p on p.id = (t.item->>'product_id')::uuid
   where (t.item->>'quantity')::integer between 1 and 999
     and (t.item->>'unit_price')::numeric between 0 and 99999.99;
  if v_valid <> v_count then
    raise exception 'Lignes invalides' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.order_lines_from_json(jsonb) from public, anon, authenticated;

-- Proposition de l'admin -----------------------------------------------------
-- La demande passe en « modification proposee » ; le stock n'est pas touche
-- (H3 : il ne l'est qu'a l'acceptation).
create function public.admin_propose_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_proposal jsonb,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_lines record;
  v_method public.delivery_method;
  v_fee numeric;
  v_message text := nullif(btrim(coalesce(p_proposal->>'message', '')), '');
  v_previous jsonb;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is not null and v_order.updated_at <> p_expected_updated_at then
    raise exception 'La commande a ete modifiee entre-temps' using errcode = '40001';
  end if;
  if v_order.validation_status::text <> 'pending' then
    raise exception 'Cette demande a deja ete traitee' using errcode = '55000';
  end if;

  v_method := (p_proposal->>'delivery_method')::public.delivery_method;
  if v_method = 'delivery' and v_order.delivery_postal_code is null then
    raise exception 'Livraison impossible sans adresse' using errcode = '22023';
  end if;
  v_fee := case when v_method = 'delivery' then round(coalesce((p_proposal->>'delivery_fee')::numeric, 0), 2) else 0 end;
  if v_fee not between 0 and 99999.99 then
    raise exception 'Frais invalides' using errcode = '22023';
  end if;
  if char_length(coalesce(v_message, '')) > 2000 then
    raise exception 'Message trop long' using errcode = '22023';
  end if;

  select * into v_lines from public.order_lines_from_json(p_proposal->'items');

  select jsonb_build_object(
           'items', coalesce(jsonb_agg(
             jsonb_build_object('product_id', i.product_id, 'name', i.product_name_snapshot, 'quantity', i.quantity,
                                'unit_price', i.unit_price, 'line_total', i.line_total)
             order by i.created_at, i.id), '[]'::jsonb),
           'delivery_method', v_order.delivery_method,
           'requested_date', v_order.requested_date,
           'subtotal', v_order.subtotal,
           'delivery_fee', v_order.delivery_fee,
           'total_amount', v_order.total_amount
         )
    into v_previous
    from public.order_items i
   where i.order_id = v_order.id;

  insert into public.order_proposals (
    order_id, items, delivery_method, requested_date, subtotal, delivery_fee, total_amount,
    message, previous, token_hash, link_sent, expires_at, created_by
  )
  values (
    v_order.id, v_lines.items, v_method, nullif(p_proposal->>'requested_date', '')::date,
    v_lines.subtotal, v_fee, v_lines.subtotal + v_fee, v_message, v_previous,
    p_token_hash, p_token_hash is not null, coalesce(p_expires_at, now() + interval '14 days'), auth.uid()
  )
  returning id into v_id;

  update public.orders o set validation_status = 'proposed' where o.id = v_order.id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'order.proposed', 'order', v_order.id,
    jsonb_strip_nulls(jsonb_build_object(
      'order_number', v_order.order_number,
      'total', v_lines.subtotal + v_fee,
      'link', p_token_hash is not null,
      'note', v_message
    ))
  );

  return v_id;
end;
$$;

revoke all on function public.admin_propose_order(uuid, timestamptz, jsonb, text, timestamptz) from public, anon;
grant execute on function public.admin_propose_order(uuid, timestamptz, jsonb, text, timestamptz) to authenticated;

-- Reponse a une proposition (interne) --------------------------------------
-- Acceptee : lignes, reception, date et frais remplaces, puis acceptation
-- comme par l'admin (stock decompte). Si le stock ne suffit plus, la
-- commande modifiee revient « a valider » avec une raison d'attention.
-- Declinee : la demande revient « a valider », telle qu'elle etait.
create function public.resolve_order_proposal(
  p_proposal_id uuid,
  p_accept boolean,
  p_reply text,
  p_by text
)
returns table (order_id uuid, order_number text, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.order_proposals;
  v_order public.orders;
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  v_short text;
  v_outcome text;
begin
  select * into v_proposal from public.order_proposals p where p.id = p_proposal_id for update;
  if not found then
    raise exception 'Proposition introuvable' using errcode = 'P0002';
  end if;
  if v_proposal.status <> 'pending' then
    raise exception 'Proposition deja traitee' using errcode = '55000';
  end if;
  select * into v_order from public.orders o where o.id = v_proposal.order_id for update;
  if v_order.validation_status::text <> 'proposed' then
    raise exception 'Commande deja traitee' using errcode = '55000';
  end if;
  if char_length(coalesce(v_reply, '')) > 2000 then
    raise exception 'Message trop long' using errcode = '22023';
  end if;

  if not p_accept then
    update public.orders o
       set validation_status = 'pending',
           review_reasons = case when 'Proposition déclinée' = any(o.review_reasons) then o.review_reasons
                                 else o.review_reasons || 'Proposition déclinée'::text end
     where o.id = v_order.id;
    v_outcome := 'declined';
  else
    delete from public.order_items i where i.order_id = v_order.id;
    insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
    select v_order.id, (t.item->>'product_id')::uuid, t.item->>'name', (t.item->>'unit_price')::numeric,
           (t.item->>'quantity')::integer, (t.item->>'line_total')::numeric
      from jsonb_array_elements(v_proposal.items) with ordinality as t(item, ord)
     order by t.ord;

    update public.orders o
       set delivery_method = v_proposal.delivery_method,
           requested_date = v_proposal.requested_date,
           subtotal = v_proposal.subtotal,
           delivery_fee = v_proposal.delivery_fee,
           total_amount = v_proposal.total_amount
     where o.id = v_order.id;

    perform 1 from public.products p
     where p.id in (select i.product_id from public.order_items i where i.order_id = v_order.id)
       for update;

    select string_agg(format('%s (reste %s, demande %s)', p.name, p.stock_quantity, q.quantity), ', ')
      into v_short
      from (
        select i.product_id, sum(i.quantity) as quantity
          from public.order_items i where i.order_id = v_order.id group by i.product_id
      ) q
      join public.products p on p.id = q.product_id
     where p.purchase_mode = 'standard' and p.stock_quantity < q.quantity;

    if v_short is null then
      update public.products p
         set stock_quantity = p.stock_quantity - q.quantity
        from (
          select i.product_id, sum(i.quantity) as quantity
            from public.order_items i where i.order_id = v_order.id group by i.product_id
        ) q
       where p.id = q.product_id and p.purchase_mode = 'standard';

      update public.orders o
         set validation_status = 'accepted',
             fulfillment_status = 'preparing',
             stock_reserved = true,
             decided_at = now(),
             admin_validation_note = coalesce(v_proposal.message, o.admin_validation_note)
       where o.id = v_order.id;
      v_outcome := 'accepted';
    else
      update public.orders o
         set validation_status = 'pending',
             review_reasons = case when 'Stock à vérifier' = any(o.review_reasons) then o.review_reasons
                                   else o.review_reasons || 'Stock à vérifier'::text end
       where o.id = v_order.id;
      v_outcome := 'accepted_stock_short';
    end if;
  end if;

  update public.order_proposals p
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now(),
         responded_by = p_by,
         customer_reply = v_reply
   where p.id = v_proposal.id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case when p_accept then 'order.proposal_accepted' else 'order.proposal_declined' end,
    'order', v_order.id,
    jsonb_strip_nulls(jsonb_build_object(
      'order_number', v_order.order_number,
      'by', p_by,
      'stock_short', case when v_outcome = 'accepted_stock_short' then true end,
      'note', v_reply
    ))
  );

  return query select v_order.id, v_order.order_number, v_outcome;
end;
$$;

revoke all on function public.resolve_order_proposal(uuid, boolean, text, text) from public, anon, authenticated;

-- Reponse du client, par le lien recu par email (role service seulement).
create function public.respond_order_proposal(p_token_hash text, p_accept boolean, p_reply text)
returns table (order_id uuid, order_number text, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.order_proposals;
begin
  select * into v_proposal from public.order_proposals p where p.token_hash = p_token_hash for update;
  if not found then
    raise exception 'Lien invalide' using errcode = 'P0002';
  end if;
  if v_proposal.status <> 'pending' then
    raise exception 'Proposition deja traitee' using errcode = '55000';
  end if;
  if v_proposal.expires_at < now() then
    raise exception 'Lien expire' using errcode = '22023';
  end if;
  return query
    select r.order_id, r.order_number, r.outcome
      from public.resolve_order_proposal(v_proposal.id, p_accept, p_reply, 'customer') as r;
end;
$$;

revoke all on function public.respond_order_proposal(text, boolean, text) from public, anon, authenticated;
grant execute on function public.respond_order_proposal(text, boolean, text) to service_role;

-- Accord obtenu par telephone (« appliquer ») ou proposition retiree.
create function public.admin_resolve_order_proposal(
  p_proposal_id uuid,
  p_action text,
  p_expected_updated_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.order_proposals;
  v_order public.orders;
  v_outcome text;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  select * into v_proposal from public.order_proposals p where p.id = p_proposal_id for update;
  if not found then
    raise exception 'Proposition introuvable' using errcode = 'P0002';
  end if;
  if v_proposal.status <> 'pending' then
    raise exception 'Proposition deja traitee' using errcode = '55000';
  end if;
  select * into v_order from public.orders o where o.id = v_proposal.order_id for update;
  if p_expected_updated_at is not null and v_order.updated_at <> p_expected_updated_at then
    raise exception 'La commande a ete modifiee entre-temps' using errcode = '40001';
  end if;

  if p_action = 'withdraw' then
    update public.order_proposals p
       set status = 'withdrawn', responded_at = now(), responded_by = 'admin'
     where p.id = v_proposal.id;
    update public.orders o
       set validation_status = 'pending'
     where o.id = v_order.id and o.validation_status::text = 'proposed';
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'order.proposal_withdrawn', 'order', v_order.id,
            jsonb_build_object('order_number', v_order.order_number));
    return 'withdrawn';
  elsif p_action = 'apply' then
    select r.outcome into v_outcome from public.resolve_order_proposal(v_proposal.id, true, null, 'admin') as r;
    return v_outcome;
  end if;
  raise exception 'Action inconnue' using errcode = '22023';
end;
$$;

revoke all on function public.admin_resolve_order_proposal(uuid, text, timestamptz) from public, anon;
grant execute on function public.admin_resolve_order_proposal(uuid, text, timestamptz) to authenticated;

-- Refus ou annulation : une proposition en attente est retiree -------------
-- (meme fonction qu'au lot 4, executee avec les droits du proprietaire pour
-- retirer la proposition, que l'admin ne peut pas modifier directement).
create or replace function public.admin_cancel_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_open boolean;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is not null and v_order.updated_at <> p_expected_updated_at then
    raise exception 'La commande a ete modifiee entre-temps' using errcode = '40001';
  end if;
  if v_order.fulfillment_status in ('delivered', 'cancelled') or v_order.validation_status = 'refused' then
    raise exception 'Cette commande est deja terminee' using errcode = '55000';
  end if;
  v_open := v_order.validation_status::text in ('pending', 'proposed');

  if v_order.stock_reserved then
    update public.products p
       set stock_quantity = p.stock_quantity + q.quantity
      from (
        select i.product_id, sum(i.quantity) as quantity
          from public.order_items i where i.order_id = p_order_id group by i.product_id
      ) q
     where p.id = q.product_id and p.purchase_mode = 'standard';
  end if;

  update public.order_proposals p
     set status = 'withdrawn', responded_at = now(), responded_by = 'admin'
   where p.order_id = p_order_id and p.status = 'pending';

  update public.orders o
     set validation_status = case when v_open then 'refused'::public.order_validation_status else o.validation_status end,
         fulfillment_status = 'cancelled',
         stock_reserved = false,
         decided_at = coalesce(o.decided_at, now()),
         admin_validation_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), o.admin_validation_note)
   where o.id = p_order_id;

  return case when v_open then 'refused' else 'cancelled' end;
end;
$$;

-- Vente manuelle -------------------------------------------------------------
-- Saisie par l'apiculteur : commande acceptee d'emblee, stock decompte,
-- eventuellement deja payee ou remise. Avec un email, la fiche client est
-- creee ou completee (jamais ecrasee) ; sans email, la vente reste sans
-- fiche. Idempotente par sa cle d'envoi (double clic).
create function public.admin_create_manual_order(p_order jsonb)
returns table (order_id uuid, order_number text, already_created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid := (p_order->>'submission_key')::uuid;
  v_email text := nullif(lower(btrim(coalesce(p_order->>'email', ''))), '');
  v_name text := btrim(coalesce(p_order->>'name', ''));
  v_method public.delivery_method := coalesce(nullif(p_order->>'delivery_method', ''), 'pickup')::public.delivery_method;
  v_step text := coalesce(nullif(p_order->>'fulfillment_status', ''), 'preparing');
  v_paid boolean := coalesce((p_order->>'paid')::boolean, false);
  v_lines record;
  v_fee numeric;
  v_customer uuid;
  v_order public.orders;
  v_short text;
begin
  if not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;
  if v_key is null then
    raise exception 'Cle d''envoi manquante' using errcode = '22023';
  end if;

  select * into v_order from public.orders o where o.submission_key = v_key;
  if found then
    return query select v_order.id, v_order.order_number, true;
    return;
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Nom du client invalide' using errcode = '22023';
  end if;
  if v_step not in ('preparing', 'ready', 'delivered') then
    raise exception 'Etape invalide' using errcode = '22023';
  end if;
  v_fee := case when v_method = 'delivery' then round(coalesce((p_order->>'delivery_fee')::numeric, 0), 2) else 0 end;
  if v_fee not between 0 and 99999.99 then
    raise exception 'Frais invalides' using errcode = '22023';
  end if;

  select * into v_lines from public.order_lines_from_json(p_order->'items');

  -- Stock des produits vendus en vente directe : verifie puis decompte.
  perform 1 from public.products p
   where p.id in (select (t.item->>'product_id')::uuid from jsonb_array_elements(v_lines.items) as t(item))
     for update;
  select string_agg(format('%s (reste %s, vendu %s)', p.name, p.stock_quantity, (t.item->>'quantity')::integer), ', ')
    into v_short
    from jsonb_array_elements(v_lines.items) as t(item)
    join public.products p on p.id = (t.item->>'product_id')::uuid
   where p.purchase_mode = 'standard' and p.stock_quantity < (t.item->>'quantity')::integer;
  if v_short is not null then
    raise exception 'Stock insuffisant : %', v_short using errcode = 'P0001';
  end if;

  if v_email is not null then
    insert into public.customers as c (email, full_name, phone, address_line1, postal_code, city)
    values (
      v_email, v_name,
      nullif(btrim(coalesce(p_order->>'phone', '')), ''),
      nullif(btrim(coalesce(p_order->>'address_line1', '')), ''),
      nullif(btrim(coalesce(p_order->>'postal_code', '')), ''),
      nullif(btrim(coalesce(p_order->>'city', '')), '')
    )
    on conflict ((lower(email))) do update set
      phone = coalesce(c.phone, excluded.phone),
      address_line1 = coalesce(c.address_line1, excluded.address_line1),
      postal_code = coalesce(c.postal_code, excluded.postal_code),
      city = coalesce(c.city, excluded.city)
    returning c.id into v_customer;
  end if;

  begin
    insert into public.orders (
      submission_key, customer_id, source, delivery_method,
      delivery_address_line1, delivery_postal_code, delivery_city, delivery_country,
      requested_date, subtotal, delivery_fee, total_amount,
      fulfillment_status, validation_status, payment_status, payment_method,
      contact_name, contact_email, contact_phone, company_name, professional_id,
      admin_internal_note, stock_reserved, decided_at
    )
    values (
      v_key, v_customer, 'manual', v_method,
      case when v_method = 'delivery' then nullif(btrim(coalesce(p_order->>'address_line1', '')), '') end,
      case when v_method = 'delivery' then nullif(btrim(coalesce(p_order->>'postal_code', '')), '') end,
      case when v_method = 'delivery' then nullif(btrim(coalesce(p_order->>'city', '')), '') end,
      'FR',
      nullif(p_order->>'requested_date', '')::date,
      v_lines.subtotal, v_fee, v_lines.subtotal + v_fee,
      v_step::public.order_fulfillment_status,
      'accepted',
      case when v_paid then 'paid' else 'unpaid' end::public.payment_status,
      case when v_paid then nullif(btrim(coalesce(p_order->>'payment_method', '')), '') end,
      v_name,
      v_email,
      nullif(btrim(coalesce(p_order->>'phone', '')), ''),
      nullif(btrim(coalesce(p_order->>'company_name', '')), ''),
      nullif(btrim(coalesce(p_order->>'professional_id', '')), ''),
      nullif(btrim(coalesce(p_order->>'note', '')), ''),
      true,
      now()
    )
    returning * into v_order;
  exception when unique_violation then
    select * into v_order from public.orders o where o.submission_key = v_key;
    return query select v_order.id, v_order.order_number, true;
    return;
  end;

  insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
  select v_order.id, (t.item->>'product_id')::uuid, t.item->>'name', (t.item->>'unit_price')::numeric,
         (t.item->>'quantity')::integer, (t.item->>'line_total')::numeric
    from jsonb_array_elements(v_lines.items) with ordinality as t(item, ord)
   order by t.ord;

  update public.products p
     set stock_quantity = p.stock_quantity - (t.item->>'quantity')::integer
    from jsonb_array_elements(v_lines.items) as t(item)
   where p.id = (t.item->>'product_id')::uuid and p.purchase_mode = 'standard';

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'order.manual_created', 'order', v_order.id,
    jsonb_build_object('order_number', v_order.order_number, 'total', v_order.total_amount, 'paid', v_paid)
  );

  return query select v_order.id, v_order.order_number, false;
end;
$$;

revoke all on function public.admin_create_manual_order(jsonb) from public, anon;
grant execute on function public.admin_create_manual_order(jsonb) to authenticated;

-- Effacement d'un client (lot 9) : ses reponses aux propositions et les
-- messages qui lui etaient adresses sont effaces avec le reste.
create or replace function public.admin_forget_customer(p_customer_id uuid)
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
  update public.order_proposals p set customer_reply = null, message = null where p.order_id = any(v_orders);

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

comment on table public.order_proposals is
  'Propositions de modification d''une demande (quantites, prix, reception, date). '
  'Le client accepte ou decline par un lien (empreinte du jeton seulement) ; '
  'ecritures par fonctions uniquement.';
