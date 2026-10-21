# Cahier des charges consolidé — Application web apiculteur

Dernière mise à jour : 21 octobre 2026 (cases relues une à une contre le code le 15 octobre, après les lots 0 à 10 et 13, la revue de sécurité et le logo ; audit de sécurité du 21 octobre). État de chaque lot : `ROADMAP.md` ; recette : `docs/etat-v1.md`.

Ce document est **la liste de référence de tout ce qu’il y a à construire**. Il réunit trois sources :

1. **CDC** — le cahier initial de `Readme.md` (30 sections), qui décrit le métier de l’apiculteur.
2. **Maquette** — la maquette Figma (6 écrans : accueil, nos essaims, à propos, avis, FAQ, contact).
3. **Kayart** — le dépôt [NicolasCHANTEUX/Kayart](https://github.com/NicolasCHANTEUX/Kayart) (état au commit `e8deddb`, « amélioration facture pdf »). Il vend des pièces en carbone (kayak), mais ses fonctionnalités et ses garde-fous sont repris ici, transposés à l’apiculture.

Le plan d’attaque (lots, ordre, état de chaque lot) est dans `ROADMAP.md`, établi **à partir de ce document**.

---

## 0. Mode d’emploi

### Légende

- `[x]` : présent dans le code. Cela ne veut pas dire « validé en conditions réelles » (voir §1.1).
- `[ ]` : à faire. *(partiel : …)* précise ce qui existe déjà.
- Origine, en fin de ligne :
  - **(CDC)** : demandé dans le cahier initial ;
  - **(Kayart)** : repris de Kayart ;
  - **(Maquette)** : visible dans la maquette ;
  - **(Apicole)** : adaptation au métier proposée ici, **à valider avec l’apiculteur** avant de la développer.

### Règles de mise à jour

- Cocher une ligne seulement quand le code est livré **et** testé.
- Noter la recette réelle (vrai compte, vrai paiement, vrai email) dans `docs/etat-v1.md` (§25), pas ici.
- Une décision prise au §26 se reporte dans la section concernée, puis on retire la question.

---

## 1. Consignes générales (s’appliquent à tout le projet)

### 1.1 Méthode

- [ ] Lire le guide Next.js embarqué (`node_modules/next/dist/docs/`) avant d’écrire du code Next : la version 16 a des changements incompatibles (voir `AGENTS.md`).
- [x] « Implémenté » n’est pas « validé ». Tenir un état qui distingue code livré, recette faite et recette en attente. — `docs/etat-v1.md`. (Kayart)
- [x] Aucune donnée inventée en production : pas de faux avis, de faux tarifs, de fausse identité légale. Le mode démo n’existe qu’en développement. (Kayart)
- [ ] Identité légale, SIRET, taux de TVA, mentions fiscales, tarifs de livraison, adresse de retrait : uniquement des valeurs **fournies et validées** par l’apiculteur ou son comptable. Aucune valeur par défaut « pour essayer ». (Kayart)
- [ ] Le contenu de la maquette (Marc Dupont, 06 12 34 56 78, photos, « 200 colonies », « 8 races », réponses de FAQ) est provisoire. Il doit être signalé comme tel et remplacé avant ouverture. (Maquette)
- [ ] Secrets uniquement dans les variables d’environnement : jamais dans Git, un rapport, une capture ou une conversation. (Kayart)
- [ ] Ouverture progressive par interrupteurs désactivés par défaut : commandes, paiement, facturation, pages légales, indexation, ventes manuelles, tâches planifiées (annexe A). *(partiel : demandes de commande fermées par défaut, affichage des avis masqué par défaut, pages légales bloquées sans approbation, tâche quotidienne protégée par un secret ; ventes manuelles sans interrupteur, réservées à l’admin ; indexation (lot 15), facturation (lot 11) et paiement (lot 17) à venir)* (Kayart)
- [x] Toute action destructrice demande une confirmation. Préférer archiver ou mettre à la corbeille plutôt que supprimer. — dialogues de confirmation dans l’admin ; produits archivés, demandes mises à la corbeille ; panier vidé après confirmation. (Kayart)
- [ ] Textes en français, ton humain et rassurant, jamais froid ou technique. (CDC 21)

### 1.2 Architecture et données

- [x] Stack conservée : Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), migrations SQL versionnées dans `supabase/migrations`, Tailwind v4. Kayart utilise Prisma : **on reprend ses principes, pas son code**.
- [x] Accès aux données isolé dans une couche serveur (`src/data`, `server-only`). Le public lit des vues minimales (`public_catalog_products`, `public_reviews`).
- [x] RLS activée sur toutes les tables ; les écritures admin passent par `is_admin()`.
- [ ] Aucun brouillon, stock interne ou token ne doit être sérialisé vers le navigateur (HTML ou réponse RSC). (Kayart)
- [ ] Montants en centimes. Prix, paliers, remises, livraison et totaux **recalculés côté serveur**, jamais acceptés du navigateur. *(partiel : tout est recalculé par le serveur à l’envoi d’une demande, et les calculs du code se font en centimes ; les prix restent stockés en euros à deux décimales en base)* (Kayart, ROADMAP)
- [x] Toute écriture sur plusieurs tables passe par une transaction (client, commande, lignes, stock, historique). — fonctions SQL : `submit_order_request`, `admin_accept_order`, `admin_cancel_order`, propositions, ventes manuelles, `admin_forget_customer`. (Kayart)
- [ ] Idempotence : clé de soumission unique par formulaire, clé de tentative et empreinte du contenu pour la commande. Un double clic ou un rechargement renvoie le même résultat. *(partiel : clé de soumission sur la commande, les demandes clients et les ventes manuelles ; pas d’empreinte du contenu)* (Kayart)
- [x] Contrôle de conflit optimiste (`updated_at`) sur les modifications admin. En cas de conflit : « Cette demande a changé, rechargez la page ». — produits, commandes, propositions, demandes, avis. (Kayart)
- [ ] Schéma modifié uniquement par migration, appliquée après sauvegarde et vérification de la cible. Jamais de modification manuelle en production, jamais de seed sur une base réelle. (Kayart)
- [ ] Connexion applicative avec un rôle Postgres dédié, sans `BYPASSRLS` ; connexion de migration séparée. (Kayart)

### 1.3 Qualité minimale de chaque livraison

- [ ] Lint, types, tests et build réussis avant chaque livraison. (Kayart)
- [ ] Toute règle métier a ses tests unitaires (prix, livraison, validation manuelle, stock, factures, avis, sécurité). (Kayart)
- [ ] Recette visuelle à 320, 390, 768 et 1 440 px, sans débordement horizontal. (Kayart)
- [ ] Accessibilité : navigation au clavier, focus visible, Échap ferme menus et dialogues, cibles d’au moins 44 px. (Kayart)

---

## 2. État actuel du projet (15 octobre 2026)

| Domaine | État |
| --- | --- |
| Livré dans le code | Lots 0 à 10 et 13 : socle et sécurité, accès admin avec double authentification, catalogue géré par l’admin, panier, demande de commande, traitement des commandes (propositions, ventes manuelles), emails, demandes clients, avis, légal et fiches clients, livraison et distance, catalogue public avancé. Revue de sécurité du 15 octobre et audit du 21 octobre. Logo, icônes et manifest. |
| Entamé | Lot 15 (`noindex` des pages privées, données structurées de la FAQ, manifest), lot 16 (tendances et dernières actions au tableau de bord), lot 18 (CI, tâche quotidienne). |
| Pas commencé | Lots 11 (factures et devis), 12 (réservations et liste d’attente), 14 (contenus et paramètres modifiables), 17 (paiement en ligne). |
| À valider en conditions réelles | Voir `docs/etat-v1.md` : fournisseur d’emails, informations légales, adresse de l’exploitation et tarifs, projet Supabase à réactiver puis migration `20261021100000_order_terms.sql` à confirmer, « Secure password change » à activer, contenus réels. |
| Mode démo | Données de la maquette en développement sans Supabase ; seed aligné. |

---

## 3. Correspondance Kayart → Apiculteur

