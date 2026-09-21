# Plan d'attaque — première version

## Objectif de la V1

Un visiteur peut consulter les produits, préparer un panier et envoyer une
demande de commande. L'apiculteur peut se connecter, consulter cette demande et
l'accepter ou la refuser. Le paiement en ligne, la facturation, les comptes
clients, le CMS complet et les avis automatiques viendront ensuite.

## Lot 1 — Catalogue public et fondations

- [x] Isoler l'accès Supabase dans une couche serveur.
- [x] Ne retourner aux pages que des données publiques minimales.
- [x] Masquer le stock interne et les tokens d'avis.
- [x] Ajouter le catalogue et les fiches produit.
- [x] Gérer les prix, les paliers et les différents états de disponibilité.
- [x] Ajouter des tests unitaires du calcul de prix.
- [ ] Appliquer les migrations à un projet Supabase et vérifier les données de
      démonstration.

## Lot 2 — Panier et règles métier

- [ ] Ajouter un panier local persistant.
- [ ] Calculer les totaux en centimes, sans faire confiance au navigateur.
- [ ] Gérer les produits standards, sur réservation et sur devis.
- [ ] Déterminer si une commande exige une validation manuelle.
- [ ] Tester les limites de quantité, de distance et de stock.

## Lot 3 — Création de commande

- [ ] Ajouter le formulaire client et le choix livraison/retrait.
- [ ] Valider toutes les données côté serveur.
- [ ] Recalculer les prix côté serveur.
- [ ] Créer client, commande et lignes dans une transaction atomique.
- [ ] Protéger contre les doubles soumissions.
- [ ] Gérer la réservation ou la décrémentation du stock.
- [ ] Afficher une confirmation avec un numéro de commande.

## Lot 4 — Administration minimale

- [ ] Ajouter la connexion administrateur et protéger `/admin`.
- [ ] Afficher la liste et le détail des commandes.
- [ ] Accepter, refuser et changer le statut d'une commande.
- [ ] Conserver un historique des décisions.
- [ ] Modifier simplement les produits et les stocks.

## Lot 5 — Notifications et mise en ligne

- [ ] Envoyer la confirmation au client.
- [ ] Notifier l'apiculteur d'une nouvelle commande.
- [ ] Envoyer les décisions d'acceptation ou de refus.
- [ ] Ajouter une limitation de débit aux formulaires publics.
- [ ] Tester le parcours complet et déployer une préproduction.

## Décisions métier à confirmer

- Le vocabulaire exact : essaim, ruche, ruchette, reine, lot, etc.
- Le moment où le stock est réservé ou décrémenté.
- Le fonctionnement initial des frais et distances de livraison.
- Les modes de paiement acceptés hors ligne.
- Les informations légales nécessaires aux futurs devis et factures.
