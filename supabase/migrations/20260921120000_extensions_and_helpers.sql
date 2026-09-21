-- Extensions requises.
-- pgcrypto   : gen_random_uuid() pour les cles primaires.
-- btree_gist : requis par la contrainte d'exclusion anti-chevauchement
--              des paliers de prix degressifs (voir 0002_catalog.sql).
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Fonction generique pour maintenir updated_at a jour. Attachee via
-- trigger table par table (voir les migrations suivantes).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Comptes admin (back-office). Un utilisateur Supabase Auth (auth.users)
-- devient admin en ayant une ligne ici. La colonne "role" anticipe le
-- besoin (Readme.md section 22) de plusieurs roles admin plus tard, sans
-- avoir a changer le schema. Pas d'UI de gestion cote appli pour l'instant :
-- ajout/suppression via le dashboard Supabase ou la service role key.
create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Utilisateurs autorises a acceder au back-office.';

alter table public.admin_users enable row level security;

-- Un admin peut lire sa propre ligne (utile cote client pour savoir s'il
-- est admin). Aucune ecriture autorisee via l'API publique pour l'instant.
create policy "Admins can read their own admin_users row"
  on public.admin_users for select
  to authenticated
  using (id = auth.uid());

-- Fonction utilitaire utilisee par les policies RLS de toutes les autres
-- tables. security definer : necessaire pour pouvoir lire admin_users
-- meme si l'appelant n'a pas de policy SELECT dessus (evite une
-- recursion RLS).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;