| Dans Kayart | Équivalent apiculteur | Décision |
| --- | --- | --- |
| Types neuf / imparfait / occasion / service | Essaims, reines, matériel neuf, matériel d’occasion ou de second choix, prestations | Adapter (liste exacte au §26) |
| Produit imparfait lié à son modèle, avec défauts et photos | Matériel « second choix » (défaut d’aspect) lié au modèle neuf | Adapter, si du matériel est vendu |
| Caractéristiques libres (libellé, valeur, unité) | Race, nombre de cadres, type de ruche, année et marquage de la reine… | Reprendre |
| Mode de transport par produit (expédiable, retrait, devis) | Indispensable pour le vivant : essaims en retrait ou livraison organisée | Reprendre |
| Zones de livraison (pays, préfixes postaux, tarif) | Zones, complétées par les règles de distance et de quantité du CDC | Reprendre et étendre |
| Retrait gratuit à l’atelier sur rendez-vous | Retrait sur l’exploitation sur rendez-vous | Reprendre |
| Panier navigateur, calcul serveur, problèmes par ligne | Idem, plus paliers dégressifs et seuils de validation | Reprendre et étendre |
| Paiement Stripe test : réservation de stock, webhook, réconciliation | Paiement en ligne optionnel ; après validation pour les grosses commandes | Reprendre selon la décision paiement |
| Ventes manuelles hors Stripe | Ventes sur un marché, au retrait, par virement | Reprendre |
| Suivi préparation → prête ou expédiée → terminée | Statuts de livraison du CDC | Reprendre |
| Facturation : numérotation, données figées, PDF, archive privée | Factures (CDC 11), plus devis et envoi par email | Reprendre et étendre |
| Demande de réparation avec photos privées | Signalement / récupération d’essaim (photos, lieu) | Adapter, à valider |
| Demande sur mesure | Demande de devis grande quantité ou professionnel | Adapter |
| Contact enregistré, avec protections anti-abus | Contact | Reprendre |
| Admin des demandes : statuts, corbeille, conflits | Idem | Reprendre |
| Auth Supabase, rôle lié à l’identifiant Auth | Admin (table `admin_users` existante) | Reprendre |
| Inscription et récupération de mot de passe client | Compte client (CDC 18, optionnel) | À décider |
| Journal (modèle seulement) | Journal du rucher, actualités de saison | Adapter (option) |
| Alertes de stock (modèle seulement) | « Prévenez-moi » à l’ouverture de la saison | Adapter, forte valeur saisonnière |
| Réservations (modèle seulement) | Réservations de saison | Adapter (CDC 3) |
| Journal d’audit (partiel) | Historique des commandes, journal des actions admin | Reprendre et terminer |
| Pages légales bloquées sans approbation | Idem | Reprendre |
| Indexation gardée, sitemap, robots | Idem | Reprendre |
| Manifest PWA, en-têtes de sécurité, limitation de débit | Idem | Reprendre |
| Recette HTTP isolée, tests navigateur, CI | Idem | Reprendre |
| Catalogue de démonstration | Mode démo de développement | Déjà fait |
| Carrousel des produits mis en avant, galerie avec zoom | Accueil et fiche produit | Reprendre |
| Fond photo persistant entre pages | Propre à l’identité KayArt | Non applicable |
| — (absent de Kayart) | Avis clients, validation quantité × distance, prix dégressifs, CMS | Spécifique Apiculteur (CDC) |

---

## 4. Site public : pages, navigation, mise en page

- [x] Accueil de la maquette : hero, bandeau de confiance, à propos, essaims disponibles, parcours en 4 étapes, témoignages, appel au contact. (Maquette, CDC 1)
- [x] Pages Nos essaims, À propos, Avis clients, FAQ, Contact, fiche produit, 404. (Maquette, CDC 2)
- [x] Pages Panier, Commande, Confirmation de commande. (CDC 2, Kayart)
- [x] Pages Connexion, Mot de passe oublié, Nouveau mot de passe, Accès refusé. Pas d’inscription publique (H6 du plan). (Kayart)
- [x] Mentions légales, CGV, Confidentialité réelles (§19). — générées depuis les informations légales, en 404 tant qu’aucune version n’est approuvée. (CDC 2)
- [ ] Pages de services, selon décision (§12) : récupération d’essaim, devis professionnel, accompagnement. (Kayart, Apicole)
- [ ] Journal ou actualités, selon décision (§18). (Kayart, CDC 24)
- [x] Navigation principale avec page active et menu mobile. (Maquette)
- [x] Compteur d’articles du panier dans l’en-tête, synchronisé entre onglets. — par l’événement `storage`. (Kayart)
- [ ] Lien « Administration » visible uniquement pour un administrateur connecté. (Kayart)
- [x] Pied de page : navigation, informations, contact, réseaux. (Maquette)
- [x] Liens légaux du pied de page affichés seulement quand les pages légales sont approuvées. (Kayart)
- [ ] Bandeau d’information administrable (ex. « Saison 2026 ouverte »). *(partiel : texte fixé dans `src/lib/site.ts`)* (CDC 16, Maquette)
- [x] Carrousel des produits mis en avant sur l’accueil au-delà de 4 produits : boutons précédent/suivant, défilement automatique coupé si `prefers-reduced-motion`. — sans défilement automatique ; un seul produit est mis en valeur, une rangée incomplète se termine par l’accès au catalogue. (Kayart)
- [ ] Indicateur de chargement entre pages et écran `loading` par route. *(partiel : écran de chargement de l’admin ; pas sur les pages publiques, qui doivent rester utilisables sans JavaScript, le catalogue compris)* (Kayart)
- [x] Page d’erreur globale avec bouton « Réessayer » (public et admin). (Kayart)
- [ ] Remplacer tous les contenus provisoires de la maquette par les vrais (§1.1). (Maquette)

---

## 5. Catalogue public et fiche produit

### 5.1 Liste (« Nos essaims » / boutique)

- [x] Produits publiés lus depuis la vue publique, cartes de la maquette : badge, pastille de disponibilité, « à partir de », unité, note moyenne. (Maquette)
- [x] Recherche et filtres par catégorie et disponibilité, côté navigateur. (Maquette)
- [x] Recherche, filtres et tri **côté serveur, portés par l’URL** : formulaire GET partageable qui fonctionne sans JavaScript. — calculés par le serveur à chaque requête (quelques dizaines de produits, en mémoire) ; avec JavaScript, recherche pendant la frappe et tri immédiat sans rechargement ; tri par nom ajouté ; « type de produit » = catégories et accès rapides (H11). (Kayart)
  - recherche multi-mots, insensible à la casse et aux accents, sur nom, référence, descriptions, catégorie et caractéristiques ;
  - filtres : catégorie, type de produit, « disponible maintenant » ;
  - tri : nouveautés, prix croissant, prix décroissant, nom ;
  - pagination (12 par page) et compteur de résultats ;
  - critères actifs affichés, retirables un par un, et bouton « Tout effacer » ;
  - filtres repliables sur mobile ; toute modification revient à la page 1.
- [x] Accès rapides : Tout, Disponibles maintenant, Sur réservation, Matériel d’occasion. — affichés seulement s’ils filtrent quelque chose. (Kayart, adapté)
- [x] Page ou URL par catégorie (`/catalogue?categorie=…`). (CDC 2-3)
- [x] Ligne « race · particularité » sous le nom, comme sur la maquette, alimentée par les caractéristiques (§6). (Maquette)

### 5.2 Fiche produit

- [x] Photo, pastille de disponibilité, prix et paliers, descriptions, avis du produit. (CDC 3)
- [x] Fil d’Ariane Accueil / Nos essaims / Produit. — avec la catégorie. (Kayart)
- [x] Galerie multi-photos : miniatures, précédent/suivant, flèches du clavier, plein écran, zoom (pincement, double-clic), réinitialisation du zoom. — plus double tap, molette, boutons + et −, touches + − 0, déplacement de la photo agrandie. (Kayart)
- [x] Badges : type, disponibilité, stock affiché, remise « -X % ». — deux badges sur la photo (état, mise en avant, rareté, saison), pastille de disponibilité ou de stock, remise à côté du prix, catégorie. (Kayart)
- [x] Bloc d’informations : référence, type, disponibilité, stock (selon le mode d’affichage), mode de transport. — type (catégorie et état), stock quand le mode « exact » est choisi. (Kayart)
- [x] Caractéristiques structurées (§6). (Kayart, CDC 3)
- [x] Action principale adaptée au cas : Ajouter au panier, Réserver, Demander un devis, Demander la disponibilité, Me prévenir. — « Réserver » pour les produits de saison (par le panier, en attendant le lot 12), « Me prévenir de l’ouverture » ou « du retour », « Poser une question » pour la disponibilité. (Kayart)
- [x] « Poser une question » ouvre le contact pré-rempli avec le produit et sa référence. (Kayart)
- [x] Aide sous le prix : TTC ou HT selon le régime, « prix dégressifs selon la quantité », « sur devis », « prix d’une pièce unique ». — mention de TVA tirée des informations légales publiées (franchise : art. 293 B du CGI ; assujetti : TTC), rien sans version publiée. (Kayart)
- [ ] Matériel d’occasion ou de second choix : description des défauts, photos des défauts, lien vers le modèle neuf. *(partiel : défauts décrits ; photos dédiées et lien vers le modèle à venir)* (Kayart, Apicole)
- [x] Visibilité vérifiée à chaque requête : jamais de cache d’un produit masqué ou épuisé. — catalogue et fiche rendus à chaque requête, sans mise en cache. (Kayart)
- [ ] Référencement : titre, description, URL canonique, image de partage. *(partiel : titre et description SEO du produit ; URL canonique et image de partage au lot 15)* (Kayart, CDC 24)

