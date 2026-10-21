# Plan d’attaque

Plan de réalisation de [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md). Le cahier dit **quoi** construire ; ce plan dit **dans quel ordre**. Les numéros entre parenthèses (§) renvoient aux sections du cahier.

Mis à jour le 21 octobre 2026.

## Hypothèses provisoires

Les décisions du §26 ne sont pas encore prises. En attendant, on suit les hypothèses ci-dessous : prudentes, simples à changer, et choisies pour ne fermer aucune porte. Quand une décision tombe, on met à jour l’hypothèse et les lots concernés.

| # | Hypothèse | Remplace la décision |
| --- | --- | --- |
| H1 | V1 = **demande de commande**, sans paiement en ligne. Le paiement se fait hors ligne et l’admin l’enregistre. Stripe arrive plus tard, derrière un interrupteur. | §26-3, §26-9 |
| H2 | Toute commande est une demande que l’apiculteur accepte ou refuse. Les règles de quantité et de livraison ne bloquent rien : elles décident du message affiché au client et de la priorité « à étudier ». | §26-3 |
| H3 | Le stock est décrémenté **à l’acceptation** par l’admin (opération atomique), pas à l’envoi de la demande. | §26-4 |
| H4 | Le retrait sur l’exploitation sur rendez-vous est proposé par défaut (date souhaitée). Une livraison est toujours « à organiser » et étudiée, sans tarif automatique tant qu’aucune zone n’est configurée. | §26-6, §26-7 |
| H5 | Distance : plus tard, avec la Base Adresse Nationale (api-adresse.data.gouv.fr, gratuite) et une distance à vol d’oiseau, si c’est validé. | §26-8 |
| H6 | Pas de compte client. Les échanges passent par des liens sécurisés envoyés par email. | §26-11 |
| H7 | Emails mis en file d’attente en base, avec un pilote d’envoi interchangeable. Sans fournisseur configuré, ils restent visibles dans l’admin comme « non envoyés ». | §26-12 |
| H8 | Facturation construite mais **désactivée** jusqu’à validation fiscale. | §26-10 |
| H9 | Un seul administrateur ; le modèle en accepte plusieurs. | §26-15 |
| H10 | Contenus de la maquette conservés, signalés comme provisoires. | §26-14 |
| H11 | Types de produits gérés par des catégories modifiables, plus un état générique : neuf, occasion, second choix. | §26-1, §26-2 |

## Revue de sécurité du 15 octobre 2026 · **faite** (`20261020100000_security.sql` appliquée en ligne ; `20261021100000_order_terms.sql` à appliquer)

- Next.js 16.4.1 et sharp 0.35.5 (déni de service des Server Actions ; exécution de code par l’optimisation d’images).
- Demande de commande enregistrée d’un seul tenant (CGV, frais et livraison dans la même transaction) ; jamais sans les CGV en vigueur, même si elles ne peuvent pas être lues au moment de l’envoi.
- Double authentification obligatoire pour l’admin, exigée par la base ; mots de passe de 12 caractères avec lettres et chiffres.
- Adresse du site fixe en production ; IP du client lue sans faire confiance au client ; secret de limitation dérivé ; CSP à nonce ; envois limités à 16 Mo ; photos privées jamais en cache.

## Audit de sécurité du 21 octobre 2026 · **fait dans le code** (réglages en ligne à faire, voir `docs/etat-v1.md`)

- Plus de repli sur `is_admin()` quand `admin_access_state()` manque : l’administration reste fermée.
- Changement de mot de passe : code de l’application d’authentification exigé dès qu’une application est associée (page et action), en plus du refus de Supabase Auth ; changement sécurisé (`secure_password_change`) activé.
- CI : audit des dépendances de production, CodeQL, Dependabot.
- À vérifier sur le vrai projet : réactiver Supabase (injoignable le 21 octobre), confirmer `20261021100000_order_terms.sql`, activer « Secure password change », mises à jour de sécurité Dependabot et protection de `main` sur GitHub.
- À terme : route d’envoi dédiée aux photos, pour contrôler la taille avant tout traitement (les actions restent plafonnées à 16 Mo).

## Vue d’ensemble

| Phase | Lots | But |
| --- | --- | --- |
| A — Fondations | 0, 1 | Socle technique et accès administrateur |
| B — Vendre (V1) | 2 à 6 | Catalogue géré par l’admin, panier, demande de commande, traitement, emails |
| C — Relation client | 7 à 9 | Demandes clients, avis, légal et données personnelles |
| D — Métier avancé | 10 à 13 | Livraison et distance, factures et devis, réservations, catalogue public avancé |
| E — Autonomie et visibilité | 14 à 16 | Contenus modifiables, référencement, statistiques |
| F — Ouverture | 17, 18 | Paiement en ligne, recette finale et mise en production |

