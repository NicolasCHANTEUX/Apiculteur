# État de la V1

Ce document distingue ce qui est **dans le code** de ce qui a été **vérifié en conditions réelles** (vrai projet Supabase, vrai compte, vrai email, vrai paiement). « Implémenté » ne veut pas dire « validé ». La liste des fonctionnalités est dans [CAHIER_DES_CHARGES.md](../CAHIER_DES_CHARGES.md), l’ordre de réalisation dans [ROADMAP.md](../ROADMAP.md).

Mis à jour le 3 octobre 2026.

## Par domaine

| Domaine | Dans le code | Vérifié | Reste à valider |
| --- | --- | --- | --- |
| Pages publiques (maquette) | Accueil, catalogue, fiche, à propos, avis, FAQ, contact, 404, erreur | Rendu local en mode démo, 390 et 1 440 px | Contenus réels, réponses de la FAQ |
| Catalogue public | Vues publiques, prix dégressifs, modes de stock | Tests unitaires ; migrations et seed rejoués sur Postgres (PGlite) | Données réelles sur le projet Supabase |
| Avis (lecture) | Vue publique, note moyenne, répartition | Tests unitaires ; mode démo | Premiers vrais avis |
| Sécurité (socle) | En-têtes et CSP, garde d’origine des routes API, limitation de débit persistante, journal d’audit | Tests unitaires ; migration rejouée sur PGlite | Application de la migration sur le projet Supabase |
| CI | Lint, tests, types, build sur GitHub Actions | — | Premier passage sur GitHub |
| Administration, panier, commande, emails, factures, paiement | Absents | — | Lots 1 à 18 |

## Migrations

À appliquer sur le projet Supabase après sauvegarde, dans l’ordre du dossier `supabase/migrations` :

- `20261003100000_security_foundations.sql` — limitation de débit et journal d’audit (lot 0). Non encore appliquée sur le projet distant.

## Données provisoires à remplacer avant ouverture

Contenus repris de la maquette : nom et coordonnées de l’apiculteur (`src/lib/site.ts`), photos (`public/images`), chiffres de la section À propos, réponses de la FAQ, réseaux sociaux.