---

## 6. Produits, catégories, prix et stock

### 6.1 Modèle produit

- [x] Nom, slug, descriptions courte et longue, prix de base, visibilité du prix (affiché, masqué, sur demande). (CDC 3-5)
- [x] Mode d’achat (standard, réservation, devis) ; statut (brouillon, publié, masqué, épuisé) ; mis en avant ; ordre d’affichage ; titre et description SEO. (CDC 3)
- [x] Stock réel, seuil bas, mode d’affichage du stock (masqué, exact, libellé, message personnalisé). (CDC 6)
- [x] Paliers de prix dégressifs, sans chevauchement possible (contrainte en base). (CDC 5)
- [x] Référence (SKU) unique. (Kayart)
- [ ] Type de produit : essaim, reine, ruche/ruchette, matériel, prestation (liste au §26). *(partiel : géré par les catégories modifiables, hypothèse H11)* (Kayart, adapté)
- [x] État : neuf, occasion, second choix, avec description des défauts. (Kayart)
- [x] Prix barré et remise en pourcentage, affichés « -X % », seulement à côté du prix de base. Le prix de référence d’une réduction doit être le plus bas pratiqué dans les 30 jours précédents (Code de la consommation, à respecter lors de la saisie). (Kayart, CDC 5)
- [x] Caractéristiques structurées (libellé, valeur, unité, ordre). Exemples : race, nombre de cadres, type de ruche (Dadant, Langstroth…), année et marquage de la reine, traitements, période de disponibilité. (Kayart, Apicole)
- [x] Poids et dimensions pour le matériel. — via les caractéristiques. (Kayart)
- [x] Mode de transport par produit : retrait uniquement, livrable, transport sur devis. Valeur par défaut prudente : sur devis. (Kayart)
- [ ] Indicateurs « réservable » et « personnalisable ». *(partiel : le mode d’achat couvre réservation et devis)* (Kayart)
- [x] Unité de vente explicite (essaim, reine, pièce, lot de N), plutôt que déduite de la catégorie comme aujourd’hui. (Apicole)
- [ ] Saisonnalité : période de disponibilité (ex. avril–juin) et date d’ouverture des réservations. *(partiel : période affichée ; date d’ouverture des réservations au lot 12)* (Apicole)
- [ ] Quantité maximale commandable automatiquement ; au-delà, validation manuelle (§8.2). *(partiel : seuil de quantité global, réglable dans Livraison, au-delà duquel la demande est signalée « à étudier » ; pas de maximum par produit)* (CDC 8)
- [x] Date de publication, pour le tri « nouveautés ». (Kayart)
- [x] Archivage (masqué, historique conservé) ou suppression définitive, refusée s’il existe des commandes, réservations ou paiements en cours. — suppression réservée aux brouillons et produits archivés, refusée si le produit figure dans une commande (réservations et paiements : à vérifier quand leurs tables existeront). (Kayart)

### 6.2 Images produit

- [x] Plusieurs images par produit, avec ordre et texte alternatif (en base). (CDC 3)
- [x] Envoi depuis l’admin : jusqu’à 6 images, glisser-déposer, choix de la couverture, ordre, rotation de 90°, retrait. — sélection multiple (le champ accepte aussi le dépôt de fichiers). (Kayart)
- [x] Contrôles : JPG, PNG, WebP ou GIF fixe, 4 Mo au maximum ; décodage puis réencodage en WebP côté serveur (2 400 px max) ; GIF et WebP animés refusés. — en place avec 8 Mo par photo, 2 000 px, sans EXIF ni GPS. (Kayart)
- [x] Stockage dans un bucket Supabase dédié ; reçu d’envoi signé (HMAC), lié à l’admin et valable une heure. — envoi uniquement par le serveur (aucune URL d’envoi exposée au navigateur, donc pas de reçu nécessaire). (Kayart)
- [ ] Purge des images orphelines et politique de conservation. *(partiel : fichiers supprimés avec la photo ; purge des orphelins à venir)* (Kayart)

### 6.3 Catégories

- [x] Nom, slug, description, image, ordre, actif (en base). (CDC 4)
- [x] Gestion admin : création, modification, ordre, activation, suppression seulement si la catégorie est vide. (Kayart, CDC 4)
- [ ] Sous-catégories (catégorie parente), en option. (Kayart)
- [ ] Catégories de départ : Essaims, Reines, Ruches, Matériel, puis Services et Formations si besoin. *(partiel : présentes dans le seed de développement ; à créer dans l’admin sur la base réelle)* (CDC 4)

### 6.4 Stock

- [x] Ajustement rapide depuis la liste admin (+1, -1, saisie directe). (Kayart)
- [ ] Stock limité à 1 pour une pièce unique (occasion, second choix). (Kayart)
- [ ] Décrément atomique (mise à jour conditionnelle) à la confirmation de la commande. Réservation temporaire pendant un paiement en ligne. *(partiel : décompte atomique à l’acceptation par l’admin et à l’enregistrement d’une vente manuelle ; réservation pendant un paiement au lot 17)* (Kayart)
- [ ] Moment exact de la réservation et du décrément (demande, validation ou paiement) : voir §26. *(partiel : hypothèse H3 appliquée, décompte à l’acceptation)* (ROADMAP)
- [ ] Alerte de stock faible : tableau de bord et email à l’admin. *(partiel : tableau de bord ; pas encore d’email)* (CDC 6)
- [ ] Filtre admin par niveau de stock : rupture, faible, disponible, sur commande, prestation. *(partiel : rupture, faible, disponible ; un produit sur réservation ou sur devis n’est jamais « en rupture »)* (Kayart)

---

## 7. Panier

- [x] Ajout au panier depuis la fiche, avec choix de la quantité et confirmation visuelle. — palier appliqué surligné, total en direct, barre d’achat fixe sur mobile. (Kayart, CDC 7)
- [x] Panier conservé dans le navigateur : **identifiants et quantités uniquement**, jamais de nom, d’email ou d’adresse. (Kayart)
- [ ] Calcul du panier par le serveur à chaque changement : prix unitaire selon le palier, total par ligne, sous-total. *(partiel : prix et disponibilités relus par le serveur à chaque visite du panier, paliers calculés dans le navigateur avec les règles partagées ; recalcul complet par le serveur à l’envoi de la demande)* (Kayart, CDC 5-7)
- [ ] Problème signalé par ligne : produit indisponible, sur devis, stock insuffisant (avec « ramener au maximum »), produit retiré du catalogue (affiché sans révéler un produit privé). *(partiel : produit retiré ou indisponible, prix à confirmer ; quantité plafonnée au stock affiché ; pas de « ramener au maximum »)* (Kayart)
- [x] Sous-total partiel clairement présenté ; passage en commande bloqué tant qu’un problème subsiste. — produits au prix à confirmer comptés à part ; envoi bloqué tant qu’un produit est indisponible. (Kayart)
- [x] Incitation aux paliers : « Encore 2 essaims pour passer à 150 € l’unité ». — sur la fiche et par ligne du panier, en un clic. (Apicole, CDC 5)
- [ ] Estimation de réception : retrait gratuit sur rendez-vous, ou livraison selon pays, code postal et distance (§9). *(partiel : estimation sur la page de commande dès le code postal saisi, distance vérifiée à l’envoi ; pas encore dans le panier)* Choix gardé pour la session. (Kayart, CDC 7)
- [ ] Message préventif quand le panier dépassera un seuil de validation manuelle. (CDC 8)
- [ ] Par ligne : visuel, référence, état, lien vers la fiche, quantité modifiable, retrait. *(partiel : tout sauf la référence et l’état)* (Kayart, CDC 7)
- [x] Vider le panier (avec confirmation), actualiser, message si le stockage du navigateur est indisponible. — en attendant la commande (lot 4), « Envoyer ma demande » pré-remplit le contact avec le contenu du panier. (Kayart)

---

## 8. Commande et validation des grosses commandes

### 8.1 Passage de commande

- [ ] Page `/commande` séparée du panier. *(partiel : tout sauf une adresse de facturation distincte, prévue avec les factures)* (Kayart, CDC 7)
  - coordonnées : nom, email, téléphone ;
  - adresses de facturation et de livraison ;
  - identifiant professionnel facultatif (SIRET, numéro de TVA) ;
  - retrait ou livraison, date souhaitée ;
  - message libre ;
  - récapitulatif.