Règle de fin de lot : lint, types, tests et build réussis ; recette visuelle à 390 et 1 440 px ; `docs/etat-v1.md` mis à jour ; cases du cahier cochées.

## Où on en est (21 octobre 2026)

« Reste » liste les cases du cahier encore ouvertes pour le lot, hors recette réelle (voir `docs/etat-v1.md`).

| Lot | État | Reste |
| --- | --- | --- |
| 0 — Socle technique | fait | — |
| 1 — Accès administrateur | fait | Plusieurs rôles admin (option) |
| 2 — Catalogue géré par l’admin | fait | Purge des images orphelines ; produit d’occasion créé à partir d’un modèle |
| 3 — Panier | fait | « Ramener au maximum » ; référence et état sur chaque ligne ; estimation de réception et alerte de validation manuelle dans le panier |
| 4 — Demande de commande | fait | Empreinte du contenu ; récapitulatif sur la page de confirmation ; message personnalisé quand les demandes sont fermées |
| 5 — Traitement des commandes | fait | Modifier une commande déjà acceptée, avant paiement |
| 6 — Emails | fait | Choisir le fournisseur et authentifier le domaine ; email d’alerte de stock faible ; modèles modifiables |
| 7 — Demandes clients | fait | Transformer un devis en commande (lot 11) |
| 8 — Avis clients | fait | Liste des derniers avis au tableau de bord |
| 9 — Légal, données, clients | fait | Remplir, faire relire et approuver les informations légales |
| 10 — Livraison et distance | fait | Décisions §26-6 à 8 (tarifs, tournées, créneaux de retrait) |
| 11 — Factures et devis | prochain | Tout |
| 12 — Réservations et liste d’attente | à faire | Tout |
| 13 — Catalogue public avancé | fait | Photos des défauts et lien vers le modèle neuf (matériel d’occasion) |
| 14 — Contenus et paramètres | à faire | Tout |
| 15 — Référencement et PWA | entamé | Interrupteur d’indexation, `robots.txt`, `sitemap.xml`, URL canonique, image de partage, données structurées des produits |
| 16 — Statistiques et audit | entamé | Statistiques détaillées ; journal d’audit consultable, avec anciennes et nouvelles valeurs |
| 17 — Paiement en ligne | à faire (selon §26-3) | Tout |
| 18 — Recette et mise en production | entamé | Recette HTTP et navigateur automatisées ; environnements, sauvegardes, surveillance ; protection de la branche `main` ; critères d’ouverture |

---

## Phase A — Fondations

### Lot 0 — Socle technique · **fait**

- Scripts `typecheck` et `verify`, tests découverts automatiquement, CI GitHub Actions (§23).
- En-têtes de sécurité et CSP (§20).
- Garde d’origine pour les actions et routes POST (§20).
- Limitation de débit persistante : table, fonction SQL, clé HMAC (§20).
- Journal d’audit : table et utilitaire d’écriture (§17.12).
- Page d’erreur globale (§4).
- `docs/etat-v1.md` et `.env.example` à jour (§25).

**Fini quand** : la CI passe ; les nouvelles migrations s’appliquent proprement ; les utilitaires sont testés.

### Lot 1 — Accès administrateur · **fait**

- Connexion, déconnexion, mot de passe oublié, nouveau mot de passe (§16).
- Rôle admin vérifié côté serveur via `admin_users`, dans chaque action ; page de refus ; redirection sûre ; limitation de débit (§16).
- Espace `/admin` : navigation, tableau de bord avec compteurs, mise en page mobile (§17.1-17.2).

**Fini quand** : un admin se connecte et voit le tableau de bord ; un autre compte est refusé ; un visiteur est renvoyé vers la connexion.

---

## Phase B — Vendre (V1 sans paiement en ligne)

### Lot 2 — Catalogue géré par l’admin · **fait**

- Liste des produits avec recherche, filtres et actions rapides (stock, masquer, archiver) (§17.3).
- Formulaire produit complet (§6.1, §17.3) :
  - référence, état, prix barré, unité, mode de transport ;
  - caractéristiques, saisonnalité ;
  - paliers de prix.
- Images : envoi, couverture, ordre, rotation ; réencodage WebP ; stockage Supabase (§6.2).
- Catégories : création, ordre, activation (§6.3).
- Côté public : ligne « race · particularité » et caractéristiques sur la fiche (§5).

