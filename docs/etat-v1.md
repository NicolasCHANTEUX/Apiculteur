# État de la V1

Ce document distingue ce qui est **dans le code** de ce qui a été **vérifié en conditions réelles** (vrai projet Supabase, vrai compte, vrai email, vrai paiement). « Implémenté » ne veut pas dire « validé ». La liste des fonctionnalités est dans [CAHIER_DES_CHARGES.md](../CAHIER_DES_CHARGES.md), l’ordre de réalisation dans [ROADMAP.md](../ROADMAP.md).

Mis à jour le 3 octobre 2026.

## Par domaine

| Domaine | Dans le code | Vérifié | Reste à valider |
| --- | --- | --- | --- |
| Pages publiques (maquette) | Accueil, catalogue, fiche, à propos, avis, FAQ, contact, 404, erreur | Rendu local en mode démo, 390 et 1 440 px | Contenus réels, réponses de la FAQ |
| Catalogue public | Vues publiques, prix dégressifs, modes de stock | Tests unitaires ; migrations et seed rejoués sur Postgres (PGlite) | Données réelles sur le projet Supabase |
| Avis (lecture) | Vue publique, note moyenne, répartition | Tests unitaires ; mode démo | Premiers vrais avis |
| Sécurité (socle) | En-têtes et CSP, garde d’origine des routes API, limitation de débit persistante, journal d’audit | Tests unitaires ; migrations appliquées par `supabase start` ; quota vérifié en conditions réelles | Application de la migration sur le projet Supabase en ligne |
| CI | Lint, tests, types, build sur GitHub Actions | — | Premier passage sur GitHub |
| Accès administrateur | Connexion, déconnexion, mot de passe oublié, lien de confirmation, page de refus, limitation de débit, script `npm run admin` | Recette Chrome contre Supabase local (17 contrôles) : email de réinitialisation reçu et suivi, mot de passe, connexion, déconnexion, compte sans droits refusé, blocage au 9ᵉ essai, `/admin` anonyme redirigé | Recette sur le projet Supabase en ligne (envoi d’emails réel) |
| Tableau de bord admin | Compteurs, dernières commandes, stock faible, état de la mise en service | Rendu avec une vraie session admin et les données du seed, à 390 et 1 280 px | — |
| Catalogue géré par l’admin | Produits (formulaire complet, paliers, caractéristiques, prix barré, état, transport, unité), photos (envoi, réencodage WebP, couverture, ordre, rotation, suppression), catégories, stock et statut depuis la liste, journal d’audit | Recette Chrome contre Supabase local (24 contrôles) : création avec erreur puis correction, photos dont orientation EXIF, conflit de version, masquage → 404, archivage, fiche publique | Recette sur le projet en ligne ; photos réelles |
| Panier, commande, emails, factures, paiement | Absents | — | Lots 3 à 18 |

## Migrations

À appliquer sur le projet Supabase après sauvegarde, dans l’ordre du dossier `supabase/migrations` :

- `20261003100000_security_foundations.sql` — limitation de débit et journal d’audit (lot 0).
- `20261003120000_catalog_admin.sql` — champs produit, caractéristiques, bucket `product-images`, fonction `admin_save_product` (lot 2).

Aucune n’est encore appliquée sur le projet distant. Toutes passent sur une base neuve (`supabase db reset`).

## Mise en service de l’accès administrateur

1. Appliquer les migrations, puis renseigner `.env.local` (voir `.env.example`), dont `SUPABASE_SERVICE_ROLE_KEY` et `RATE_LIMIT_SECRET`.
2. Dans Supabase : *Authentication → Sign In / Providers* : fournisseur **Email activé**, mais **inscriptions désactivées** (« Allow new users to sign up » décoché). *Authentication → URL Configuration* : *Site URL* = l’adresse du site ; ajouter `<site>/auth/confirm` aux *Redirect URLs*. En local, `supabase/config.toml` fait déjà ces réglages.
3. Créer le compte : `npm run admin -- create <email>` (ou `grant <email>` pour un compte existant). Aucun mot de passe n’est affiché.
4. Sur le site : « Espace apiculteur » → « Mot de passe oublié » pour choisir le mot de passe, puis se connecter.
5. Vérifier à tout moment : `npm run admin -- check <email>` (lecture seule).

Le lien de réinitialisation par défaut doit être ouvert dans le navigateur qui a fait la demande. Pour l’ouvrir ailleurs, personnaliser le gabarit d’email Supabase avec `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nouveau-mot-de-passe`.

## Environnement local

- `npx supabase start` (Docker requis) : base, Auth, Storage et boîte mail de test Mailpit (http://127.0.0.1:54324). Migrations et seed appliqués au premier démarrage.
- `.env.local` : URL `http://127.0.0.1:54321` et clés locales affichées par `supabase start` ; `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (port autorisé pour les liens de connexion).
- Lancer le site avec `npm run dev` (port 3000).

## Données provisoires à remplacer avant ouverture

Contenus repris de la maquette : nom et coordonnées de l’apiculteur (`src/lib/site.ts`), photos (`public/images`), chiffres de la section À propos, réponses de la FAQ, réseaux sociaux.