- [x] Accusé d’information sur les données et acceptation des CGV. — case obligatoire dès que les CGV sont publiées ; version acceptée enregistrée sur la commande ; envoi bloqué si les CGV ne peuvent pas être lues, et refus par la base de toute demande sans la version en vigueur. (Kayart, §19)
- [x] Recalcul complet par le serveur à l’envoi ; refus si le panier a changé dans un autre onglet. (Kayart)
- [x] Création atomique du client, de la commande et des lignes, avec copie figée du nom, de la référence et du prix, plus une entrée d’historique. — fonction `submit_order_request` ; coordonnées figées dans la commande, fiche client jamais écrasée. (Kayart, ROADMAP)
- [ ] Protection contre la double soumission : clé de tentative et empreinte. Une reprise renvoie la même commande. *(partiel : clé de tentative, sans empreinte du contenu)* (Kayart)
- [x] Numéro de commande lisible (`CMD-000001`), généré en base. (CDC)
- [ ] Page de confirmation : numéro, récapitulatif, prochaines étapes. Elle n’annonce jamais un paiement non vérifié par le serveur. *(partiel : numéro et prochaines étapes, sans récapitulatif)* (Kayart, CDC 7)
- [x] Retrait du panier des articles commandés, après confirmation par le serveur. (Kayart)
- [ ] Interrupteur global « commandes ouvertes / fermées » (hors saison), avec message personnalisé. *(partiel : interrupteur dans Commandes, fermé par défaut ; sans message personnalisé)* (CDC 19)

### 8.2 Validation spéciale (quantité × distance)

- [x] Seuils en base (`app_settings`) : distance et quantité automatiques, seuils de validation manuelle, délai de demande d’avis. (CDC 19-20)
- [x] Moteur de règles lisant ces seuils, sans valeur codée en dur. — quantité et distance (éloignée, très longue), produits « retrait obligatoire » ou « sur devis », adresse non localisée ; seuils réglables dans Livraison. (CDC 8, 20)
  - quantité seule, distance seule ou combinaison ;
  - produits « retrait obligatoire » ou « livraison impossible automatiquement » ;
  - message personnalisé par règle.
- [x] Calcul de la distance entre l’adresse du client et l’adresse de départ. Service de géocodage à choisir (§26). — Géoplateforme de l’IGN (Base Adresse Nationale), ancienne API en secours, repli sur la commune ; distance à vol d’oiseau (H5). (CDC 8-9)
- [x] Statuts de validation : non requise, en attente, acceptée, refusée, modification proposée. — `proposed` ajouté au lot 5. (CDC 8)
- [x] Message client préventif et pédagogique, sans blocage brutal : la commande devient une « demande à valider ». — toute commande est une demande étudiée (H2). (CDC 8)
- [x] Admin : accepter, refuser, proposer une alternative (quantité, date, retrait), message personnalisé, email au client, historique de la décision. — proposition de modification (produits, quantités, prix, retrait ou livraison, date, message) ; le client accepte ou décline par un lien sécurisé ; l’admin peut l’appliquer après un accord par téléphone, ou la retirer ; emails et historique. (CDC 8)
- [x] Aucun paiement demandé avant la validation. (CDC 12)

---

## 9. Livraison et retrait

- [x] Retrait sur l’exploitation, gratuit, sur rendez-vous. Adresse affichée seulement si elle est validée, jamais une adresse fictive. — adresse publique, communiquée à l’acceptation ou au cas par cas, au choix ; consignes de retrait. (Kayart, CDC 9)
- [ ] Rendez-vous de retrait : simple date souhaitée ou vrais créneaux (§26). (CDC 9, Apicole)
- [x] Zones de livraison administrables : pays (codes ISO), préfixes postaux inclus et exclus, tarif TTC. Une zone ne s’active qu’avec un tarif strictement positif. — plus distance maximale et supplément par unité ; contrainte aussi en base. (Kayart)
- [x] Zone de départ « France métropolitaine », désactivée et sans tarif ; Corse et outre-mer exclus ; ces cas restent sur devis. (Kayart)
- [x] Frais selon la distance et/ou la quantité. — zones limitées en distance, supplément par unité ; frais modifiables par l’admin avant paiement. (CDC 9)
- [x] Livraison proposée automatiquement seulement si **tous** les articles sont livrables et qu’une zone active correspond ; sinon retrait ou « demander un devis de transport ». (Kayart)
- [x] Aucun seuil de livraison gratuite sans décision explicite. (Kayart)
- [ ] Contraintes du vivant à définir avec l’apiculteur : transport des essaims (ruchettes, délais, météo), éventuel envoi postal des reines. *(partiel : texte « Transport des essaims » réglable, affiché sur la page Livraison ; règles à définir)* (Apicole)
- [ ] Livraisons groupées par tournée ou par région, selon décision. (Apicole)
- [ ] Note admin liée à la livraison. *(partiel : note interne de la commande, sans note propre à la livraison)* (CDC 9)
- [x] Statuts : à préparer, prête (retrait) ou expédiée (livraison), livrée ou terminée, annulée. — email « en route » à l’expédition. (CDC 9, Kayart)

---

## 10. Paiement

- [ ] Modes possibles, à arbitrer au §26 : après validation, virement, à la récupération, sur facture, carte en ligne. (CDC 12)
- [x] Paiement hors ligne enregistré par l’admin (« marquer payé », avec date et moyen de paiement). — fiche commande et ventes manuelles (lot 5). (Kayart, CDC 10)
- [ ] Paiement en ligne par Stripe Checkout (page hébergée). Mode test seulement au départ ; **le code refuse les clés réelles** tant que le mode réel n’est pas développé et validé. (Kayart)
- [ ] Lien de paiement envoyé après une validation manuelle. (CDC 12)
- [ ] Réservation du stock pendant la session de paiement (1 h), libérée seulement sur expiration ou échec confirmés par Stripe. (Kayart)
- [ ] Webhook Stripe signé : événements dédupliqués, montant, devise et empreinte vérifiés ; clé d’idempotence à la création de session. (Kayart)
- [ ] Réconciliation périodique des tentatives en attente (tâche planifiée protégée par un secret), et annulation par le client. (Kayart)
- [ ] Commandes de test identifiées, exclues de la comptabilité et des factures. (Kayart)
- [ ] Acompte sur les réservations de saison, selon décision. (Apicole)
- [ ] Remboursements (total ou partiel) et avoirs, selon décision. Absents de Kayart. (Kayart)
- [ ] Statuts de paiement : non payé, en attente, payé, échec, remboursé, annulé. *(partiel : « échec » absent du schéma)* (CDC 12, Kayart)

---

## 11. Réservations de saison et liste d’attente

- [ ] Produits sur réservation : le client réserve une quantité pour la saison. Statuts : nouvelle, acceptée, refusée, expirée, convertie en commande, annulée. (Kayart, CDC 3)
- [ ] Conversion d’une réservation en commande quand les essaims sont prêts, avec email au client. (Apicole)
- [ ] Ouverture et fermeture des réservations par produit, avec dates. (Apicole)
- [ ] « Prévenez-moi » (Kayart, modèle seulement là-bas) :
  - inscription par email à la disponibilité d’un produit ;
  - lien de désinscription ;
  - envoi unique, puis suivi.

---

## 12. Demandes clients

### 12.1 Formulaires publics

- [x] Contact qui ouvre la messagerie du visiteur, sans enregistrement. — gardé comme repli tant que la base des demandes n’est pas prête. (Maquette)
- [x] Demandes enregistrées en base, avec accusé de réception à l’écran. — table `contact_requests`, référence « DEM-000042 », page `/contact/merci`. (Kayart)
- [ ] Types de demandes, à valider : *(partiel : contact, devis et signalement d’essaim ; la visite de rucher n’est pas proposée)* (Kayart, Apicole)
  - **Contact** ;
  - **Devis grande quantité ou professionnel** (adapté de « sur mesure ») : nombre, race, période, lieu, budget indicatif ;
  - **Signalement ou récupération d’essaim** (adapté de « réparation ») : lieu, hauteur, depuis quand, photos ;
  - **Accompagnement ou visite de rucher** (option).
- [x] Champs communs : nom, email, téléphone facultatif, sujet, message de 20 caractères minimum. Produit et référence pré-remplis depuis une fiche. — téléphone obligatoire pour un essaim ; quantité pré-remplie pour un devis. (Kayart)
- [x] Photos jointes : 3 au maximum, 5 Mo chacune. Réencodées en WebP, stockées dans un bucket **privé** (vérifié non public avant tout envoi), visibles seulement par l’admin via une route protégée. — réduites dans le navigateur avant l’envoi ; position GPS jamais conservée. (Kayart)
- [x] Anti-abus : champ piège invisible, limitation de débit persistante (identifiant haché par HMAC), clé de soumission unique, taille de requête bornée. (Kayart)
- [x] Information sur l’usage des données et case obligatoire. — date du consentement enregistrée. (Kayart, CDC 23)
- [x] Formulaire désactivé proprement si le stockage n’est pas configuré, avec repli vers l’email. — sans bucket privé, demandes sans photos. (Kayart)
- [x] Email de confirmation au client et notification à l’admin. (CDC 14)

