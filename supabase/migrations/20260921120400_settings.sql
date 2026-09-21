-- Parametres admin-editables (Readme.md section 19) pilotant le moteur de
-- regles (section 20). Cle/valeur jsonb plutot que des colonnes figees,
-- pour que l'admin puisse ajuster les seuils sans migration de schema.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

create policy "Admins have full access to app settings"
  on public.app_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Valeurs par defaut. Cote appli, prevoir un fallback si une cle est
-- absente plutot que de supposer qu'elle existe toujours.
insert into public.app_settings (key, value, description) values
  ('delivery_origin_address',
   '{"line1": "", "postal_code": "", "city": "", "country": "FR", "latitude": null, "longitude": null}',
   'Adresse de depart de l''apiculteur, utilisee pour calculer la distance de livraison.'),
  ('max_auto_delivery_distance_km', '150',
   'Distance (km) en dessous de laquelle une livraison est geree automatiquement.'),
  ('max_auto_delivery_quantity', '20',
   'Quantite en dessous de laquelle une commande est geree automatiquement.'),
  ('manual_validation_distance_threshold_km', '300',
   'Au-dela de cette distance, une commande passe toujours en validation manuelle (section 8).'),
  ('manual_validation_quantity_threshold', '30',
   'Au-dela de cette quantite, une commande passe toujours en validation manuelle (section 8).'),
  ('review_request_delay_days', '7',
   'Delai (jours) apres une commande avant l''envoi de l''email de demande d''avis (section 13).');