### Lot 3 — Panier · **fait**

- Panier dans le navigateur et compteur dans l’en-tête (§7).
- Calcul par le serveur : paliers, problèmes par ligne (§7).
- Incitation aux paliers ; avertissement de validation manuelle (§7, §8.2).
- Choix retrait ou livraison à organiser (H4).

### Lot 4 — Demande de commande · **fait**

- Page `/commande` : coordonnées, adresse, identifiant pro, date souhaitée, message (§8.1).
- Création atomique en base (fonction SQL) avec clé d’idempotence ; recalcul serveur (§8.1).
- Moteur de règles lisant `app_settings` (H2, §8.2).
- Page de confirmation ; panier vidé (§8.1).
- Interrupteur « commandes ouvertes / fermées » (§8.1).

### Lot 5 — Traitement des commandes par l’admin · **fait**

- Liste filtrable et fiche détaillée avec historique (§17.4).
- Accepter (avec décrément du stock, H3), refuser ou proposer une alternative, avec message (§8.2).
- Marquer payée (moyen et date) ; suivi de préparation ; annulation ; note interne (§10, §9).
- Ventes manuelles (§17.4).

### Lot 6 — Emails · **fait** (fournisseur et domaine à choisir, §26-12)

- File d’attente et pilote d’envoi interchangeable (H7) ; journal dans l’admin (§14).
- Modèles : demande reçue (client et admin), acceptée, refusée, alternative proposée, paiement reçu, commande prête ou expédiée (§14).

---

## Phase C — Relation client

### Lot 7 — Demandes clients · **fait**

- Contact, devis grande quantité, signalement d’essaim : enregistrés en base (§12.1).
- Photos privées ; protections anti-abus (§12.1).
- Boîte de réception admin : statuts, corbeille, réponse par email (§12.2).

### Lot 8 — Avis clients · **fait** (`CRON_SECRET` à créer sur Vercel)

- Demande d’avis automatique après retrait ou livraison (§13).
- Page de dépôt par lien sécurisé (§13).
- Modération, réponse publique, mise en avant (§13).

### Lot 9 — Légal, données personnelles, clients · **fait** (informations légales à remplir et approuver)

- Configuration légale et pages générées, bloquées sans approbation (§19).
- Fiches clients, anonymisation, durées de conservation (§17.6, §19).

---

## Phase D — Métier avancé

### Lot 10 — Livraison et distance · **fait** (adresse de l’exploitation et zones à régler)

- Zones administrables ; géocodage et distance (H5) ; frais ; règles de distance (§9, §8.2).

### Lot 11 — Factures et devis · **prochain**

- Numérotation, données figées, PDF, archive privée ; désactivé par défaut (H8, §15).
- Devis et avoirs (§15).

### Lot 12 — Réservations de saison et liste d’attente

- Réservations, conversion en commande, « Prévenez-moi » (§11).

### Lot 13 — Catalogue public avancé · **fait**

- Recherche, filtres, tri et pagination côté serveur (§5.1).
- Galerie avec zoom, fil d’Ariane, actions adaptées, carrousel (§5.2, §4).

---

## Phase E — Autonomie et visibilité

### Lot 14 — Contenus et paramètres

- Accueil, À propos, FAQ, bandeau modifiables ; paramètres métier ; journal du rucher (option) (§18, §17.9).

### Lot 15 — Référencement et PWA · **entamé**

- Indexation sous interrupteur, sitemap, robots, données structurées, manifest (§21).
- Déjà fait : `noindex` des pages privées ; données structurées de la FAQ ; logo, favicon, icône Apple et manifest (`npm run icons`).

### Lot 16 — Statistiques et audit · **entamé**

- Tableaux de statistiques ; consultation du journal d’audit (§17.11-17.12).
- Déjà fait : tendances sur 7, 30 ou 90 jours et dernières actions au tableau de bord.

---

## Phase F — Ouverture

### Lot 17 — Paiement en ligne (selon décision §26-3)

- Stripe en mode test : réservation de stock, webhook, réconciliation ; puis mode réel après validation (§10).

### Lot 18 — Recette et mise en production · **entamé**

- Déjà fait : CI GitHub Actions (lint, tests, types, build, audit des dépendances de production), CodeQL et Dependabot ; tâche quotidienne protégée par un secret.
- Protection de la branche `main` (pull request et CI obligatoires avant fusion).
- Recette HTTP et navigateur automatisées (§23).
- Environnements, sauvegardes, tâches planifiées, surveillance (§24).
- Critères d’ouverture commerciale (§24).