### 12.2 Traitement admin (§17.7)

- [x] Onglets par type de demande, filtre par statut (nouvelle, en cours, réponse envoyée, clôturée), pagination, aperçu, page de détail. — onglets par état, filtre par type, recherche. (Kayart)
- [x] Email et téléphone cliquables ; photos ouvertes en grand. (Kayart)
- [x] Changement de statut avec contrôle de conflit. (Kayart)
- [x] Corbeille (suppression douce) et restauration avec les photos. — suppression définitive depuis la corbeille seulement, fichiers compris. (Kayart)
- [x] Répondre au client depuis l’admin. Absent de Kayart, où un changement de statut n’envoie rien. — réponse signée, message d’origine cité, passage en « réponse envoyée ». (CDC 10)
- [ ] Transformer une demande de devis en devis ou en commande. (CDC 11, Apicole)

---

## 13. Avis clients

- [x] Schéma : avis lié à une commande et à un produit, note de 1 à 5, commentaire, statut, réponse admin, mise en avant, consentement, token d’accès avec expiration. (CDC 13)
- [x] Affichage public des avis validés uniquement : page Avis (note moyenne, répartition par étoiles), section d’accueil, avis sur la fiche produit, mention « client vérifié ». (CDC 13, Maquette)
- [x] Email de demande d’avis X jours après livraison ou retrait (paramètre `review_request_delay_days`). — délai réglable dans l’admin (ou désactivé), tâche quotidienne `/api/cron/quotidien` (vercel.json, `CRON_SECRET`), envoi manuel depuis la fiche commande ou la rubrique Avis. (CDC 13)
- [x] Page de dépôt via lien unique sécurisé : — `/mon-avis/<jeton>`, nom proposé « Claire M. », accord de publication non coché par défaut. (CDC 13, 22)
  - token, expiration à 30 jours, un seul avis par commande ;
  - note, commentaire, consentement à l’affichage, nom affiché (prénom et initiale).
- [x] Lecture et écriture via le token uniquement par une route serveur dédiée ; le token n’est jamais exposé par l’API publique. — seule l’empreinte SHA-256 est en base, illisible même par l’admin ; dépôt par la fonction `submit_review` (clé serveur). (CDC 13)
- [x] Modération admin : en attente, affiché, masqué, refusé ; réponse publique, mise en avant, anonymisation ; avis refusés conservés. (CDC 13)
- [x] Notification admin pour chaque nouvel avis ; email de remerciement au client. (CDC 14)
- [x] Affichage des avis sur le site choisi depuis l’admin, **masqué par défaut** : page Avis, lien du menu et du pied de page, section de l’accueil, notes du catalogue et des fiches, lien de la FAQ. Confirmation qui rappelle que seuls de vrais avis peuvent être montrés. (Demande de l’apiculteur, 14 oct.)

---

## 14. Emails et notifications

- [ ] Choisir le fournisseur (Resend, Brevo, Postmark…) et authentifier le domaine d’envoi (SPF, DKIM, DMARC) ; expéditeur et adresse de réponse configurables. Non configuré dans Kayart. *(partiel : pilotes Brevo et Resend prêts, expéditeur, réponse et alertes réglables par variables d’environnement ; choix du fournisseur et authentification du domaine à faire)* (CDC 14)
- [ ] Modèles (CDC 14) : création de commande, réception de demande, validation, refus, proposition alternative, devis, facture, paiement confirmé, livraison ou retrait, demande d’avis, remerciement, nouvelle commande (admin), nouvel avis (admin). *(partiel : réception de demande, acceptation (avec message de l’apiculteur), refus, annulation, commande prête, commande expédiée, paiement reçu, nouvelle demande (admin), demande d’avis, remerciement, nouvel avis (admin), messages et réponses des demandes clients, proposition de modification, réponse à une proposition (admin), récapitulatif de vente manuelle ; devis et facture avec le lot 11)*
- [ ] Modèles supplémentaires : réservation reçue, réservation acceptée, « c’est disponible » (liste d’attente), lien de paiement. (Apicole, Kayart)
- [x] File d’envoi avec reprise en cas d’échec ; journal des emails (destinataire, modèle, date, statut), sans contenu sensible dans les logs. — table `email_outbox`, envoi après la réponse, nouvel essai automatique des échecs récents ou à la demande ; rubrique Emails avec aperçu ; sans fournisseur, emails ouverts tout rédigés dans la messagerie puis marqués envoyés. (CDC 14, Kayart)
- [ ] Modèles modifiables par l’admin, avec variables. (CDC 14)
- [ ] Emails d’authentification (confirmation, réinitialisation) via Supabase Auth, personnalisés et distincts des emails métier. (Kayart)
- [x] Ton humain, signé par l’apiculteur. (CDC 21)

---

## 15. Factures et devis

- [ ] Émission depuis la fiche commande, uniquement si la commande est éligible : (Kayart)
  - commande réelle (pas de test), payée, avec date de paiement ;
  - ni annulée, ni remboursée ;
  - coordonnées de facturation complètes et totaux cohérents.
- [ ] Numérotation continue par année, `FA-AAAA-NNNNNN`, réservée dans la même transaction que la copie figée. Un seul numéro par commande ; un rollback ne consomme pas de numéro. (Kayart)
- [ ] Copie figée du vendeur, de l’acheteur, des lignes, des taxes et du paiement, protégée par un verrou d’immutabilité en base (trigger). (Kayart)
- [ ] PDF : (Kayart, CDC 11)
  - en-tête « FACTURE » ou « FACTURE ACQUITTÉE » ;
  - facturé à, livré à, détail des produits ;
  - HT, TVA et TTC, ou mention de franchise ;
  - remises et livraison en lignes ;
  - mode et date de paiement ;
  - mentions légales sur plusieurs pages si nécessaire.
- [ ] Stockage dans un bucket privé, empreinte SHA-256 du PDF, statut d’archivage (en cours, prêt, échec), reprise sans nouveau numéro, téléchargement réservé à l’admin. (Kayart)
- [ ] Régime fiscal configurable (franchise, ou TVA avec taux). Cas agricole : valeurs à valider avec le comptable. (Kayart, Apicole)
- [ ] Facturation désactivée tant que la configuration légale et fiscale n’est pas complète et approuvée. (Kayart)
- [ ] Envoi de la facture par email, avec lien de téléchargement sécurisé ; historique des documents envoyés. (CDC 11)
- [ ] Devis PDF numérotés : envoi, acceptation, transformation en commande puis en facture. (CDC 11)
- [ ] Avoirs pour les corrections et remboursements. Absents de Kayart. (Kayart)
- [ ] Conservation 10 ans, même si le client est supprimé ; sauvegardes. (Kayart)
- [ ] Facturation électronique (réforme française) : obligations de réception et d’émission selon la taille de l’entreprise, à vérifier avec le comptable. Un PDF seul ne suffit pas. (Kayart)

---

## 16. Comptes et authentification

- [x] Connexion admin par email et mot de passe (Supabase Auth). Cookies gérés par `@supabase/ssr`, session renouvelée par le proxy ; déconnexion. (Kayart, CDC 15)
- [x] Table `admin_users` liée à l’identifiant Auth, et fonction `is_admin()`. (CDC 22)
- [x] Rôle admin déterminé **uniquement** par ce lien vérifié auprès de Supabase : jamais par l’email ni par une revendication du JWT, et aucune promotion automatique. (Kayart)
- [x] Garde admin dans chaque page, action et lecture serveur (`requireAdmin`), pas seulement dans la mise en page `/admin`. (Kayart)
- [x] Page de refus explicite pour un compte connecté non admin, avec l’identité et un bouton de déconnexion. (Kayart)
- [x] Redirection après connexion limitée aux chemins internes. (Kayart)
- [x] Mot de passe oublié et nouveau mot de passe (lien par email, route `/auth/confirm`). — avec une application d’authentification associée, code exigé avant le changement (page et action, en plus de Supabase Auth) ; session de plus de 24 h refusée (`secure_password_change`). (Kayart, CDC 18 ; audit du 21/10/2026)
- [x] Limitation de débit : connexion (8 essais / 15 min par IP et email, 30 par IP), récupération (5 / heure). (Kayart)
- [x] Script d’accès admin : vérification en lecture seule, création de compte, octroi et retrait des droits (`npm run admin`). — plus `mfa-reset` (téléphone perdu). (Kayart)
- [x] Double authentification obligatoire pour les administrateurs (code à usage unique, TOTP) : configurée à la première connexion, demandée à chaque connexion ; exigée par la base (`is_admin()` demande une session aal2), pas seulement par l’application ; sans la fonction `admin_access_state`, accès refusé (plus de repli sur l’ancien contrôle). (Revue de sécurité du 15/10/2026, audit du 21/10/2026)
- [x] Mots de passe : 12 caractères au moins, avec lettres et chiffres (application et Supabase Auth). (Revue de sécurité du 15/10/2026)
- [ ] Plusieurs rôles admin (gérant, aide), en option. (CDC 22)
- [ ] Compte client (CDC 18), selon décision : inscription, connexion, tableau de bord, historique, factures, suivi, avis. En V1, recommandation : pas de compte, liens sécurisés envoyés par email.

