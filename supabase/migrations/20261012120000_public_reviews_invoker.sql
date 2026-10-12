-- Les vues sont executees avec les droits de leur proprietaire par defaut.
-- La vue publique doit appliquer les privileges et la RLS de l'appelant.
alter view public.public_reviews set (security_invoker = true);

-- Une vue security_invoker exige l'acces aux colonnes de sa table source.
-- Ne jamais accorder SELECT sur access_token, token_expires_at ou order_id.
revoke all privileges on table public.reviews from public, anon, authenticated;
grant select (
  id, product_id, customer_name, rating, comment, admin_reply,
  featured, submitted_at, created_at, status, customer_consent
) on table public.reviews to anon, authenticated;

-- Les modifications restent reservees aux admins par la policy RLS existante.
grant insert, update, delete on table public.reviews to authenticated;

create policy "Consented displayed reviews are publicly readable"
  on public.reviews for select
  to anon, authenticated
  using (status = 'displayed' and customer_consent = true);