---

## 17. Administration

### 17.1 Socle

- [ ] Espace `/admin` protégé et non indexé. Navigation : Tableau de bord, Produits, Commandes, Demandes, Avis, Clients, Livraison et réglages, Factures, Contenus, Paramètres, « Voir le site ». *(partiel : espace non indexé ; Tableau de bord, Commandes, Demandes, Produits, Catégories, Emails, Avis, Clients, Livraison, Informations légales et « Voir le site » ; Paramètres annoncé (lot 14) ; Factures (lot 11) et Contenus (lot 14) à venir)* (Kayart, CDC 15)
- [x] Message de succès ou d’erreur après chaque action ; boutons « en cours » désactivés pendant l’envoi. — notifications ; une erreur prévue n’affiche plus la page d’erreur. (Kayart)
- [x] Dialogues de confirmation pour les actions destructrices ; menus d’actions par ligne (clavier, Échap, clic extérieur). (Kayart)
- [x] Administration utilisable sur téléphone : navigation compacte, tableaux transformés en cartes lisibles. — tiroir de navigation, liste produits en cartes, sans débordement à 320 et 390 px. (Kayart, CDC 25)

### 17.2 Tableau de bord

- [x] Compteurs : produits, commandes à traiter, commandes à valider, demandes nouvelles, avis en attente, produits en stock faible. — dans le bandeau d’accueil, les tuiles et « À faire ». (CDC 15, Kayart)
- [ ] Dernières commandes, derniers avis, chiffre d’affaires estimé. *(partiel : dernières commandes, chiffre d’affaires sur 7, 30 ou 90 jours, note moyenne et avis à modérer ; pas de liste des derniers avis)* (CDC 15, 26)
- [x] État de la mise en service : configuration présente ou à faire, fonctions à venir avec leur lot. (Kayart)

### 17.3 Produits

- [ ] Liste : miniature, nom, référence, catégorie, type, statut, prix, stock ; recherche par nom ou référence ; filtres catégorie, type et niveau de stock ; pagination. *(partiel : pas de pagination, inutile à l’échelle du catalogue ; pas de filtre « type », géré par les catégories)* (Kayart)
- [x] Actions par ligne : modifier, ajuster le stock, masquer ou afficher, archiver, supprimer définitivement (si possible), dupliquer (option). — la copie reprend paliers, caractéristiques et photos, en brouillon et sans référence. (Kayart)
- [x] Formulaire en sections : identité, présentation, vente et disponibilité, prix et paliers, stock et caractéristiques, transport, images, options. Slug automatique ; saisie conservée en cas d’erreur. (Kayart, CDC 5)
- [x] Éditeur de paliers de prix, avec contrôle des chevauchements avant envoi. (CDC 5)
- [ ] Création d’un produit d’occasion ou de second choix à partir d’un modèle (défauts, photos, prix). (Kayart)
- [x] Gestion des catégories (§6.3). (Kayart)

### 17.4 Commandes

- [ ] Liste : numéro, date, type (en ligne, manuelle, test), client, nombre d’articles, total, statuts de commande, de paiement et de validation ; recherche par numéro, nom ou email ; filtres ; pagination. *(partiel : onglets par état, recherche, type « Vente manuelle » ; sans pagination ni commandes de test)* (Kayart, CDC 10)
- [ ] Détail : *(partiel : tout sauf la TVA et la facture, lot 11)* (Kayart, CDC 10)
  - lignes, montants (HT et TVA une fois facturée), paiement ;
  - client, adresses, livraison, distance, date souhaitée ;
  - note interne, facture, historique chronologique.
- [ ] Actions : *(partiel : valider (stock décompté), refuser, proposer une modification, marquer payée, préparation, annuler (stock rendu), contacter le client, demande d’avis ; à venir : facture ; modification d’une commande déjà acceptée, avant paiement)* (CDC 10, Kayart)
  - valider, refuser ou proposer une alternative (§8.2) ;
  - avant paiement : modifier quantité, prix, remise ;
  - marquer payée, faire avancer la préparation ;
  - annuler (la commande reste dans l’historique) ;
  - émettre la facture, contacter le client, déclencher la demande d’avis.
- [x] Ventes manuelles hors ligne (marché, retrait, virement) : produits, quantités, client, adresse de facturation, identifiant pro, note ; « marquer payée » ; annuler. Derrière un interrupteur ; effet sur le stock à décider (§26). — page « Nouvelle vente » : client existant ou de passage, identifiant pro, produits, sur place ou livraison, étape, payée ou non, note, récapitulatif par email. Stock décompté à l’enregistrement (comme H3) ; sans interrupteur, la page étant réservée à l’admin. Adresse de facturation distincte avec les factures (lot 11), comme au §8.1. (Kayart)

### 17.5 Avis — §13

### 17.6 Clients (CDC 17)

- [ ] Liste et recherche ; fiche avec coordonnées, commandes, avis, factures et note interne. *(partiel : tout sauf les factures, lot 11 ; demandes de contact du client en plus)* (CDC 17)
- [x] Modification ; suppression ou anonymisation, en conservant les factures. — suppression sans commande, anonymisation sinon (commandes conservées), export JSON des données. (CDC 17, Kayart)

### 17.7 Demandes — §12.2

### 17.8 Livraison et réglages

- [x] Zones de livraison, conditions de retrait, adresse de départ. — rubrique Livraison, avec les seuils d’attention. (Kayart, CDC 9)

### 17.9 Paramètres (CDC 19)

- [ ] Seuils et règles (`app_settings`), coordonnées, réseaux sociaux, horaires ou périodes, ouverture des commandes, bannière, délai de demande d’avis. *(partiel : seuils dans Livraison, ouverture des demandes dans Commandes, délai de demande d’avis et affichage des avis dans Avis, durées de conservation réglables ; coordonnées, réseaux sociaux, horaires et bannière au lot 14)* (CDC 19)

### 17.10 Factures

- [ ] Liste des factures et devis : numéro, client, montant, statut d’archivage, téléchargement. (CDC 11, 15)

### 17.11 Statistiques (CDC 26)

- [ ] Commandes (totales, en attente, validées, refusées), chiffre d’affaires estimé, produits les plus demandés, quantités vendues, avis et note moyenne, stock faible, demandes à valider, emails envoyés, factures générées. *(partiel, au tableau de bord : commandes et chiffre d’affaires par jour ou par semaine sur 7, 30 ou 90 jours avec variation, note moyenne, stock faible et valeur du stock, répartition par catégorie, complétude des fiches)* (CDC 26)

### 17.12 Journal d’audit

- [ ] Chaque action admin enregistrée (qui, quoi, quand, sur quel objet, ancienne et nouvelle valeur) et consultable. L’historique de commande s’affiche à partir de ce journal. *(partiel : table `audit_logs`, `recordAudit`, dernières actions au tableau de bord ; anciennes et nouvelles valeurs non enregistrées)* (Kayart, CDC 22)

---

## 18. Contenus éditoriaux et CMS

- [ ] Accueil modifiable : titre, texte, image, boutons, sections (ajouter, supprimer, réordonner). (CDC 16)
- [ ] Pages À propos et Contact modifiables ; textes de réassurance ; galerie photo. (CDC 16)
- [ ] FAQ administrable (questions, réponses, ordre). *(partiel : en dur, réponses à valider)* (Maquette)
- [ ] Bandeau d’information (ex. « Réservations ouvertes pour la saison 2026 »). (CDC 16)
- [ ] Journal du rucher, selon décision : (Kayart, CDC 24)
  - articles avec titre, slug, extrait, contenu, image de couverture, brouillon ou publié, date ;
  - liste et page article ;
  - ajout au sitemap une fois validé.
- [ ] Pages de services (si retenues) : guide « préparer votre demande » et étapes 01-02-03, comme Kayart. (Kayart)

---

## 19. Légal, données personnelles et réglementation

- [x] Configuration légale centralisée : — rubrique « Informations légales », brouillon et versions approuvées. (Kayart)
  - raison sociale, forme, adresse, immatriculation, mention fiscale ;
  - directeur de publication, médiateur de la consommation, hébergeur ;
  - CGV standard et CGV des réservations ou commandes spéciales ;
  - base légale, durées de conservation et destinataires des données ;
  - version.
- [x] Valeurs de remplissage (maquette) détectées, et approbation explicite exigée. Sinon : pages légales en 404, absentes du pied de page et du sitemap. — SIRET contrôlé, textes « [À faire valider] » bloquants ; liens retirés des formulaires aussi (sitemap au lot 15). (Kayart)
- [x] Mentions légales, CGV et Politique de confidentialité générées depuis cette configuration. — numéro de version et date d’entrée en vigueur ; aperçu du brouillon dans l’admin. (Kayart, CDC 2)
- [ ] CGV distinctes pour les produits standards et pour les réservations ou commandes spéciales. Droit de rétractation pour des animaux vivants : à faire valider. *(partiel : conditions particulières des réservations dans un article dédié ; rétractation et garanties proposées « à faire valider » et bloquantes jusqu’à relecture)* (Kayart, Apicole)
- [x] Médiateur de la consommation pour la vente aux particuliers. — champ obligatoire, repris dans les CGV. (Kayart)
- [x] Information sur les données et case d’accusé sur chaque formulaire. — contact, commande (avec les CGV), avis. (Kayart, CDC 23)
- [x] Pas de traceurs non essentiels sans consentement ; bandeau cookies seulement si nécessaire. — aucun traceur : pas de bandeau ; expliqué dans la politique de confidentialité. (CDC 23)
- [x] Droits RGPD : export, suppression ou anonymisation d’un client, anonymisation d’un avis, durées de conservation, purges planifiées. — durées réglables, purge par la tâche quotidienne `/api/cron/quotidien` ou à la demande. (CDC 23)
- [ ] Email client jamais affiché publiquement. *(partiel : la vue des avis n’expose ni email ni token)* (CDC 23)
- [ ] Réglementation apicole à vérifier auprès des organismes compétents, sans rien affirmer avant validation : numéro d’apiculteur, déclaration des ruchers, documents sanitaires pour la cession et le transport d’essaims. (Apicole)

---

## 20. Sécurité

- [x] RLS sur toutes les tables ; vues publiques sans stock interne ni token. (CDC 22)
- [x] Clé `service_role` utilisée uniquement côté serveur. (CDC 22)
- [x] Vérification de l’origine : faite nativement par Next pour les Server Actions ; utilitaire `assertSameOriginRequest` pour les routes POST. (Kayart)
- [ ] Validation serveur systématique : types, longueurs, formats, UUID, énumérations. (Kayart, CDC 22)
- [x] Limitation de débit persistante : connexion, inscription, récupération, formulaires, avis, commande. — connexion, double authentification, récupération, contact, commande, dépôt d’avis, réponse aux propositions ; pas d’inscription publique. (Kayart, ROADMAP)
- [x] Taille des requêtes bornée, et limite de taille des actions serveur. — 16 Mo (actions et proxy) ; photos produit envoyées une par une. (Kayart)
- [x] En-têtes : (Kayart)
  - CSP sans `unsafe-eval` en production, scripts autorisés par un nonce propre à chaque requête (plus de `unsafe-inline` pour les scripts) ;
  - HSTS, `X-Frame-Options: DENY`, `nosniff` ;
  - Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy.
- [x] Fichiers envoyés : décodés et réencodés ; type, extension et taille contrôlés ; buckets privés vérifiés avant tout envoi. — photos produit et photos des demandes réencodées en WebP ; bucket privé des demandes vérifié avant chaque envoi. (Kayart, CDC 22)
- [ ] Accès aux factures et photos privées réservé à l’admin, via des routes contrôlées. *(partiel : photos des demandes, jamais mises en cache ; factures au lot 11)* (CDC 22, Kayart)
- [ ] Aucun token ni donnée client dans le HTML, les logs ou les rapports. (Kayart)
- [ ] Journal d’audit (§17.12). *(partiel : table et écriture ; dernières actions au tableau de bord ; consultation complète au lot 16)* (CDC 22)
- [ ] Sauvegardes, et restauration testée. (CDC 22, Kayart)
- [ ] Audit régulier des dépendances (`npm audit`, épinglage des versions sensibles). *(partiel : versions épinglées ; 15/10/2026 : Next 16.4.1 et sharp 0.35.5 (avis GHSA-p3m5-59mp-jv5r et GHSA-2464-fhr4-w9xw), aucune vulnérabilité en production ; reste un avis sur `braces`, outil de lint seulement ; 21/10/2026 : `npm audit --omit=dev` dans la CI, Dependabot chaque semaine (versions publiées depuis 7 jours au moins), CodeQL ; premier passage sur GitHub à constater)* (Kayart)

---

## 21. Référencement, partage et PWA

- [ ] Indexation désactivée par défaut. Activation explicite par un interrupteur, un domaine HTTPS canonique et des données réelles ; les aperçus de déploiement restent exclus. (Kayart)
- [ ] `robots.txt` et `sitemap.xml` soumis à cette activation. Sitemap : pages publiques et produits publiés (slug et date de modification) ; pages légales seulement si approuvées ; journal une fois validé. (Kayart, CDC 24)
- [x] `noindex` sur l’admin, la connexion, le panier, la commande et la confirmation. — aussi les étapes de connexion, les confirmations et les liens personnels (avis, propositions). (Kayart)
- [ ] Métadonnées par page et par produit (image de partage, URL canonique) ; URL du site normalisée. *(partiel : titre et description par page et par produit ; adresse du site normalisée (`NEXT_PUBLIC_SITE_URL`) ; image de partage et URL canonique à faire)* (Kayart, CDC 24)
- [ ] Titres et descriptions SEO modifiables. *(partiel : champs SEO des produits en base)* (CDC 24)
- [ ] Données structurées (Product, Offer, LocalBusiness ; AggregateRating seulement avec de vrais avis), produites à partir de données validées. *(partiel : FAQPage sur la FAQ, réponses encore à valider)* (Kayart)
- [x] Images optimisées (`next/image`, WebP) et textes alternatifs. *(partiel : photos du site uniquement)* (CDC 24)
- [x] Manifest PWA : nom, icône, couleurs. — `app/manifest.ts` ; logo « rayon en construction » (`src/lib/logo.ts`), favicon réduit à trois alvéoles, icône Apple et icônes du manifest produites par `npm run icons`. (Kayart)

---

## 22. Expérience, accessibilité et responsive

- [x] Site public responsive, vérifié à 390 et 1 440 px ; menu mobile. (CDC 25)
- [x] Lien « Aller au contenu », focus placé sur le contenu principal. — site public et administration. (Kayart)
- [x] Échap ferme le menu mobile et les dialogues, puis rend le focus. — site public et administration. (Kayart)
- [x] Respect de `prefers-reduced-motion`. — animations soumises à `motion-safe` ou `prefers-reduced-motion: no-preference`. (Kayart)
- [ ] Formulaires : erreur affichée sous chaque champ (`aria-invalid`, `aria-describedby`), valeurs conservées après une erreur, bouton « envoi en cours ». *(partiel : formulaires de contact, de commande, d’avis, de produit, de vente manuelle et d’informations légales ; pas les formulaires de connexion)* (Kayart)
- [ ] Champs d’au moins 16 px sur mobile (pas de zoom automatique sur iOS) ; cibles d’au moins 44 px. *(partiel : champs en 16 px sur mobile ; quelques boutons à 40 px, comme les − et + du panier)* (Kayart)
- [ ] Recette à 320, 390, 768 et 1 440 px, en public comme en admin. (Kayart, CDC 25)
- [x] Recherche et filtres utilisables sans JavaScript. — vérifié sur la compilation de production, JavaScript coupé ; l’écran de chargement du catalogue a été retiré, car il bloquait la page sans JavaScript. (Kayart)

---

## 23. Qualité, tests et intégration continue

- [x] Tests unitaires `node:test` (prix dégressifs, notes) ; lint ESLint ; vérification des types par le build.
- [x] Scripts `typecheck` (avec `next typegen`) et `verify` (lint, tests, types, build). (Kayart)
- [ ] Tests unitaires à ajouter : validation manuelle, zones de livraison, problèmes de panier, idempotence de commande, stock, factures (numérotation, éligibilité, PDF), avis par token, contrôle d’origine, limitation de débit, refus d’accès admin. *(partiel : 24 fichiers, 135 tests, dont raisons d’attention, zones et frais, avis par lien, origine, clé de limitation, double authentification (dont le changement de mot de passe) ; idempotence et stock vérifiés par des contrôles SQL sur PGlite, hors de la suite ; restent les problèmes de panier et les factures)* (Kayart, CDC)
- [ ] Recette HTTP sur un build de production isolé, avec données fictives et faux service d’authentification local. (Kayart)
- [ ] Recette navigateur automatisée (Chrome headless) des parcours publics, panier, commande et admin, à plusieurs largeurs. (Kayart)
- [ ] CI GitHub Actions à chaque push et pull request : installation, lint, tests, types, recette du build. *(partiel : lint, tests, types, build, audit des dépendances de production ; CodeQL à part ; recette HTTP au lot 18)* (Kayart)
- [ ] Preuves de recette datées, stockées hors Git. (Kayart)

---

## 24. Exploitation et déploiement

- [ ] Hébergement de l’application et projet Supabase de production (§26). Environnements séparés : développement, recette, production. La base de recette Stripe doit être isolée, car le mode test réserve du stock. (Kayart)
- [x] Toutes les variables documentées dans `.env.example` (annexe A). — toutes celles que lit le code actuel, commentées. (Kayart)
- [ ] Migrations appliquées par la CLI après sauvegarde ; jamais de seed sur une base réelle. (Kayart)
- [ ] Scripts de contrôle en lecture seule (`--check`) et d’application explicite (`--apply`) : buckets, accès admin, durcissement de la base, stockage des factures. *(partiel : `npm run admin -- check` pour l’accès admin)* (Kayart)
- [ ] Tâches planifiées protégées par un secret : *(partiel : `/api/cron/quotidien`, protégée par `CRON_SECRET` : demandes d’avis et purges ; paiements et liste d’attente à venir)* (Kayart, CDC 13)
  - réconciliation des paiements ;
  - demandes d’avis ;
  - liste d’attente ;
  - purge des limites de débit et des données expirées.
- [ ] Domaine, HTTPS, DNS des emails, suivi des erreurs, alertes, procédure d’incident. (Kayart)
- [ ] Ouverture par étapes : (Kayart)
  1. catalogue ;
  2. demandes ;
  3. commandes sans paiement en ligne ;
  4. paiement test ;
  5. paiement réel.
- [ ] Critères d’ouverture commerciale : (Kayart)
  - bon compte admin vérifié ;
  - produits réels complets (photos, prix, stock, transport) ;
  - parcours de commande et de paiement recettés ;
  - informations légales validées ;
  - recette finale sur le site déployé.

---

## 25. Documentation à maintenir

- [x] `docs/etat-v1.md` : pour chaque domaine, code livré, recette faite, ce qui reste à valider. (Kayart)
- [ ] Guides : architecture, base de données, sécurité, déploiement, paiement, facturation, emails, référencement, recette. (Kayart)
- [x] `.env.example` complet et commenté. (Kayart)
- [x] Ce cahier à jour (cases cochées, décisions reportées). — relu contre le code le 15 octobre 2026.
- [x] `ROADMAP.md` remplacé par le plan d’attaque.

---

## 26. Décisions à prendre avec l’apiculteur

1. **Vocabulaire et gamme** : essaim sur combien de cadres, ruchette, colonie, reine, lot ? Vend-il aussi du miel, du matériel, des ruches ?
2. **Types de produits et prestations** : occasion, second choix, récupération d’essaim, formation, accompagnement, parrainage de ruche ?
3. **Commande en V1** : demande sans paiement (validation, puis paiement hors ligne), ou paiement en ligne immédiat pour les petites commandes ?
4. **Stock** : réservé à la demande, à la validation ou au paiement ? Les ventes manuelles le décrémentent-elles ?
5. **Réservations de saison** : avec ou sans acompte ? Quand les convertir en commandes ?
6. **Livraison** : qui transporte les essaims, comment, jusqu’où ? Tarifs par distance, quantité ou tournée ? Envoi postal des reines ?
7. **Retrait** : adresse publique ou communiquée après la commande ? Date souhaitée ou vrais créneaux ?
8. **Distance** : quel service de géocodage (adresse → coordonnées) ? Distance à vol d’oiseau ou par la route ?
9. **Moyens de paiement** acceptés ; compte Stripe au nom de l’activité ?
10. **Statut juridique et fiscal** (régime agricole, TVA ou franchise) et mentions obligatoires, à valider avec le comptable.
11. **Compte client** en V1 ou plus tard ? (Recommandation : plus tard.)
12. **Emails** : fournisseur, domaine d’envoi, adresse de réponse, signature.
13. **Hébergement et nom de domaine.**
14. **Contenus réels** : nom de l’exploitation, photos, histoire, chiffres, réponses de la FAQ, premiers vrais avis.
15. **Plusieurs administrateurs** ou un seul ?
16. **Réglementation** : obligations sanitaires et documents pour la vente et le transport d’essaims.

---

## 27. Hors périmètre ou plus tard

- Application mobile native ; mode hors ligne et notifications push de la PWA (absents de Kayart).
- Facturation électronique structurée (Factur-X, plateforme agréée), si les obligations l’exigent : chantier distinct.
- Codes promotionnels et programme de fidélité (non demandés).
- Configurateur de produit (absent de Kayart).
- Multilingue.
- Marketplace multi-vendeurs.

---

## Annexe A — Variables d’environnement prévues

En place (documentées dans `.env.example`) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `RATE_LIMIT_SECRET`, `TRUSTED_PROXY_HOPS`, `CRON_SECRET`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAIL`.

Proposées au départ, et ce qu’elles sont devenues :

| Variable | Rôle | État |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Origine HTTPS du site (canonique, emails, retours de paiement) | En place |
| `ORDERING_ENABLED` | Ouvre ou ferme les commandes (complète le réglage admin) | Non retenu : interrupteur « demandes en ligne » dans l’admin |
| `CHECKOUT_MODE` | `disabled`, `test` ou `live` (`live` refusé tant que non développé) | Lot 17 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement en ligne | Lot 17 |
| `CRON_SECRET` | Protection des tâches planifiées | En place |
| `RATE_LIMIT_SECRET` | Hachage HMAC des identifiants de limitation de débit | En place (à défaut, secret dérivé) |
| `IMAGE_RECEIPT_SECRET` | Signature des reçus d’envoi d’images | Non retenu : photos envoyées par le serveur uniquement (§6.2) |
| `PRODUCT_IMAGES_BUCKET` | Bucket public des photos produit | Non retenu : nom fixe (`product-images`) |
| `REQUEST_IMAGES_BUCKET` | Bucket privé des photos de demandes | Non retenu : nom fixe (`request-photos`) |
| `INVOICES_BUCKET` | Bucket privé des factures | Lot 11 |
| `INVOICING_ENABLED`, `INVOICE_*` | Facturation : SIRET, régime, numéro et taux de TVA, conditions de paiement, mentions | Lot 11 |
| `LEGAL_APPROVED`, `LEGAL_*` | Identité légale et textes, avec approbation explicite | Non retenu : informations légales saisies et approuvées dans l’admin (lot 9) |
| `INDEXING_ENABLED` | Ouverture aux moteurs de recherche | Lot 15 |
| `MANUAL_ORDERS_ENABLED` | Ventes manuelles | Non retenu (lot 5) : réservées à l’admin, sans interrupteur |
| `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAIL` | Emails | En place, avec `EMAIL_PROVIDER` (`brevo` ou `resend`) |
| `GEOCODING_API_KEY` | Calcul de distance, si un service externe est retenu | Non nécessaire : Géoplateforme de l’IGN, sans clé |

Règle : ce qui est **sensible ou légal** va dans l’environnement ; ce qui est **métier et ajustable** (seuils, délais, bannière, ouverture saisonnière) va dans `app_settings`, modifiable depuis l’admin.

## Annexe B — Statuts de référence

| Objet | Statuts | En base aujourd’hui |
| --- | --- | --- |
| Produit | brouillon, publié, masqué, épuisé, archivé | oui (`archived` ajouté avec l’admin du catalogue) |
| Commande (préparation) | en attente, en préparation, prête, expédiée, livrée ou terminée, annulée | oui (`pending` → `delivered`, `cancelled`) |
| Validation | non requise, en attente, acceptée, refusée, modification proposée | oui (`proposed` depuis le lot 5) |
| Paiement | non payé, en attente, payé, échec, remboursé, annulé | sans « échec » |
| Demande | nouvelle, en cours, réponse envoyée, clôturée, plus la corbeille | oui (`contact_requests` : `new` → `closed`, corbeille par `deleted_at`) |
| Avis | en attente, affiché, masqué, refusé | oui |
| Réservation | nouvelle, acceptée, refusée, expirée, convertie, annulée | table à créer |
| Facture (archivage) | en cours, prête, échec | table à créer |
