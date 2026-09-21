On part donc sur une **application web complète**, pas seulement un site vitrine.

Je vais utiliser le terme **“essaims / ruches”** dans la todo-list pour l’instant, mais il faudra clarifier plus tard le vocabulaire exact avec l’apiculteur : essaim, ruche, colonie, ruchette, reine, lot, etc.

Voici la **todo-list géante fonctionnelle — version 1**.

---

# Todo-list géante — Application web apiculteur

## 1. Identité générale du site

* [ ] Créer une page d’accueil chaleureuse, humaine et rassurante.
* [ ] Mettre en avant l’apiculteur, son histoire, son sérieux et son savoir-faire.
* [ ] Ajouter des photos réelles de l’exploitation, des abeilles, des ruches, du matériel ou de l’apiculteur.
* [ ] Prévoir des textes qui insistent sur la confiance, le relationnel et la proximité.
* [ ] Ajouter une section “Pourquoi me faire confiance ?”.
* [ ] Ajouter une section “Avis clients”.
* [ ] Ajouter une section “Produits / essaims disponibles”.
* [ ] Ajouter une section “Comment se déroule une commande ?”.
* [ ] Ajouter une section “Contact / demande personnalisée”.
* [ ] Prévoir une charte visuelle douce, naturelle et vivante : miel, nature, campagne, authenticité.

---

## 2. Pages publiques du site

* [ ] Page d’accueil.
* [ ] Page catalogue / produits.
* [ ] Page détail d’un produit.
* [ ] Page catégories.
* [ ] Page à propos de l’apiculteur.
* [ ] Page contact.
* [ ] Page avis clients.
* [ ] Page panier ou demande de commande.
* [ ] Page confirmation de commande ou de demande.
* [ ] Page conditions générales de vente.
* [ ] Page mentions légales.
* [ ] Page politique de confidentialité.
* [ ] Page FAQ.
* [ ] Page erreur 404 personnalisée.

---

## 3. Catalogue produits

* [ ] Afficher les produits disponibles.
* [ ] Afficher les produits par catégorie.
* [ ] Afficher une fiche détaillée par produit.
* [ ] Gérer les images des produits.
* [ ] Gérer une description courte.
* [ ] Gérer une description longue.
* [ ] Gérer les caractéristiques du produit.
* [ ] Gérer la disponibilité du produit.
* [ ] Gérer les produits mis en avant.
* [ ] Gérer les produits temporairement masqués.
* [ ] Gérer les produits épuisés.
* [ ] Gérer les produits disponibles uniquement sur réservation.
* [ ] Gérer les produits disponibles uniquement sur devis.
* [ ] Gérer plusieurs images par produit.
* [ ] Prévoir un ordre d’affichage des produits.
* [ ] Prévoir une recherche ou un filtre par catégorie.

---

## 4. Catégories

* [ ] Créer des catégories depuis l’administration.
* [ ] Modifier une catégorie.
* [ ] Supprimer ou désactiver une catégorie.
* [ ] Ajouter une image à une catégorie.
* [ ] Ajouter une description à une catégorie.
* [ ] Choisir l’ordre d’affichage des catégories.
* [ ] Associer un produit à une catégorie.
* [ ] Prévoir des catégories comme “Essaims”, “Reines”, “Ruches”, “Matériel”, “Services”, “Formations”, si nécessaire plus tard.

---

## 5. Gestion des prix et lots

* [ ] Définir un prix de base par produit.
* [ ] Gérer les prix dégressifs selon la quantité.
* [ ] Créer des règles de prix par palier.
* [ ] Exemple : de 1 à 4 unités, prix normal.
* [ ] Exemple : de 5 à 9 unités, réduction.
* [ ] Exemple : de 10 à 49 unités, réduction plus importante.
* [ ] Exemple : à partir de 50 unités, demande spéciale ou devis obligatoire.
* [ ] Gérer les produits dont le prix est affiché.
* [ ] Gérer les produits dont le prix est masqué.
* [ ] Gérer les produits avec mention “prix sur demande”.
* [ ] Gérer les remises automatiques.
* [ ] Gérer les remises manuelles appliquées par l’administrateur.
* [ ] Afficher clairement le prix estimé dans le panier.
* [ ] Afficher clairement quand une commande nécessite une validation manuelle.

---

## 6. Gestion des stocks

* [ ] Stocker le stock réel côté administration.
* [ ] Permettre à l’administrateur de modifier le stock.
* [ ] Permettre à l’administrateur de choisir si le stock est visible ou non.
* [ ] Mode d’affichage : stock masqué.
* [ ] Mode d’affichage : stock exact.
* [ ] Mode d’affichage : statut simple.
* [ ] Mode d’affichage : message personnalisé.
* [ ] Exemples de statuts : “Disponible”, “Sur réservation”, “Quantités limitées”, “Bientôt disponible”, “Épuisé”.
* [ ] Éviter d’afficher un stock fixe qui pourrait donner l’impression que le produit ne se vend pas.
* [ ] Permettre un message humain à la place du stock exact.
* [ ] Exemple : “Réservations ouvertes pour la saison”.
* [ ] Exemple : “Contactez-moi pour les grandes quantités”.
* [ ] Mettre à jour le stock après validation d’une commande.
* [ ] Prévoir une alerte admin quand un stock devient faible.

---

## 7. Panier / commande

* [ ] Ajouter un produit au panier.
* [ ] Modifier la quantité dans le panier.
* [ ] Supprimer un produit du panier.
* [ ] Calculer le total estimé.
* [ ] Appliquer les prix dégressifs automatiquement.
* [ ] Afficher les frais de livraison estimés, si possible.
* [ ] Afficher un message si la commande nécessite une validation.
* [ ] Demander les informations client.
* [ ] Demander l’adresse de livraison.
* [ ] Demander un numéro de téléphone.
* [ ] Demander une adresse email.
* [ ] Ajouter un champ message libre.
* [ ] Permettre au client de choisir livraison ou retrait, si applicable.
* [ ] Créer une commande en base de données.
* [ ] Envoyer un email de confirmation au client.
* [ ] Envoyer une notification à l’administrateur.
* [ ] Afficher une page de confirmation.

---

## 8. Validation spéciale des grosses commandes

C’est le nouveau point très important.

* [ ] Définir un seuil de quantité à partir duquel une commande devient sensible.
* [ ] Définir une distance maximale de livraison automatique.
* [ ] Calculer la distance entre l’adresse du client et l’adresse de l’apiculteur.
* [ ] Détecter les commandes qui dépassent les seuils.
* [ ] Exemple : petite quantité + longue distance = possible.
* [ ] Exemple : grosse quantité + courte distance = possible.
* [ ] Exemple : grosse quantité + longue distance = validation manuelle obligatoire.
* [ ] Afficher un message préventif au client.
* [ ] Ne pas bloquer brutalement la commande.
* [ ] Transformer la commande en “demande à valider”.
* [ ] Expliquer que l’apiculteur va étudier la faisabilité.
* [ ] Permettre à l’administrateur d’accepter la demande.
* [ ] Permettre à l’administrateur de refuser la demande.
* [ ] Permettre à l’administrateur de proposer une autre solution.
* [ ] Permettre à l’administrateur d’ajouter un message personnalisé au client.
* [ ] Envoyer un email au client quand la demande est acceptée.
* [ ] Envoyer un email au client quand la demande est refusée.
* [ ] Envoyer un email au client si une modification est proposée.
* [ ] Garder l’historique de la décision admin.

Exemple de message côté client :

> Votre commande concerne une quantité importante et une distance de livraison élevée.
> Afin de garantir une livraison sérieuse et adaptée, votre demande sera d’abord étudiée par l’apiculteur avant validation définitive.

---

## 9. Livraison

* [ ] Stocker l’adresse complète du client.
* [ ] Calculer ou estimer la distance.
* [ ] Gérer une adresse de départ côté administrateur.
* [ ] Gérer des zones de livraison.
* [ ] Gérer une distance maximale standard.
* [ ] Gérer des frais de livraison selon la distance.
* [ ] Gérer des frais de livraison selon la quantité.
* [ ] Gérer des exceptions pour certains produits.
* [ ] Gérer le retrait sur place.
* [ ] Gérer le cas “livraison impossible automatiquement”.
* [ ] Gérer le cas “livraison sur validation”.
* [ ] Gérer le cas “livraison personnalisée”.
* [ ] Prévoir une note admin liée à la livraison.
* [ ] Prévoir un statut de livraison : à préparer, prête, expédiée, livrée, annulée.
* [ ] Prévoir une date souhaitée de livraison ou de retrait.

---

## 10. Commandes côté administrateur

* [ ] Voir toutes les commandes.
* [ ] Filtrer les commandes par statut.
* [ ] Voir les nouvelles commandes.
* [ ] Voir les commandes en attente de validation.
* [ ] Voir les commandes acceptées.
* [ ] Voir les commandes refusées.
* [ ] Voir les commandes terminées.
* [ ] Voir le détail complet d’une commande.
* [ ] Modifier le statut d’une commande.
* [ ] Ajouter une note interne.
* [ ] Contacter le client.
* [ ] Valider une commande.
* [ ] Refuser une commande.
* [ ] Modifier une quantité.
* [ ] Modifier un prix.
* [ ] Ajouter une remise manuelle.
* [ ] Générer une facture.
* [ ] Envoyer la facture au client.
* [ ] Marquer une commande comme payée.
* [ ] Marquer une commande comme livrée.
* [ ] Déclencher l’envoi d’un email d’avis après commande.

---

## 11. Factures et documents

* [ ] Générer une facture PDF.
* [ ] Envoyer automatiquement la facture par email.
* [ ] Permettre à l’administrateur de télécharger la facture.
* [ ] Stocker les factures liées aux commandes.
* [ ] Numéroter les factures.
* [ ] Gérer les informations de l’entreprise.
* [ ] Gérer les informations du client.
* [ ] Gérer les lignes de facture.
* [ ] Gérer les quantités.
* [ ] Gérer les prix unitaires.
* [ ] Gérer les réductions.
* [ ] Gérer les frais de livraison.
* [ ] Gérer le total.
* [ ] Prévoir éventuellement des devis PDF.
* [ ] Transformer un devis accepté en facture.
* [ ] Envoyer un devis au client.
* [ ] Envoyer une facture au client.
* [ ] Garder l’historique des documents envoyés.

---

## 12. Paiement

À décider plus tard, mais à prévoir dans la structure.

* [ ] Paiement immédiat en ligne.
* [ ] Paiement après validation admin.
* [ ] Paiement sur facture.
* [ ] Paiement à la récupération.
* [ ] Paiement par virement.
* [ ] Paiement par carte bancaire, si intégration prévue.
* [ ] Statut de paiement : non payé, en attente, payé, remboursé, annulé.
* [ ] Ne pas demander de paiement immédiat si la commande nécessite une validation manuelle.
* [ ] Envoyer un lien de paiement après validation, si besoin.

---

## 13. Avis clients internes

Choix validé : **on implémente notre propre système d’avis après commande**.

* [ ] Envoyer un email au client après commande.
* [ ] Définir le délai d’envoi, par exemple 7 jours.
* [ ] Générer un lien unique sécurisé pour laisser un avis.
* [ ] Permettre au client de donner une note.
* [ ] Permettre au client de laisser un commentaire.
* [ ] Associer l’avis à une commande.
* [ ] Associer l’avis à un produit, si pertinent.
* [ ] Demander l’accord du client pour afficher son avis.
* [ ] Permettre à l’administrateur de valider ou refuser l’affichage.
* [ ] Permettre à l’administrateur de répondre publiquement.
* [ ] Afficher les avis validés sur le site.
* [ ] Afficher certains avis sur la page d’accueil.
* [ ] Afficher les avis sur les pages produits.
* [ ] Ajouter une mention “avis client vérifié”.
* [ ] Prévoir un statut : en attente, affiché, masqué, refusé.
* [ ] Prévoir une modération.
* [ ] Garder les avis refusés dans l’administration.
* [ ] Permettre de mettre un avis en avant.
* [ ] Permettre de masquer temporairement un avis.
* [ ] Prévoir une page publique dédiée aux avis.

---

## 14. Emails automatiques

* [ ] Email de création de commande.
* [ ] Email de confirmation de réception de demande.
* [ ] Email de validation de commande.
* [ ] Email de refus de commande.
* [ ] Email de proposition alternative.
* [ ] Email d’envoi de devis.
* [ ] Email d’envoi de facture.
* [ ] Email de confirmation de paiement.
* [ ] Email de confirmation de livraison ou retrait.
* [ ] Email de demande d’avis après commande.
* [ ] Email de remerciement après dépôt d’avis.
* [ ] Email de notification admin lors d’une nouvelle commande.
* [ ] Email de notification admin lors d’un nouvel avis.
* [ ] Permettre à l’admin de modifier les modèles d’emails.
* [ ] Gérer le nom de l’expéditeur.
* [ ] Gérer l’adresse email de réponse.
* [ ] Garder un historique des emails envoyés.

---

## 15. Administration générale

* [ ] Connexion administrateur.
* [ ] Déconnexion.
* [ ] Tableau de bord admin.
* [ ] Statistiques rapides.
* [ ] Nombre de commandes en attente.
* [ ] Nombre d’avis en attente.
* [ ] Produits bientôt épuisés.
* [ ] Dernières commandes.
* [ ] Derniers avis.
* [ ] Gestion des produits.
* [ ] Gestion des catégories.
* [ ] Gestion des commandes.
* [ ] Gestion des clients.
* [ ] Gestion des avis.
* [ ] Gestion des pages.
* [ ] Gestion des images.
* [ ] Gestion des emails.
* [ ] Gestion des factures.
* [ ] Gestion des paramètres du site.

---

## 16. Gestion du contenu du site

Objectif : l’administrateur doit pouvoir modifier le site sans développeur.

* [ ] Modifier le titre de la page d’accueil.
* [ ] Modifier le texte principal.
* [ ] Modifier l’image principale.
* [ ] Modifier les boutons d’appel à l’action.
* [ ] Modifier les sections de la page d’accueil.
* [ ] Ajouter une section.
* [ ] Supprimer une section.
* [ ] Réordonner les sections.
* [ ] Modifier la page à propos.
* [ ] Modifier la page contact.
* [ ] Modifier les textes de réassurance.
* [ ] Modifier les images.
* [ ] Gérer une galerie photo.
* [ ] Gérer une bannière d’information.
* [ ] Exemple : “Réservations ouvertes pour la saison 2026”.
* [ ] Exemple : “Livraisons disponibles sur demande”.
* [ ] Exemple : “Nouveaux essaims bientôt disponibles”.

---

## 17. Gestion des clients

* [ ] Enregistrer les clients ayant commandé.
* [ ] Voir la fiche d’un client.
* [ ] Voir l’historique des commandes d’un client.
* [ ] Voir les avis laissés par un client.
* [ ] Voir les factures liées à un client.
* [ ] Ajouter une note interne sur un client.
* [ ] Rechercher un client.
* [ ] Modifier les informations d’un client.
* [ ] Supprimer ou anonymiser un client si nécessaire.
* [ ] Prévoir éventuellement un compte client plus tard.

---

## 18. Compte client éventuel

Pas forcément obligatoire en première version, mais possible.

* [ ] Inscription client.
* [ ] Connexion client.
* [ ] Mot de passe oublié.
* [ ] Tableau de bord client.
* [ ] Historique des commandes.
* [ ] Téléchargement des factures.
* [ ] Suivi des commandes.
* [ ] Dépôt d’avis depuis le compte.
* [ ] Modification des informations personnelles.

Pour une première version, on peut très bien faire sans compte client, avec uniquement des liens email sécurisés.

---

## 19. Paramètres administrables

* [ ] Nom du site.
* [ ] Logo.
* [ ] Adresse de l’apiculteur.
* [ ] Email de contact.
* [ ] Téléphone.
* [ ] Adresse de départ pour les livraisons.
* [ ] Distance maximale de livraison automatique.
* [ ] Quantité maximale livrable automatiquement.
* [ ] Seuil de validation manuelle.
* [ ] Frais de livraison.
* [ ] Délai d’envoi de demande d’avis.
* [ ] Modèles d’emails.
* [ ] Informations légales.
* [ ] Réseaux sociaux.
* [ ] Horaires ou périodes de disponibilité.
* [ ] Activation ou désactivation temporaire des commandes.

---

## 20. Moteur de règles métier

C’est un point important pour éviter de coder les règles “en dur”.

* [ ] Créer des règles de prix.
* [ ] Créer des règles de stock.
* [ ] Créer des règles de livraison.
* [ ] Créer des règles de validation manuelle.
* [ ] Permettre à l’admin de modifier les seuils.
* [ ] Exemple : validation manuelle si quantité supérieure à 30.
* [ ] Exemple : validation manuelle si distance supérieure à 300 km.
* [ ] Exemple : validation manuelle si quantité supérieure à 20 et distance supérieure à 150 km.
* [ ] Exemple : livraison impossible automatiquement pour certains produits.
* [ ] Exemple : retrait obligatoire pour certains produits.
* [ ] Prévoir un message personnalisé par règle.

---

## 21. Expérience humaine et confiance

* [ ] Mettre en avant des avis clients.
* [ ] Ajouter les réponses de l’apiculteur aux avis.
* [ ] Ajouter une présentation personnelle.
* [ ] Ajouter des photos authentiques.
* [ ] Ajouter des textes rassurants.
* [ ] Expliquer clairement le déroulement d’une commande.
* [ ] Expliquer pourquoi certaines commandes doivent être validées manuellement.
* [ ] Éviter les messages trop froids ou trop techniques.
* [ ] Ajouter des phrases humaines dans les emails.
* [ ] Ajouter une page “L’histoire de l’apiculteur”.
* [ ] Ajouter une page ou section “Ma façon de travailler”.
* [ ] Ajouter une section “Questions fréquentes”.
* [ ] Afficher des informations actualisées.
* [ ] Permettre à l’admin de répondre publiquement aux clients.

---

## 22. Sécurité

* [ ] Sécuriser la connexion admin.
* [ ] Hasher les mots de passe.
* [ ] Protéger les formulaires contre les abus.
* [ ] Vérifier les données envoyées par les formulaires.
* [ ] Protéger les liens d’avis avec un token unique.
* [ ] Empêcher plusieurs avis pour la même commande, sauf choix contraire.
* [ ] Sécuriser l’accès aux factures.
* [ ] Protéger les fichiers envoyés.
* [ ] Gérer les droits administrateurs.
* [ ] Prévoir éventuellement plusieurs rôles admin.
* [ ] Sauvegarder les données.
* [ ] Prévoir des logs d’activité admin.

---

## 23. RGPD et données personnelles

* [ ] Afficher une politique de confidentialité.
* [ ] Demander le consentement pour afficher un avis.
* [ ] Ne pas afficher l’email du client publiquement.
* [ ] Permettre l’anonymisation d’un avis.
* [ ] Permettre la suppression ou anonymisation des données client.
* [ ] Informer le client de l’utilisation de ses données.
* [ ] Gérer les données liées aux commandes.
* [ ] Gérer les données liées aux avis.
* [ ] Gérer les données liées aux emails.
* [ ] Prévoir une durée de conservation des données.
* [ ] Sécuriser les exports et documents.

---

## 24. SEO et visibilité

* [ ] Modifier les titres SEO des pages.
* [ ] Modifier les descriptions SEO.
* [ ] Générer des URLs propres.
* [ ] Ajouter des textes descriptifs sur les produits.
* [ ] Optimiser les images.
* [ ] Ajouter des balises alt aux images.
* [ ] Créer une page contact claire.
* [ ] Créer une page avis clients.
* [ ] Créer une page à propos riche.
* [ ] Ajouter éventuellement des actualités ou articles.
* [ ] Prévoir un sitemap.
* [ ] Prévoir une bonne structure mobile.

---

## 25. Responsive design

* [ ] Maquette desktop.
* [ ] Maquette tablette.
* [ ] Maquette mobile.
* [ ] Menu mobile.
* [ ] Catalogue lisible sur téléphone.
* [ ] Panier utilisable sur téléphone.
* [ ] Formulaire de commande simple sur téléphone.
* [ ] Administration utilisable au minimum sur tablette ou desktop.
* [ ] Boutons suffisamment grands.
* [ ] Textes lisibles.
* [ ] Images optimisées.

---

## 26. Tableaux de bord et statistiques

* [ ] Nombre de commandes.
* [ ] Nombre de commandes en attente.
* [ ] Nombre de commandes validées.
* [ ] Nombre de commandes refusées.
* [ ] Chiffre d’affaires estimé.
* [ ] Produits les plus demandés.
* [ ] Quantités vendues.
* [ ] Avis reçus.
* [ ] Note moyenne.
* [ ] Produits avec stock faible.
* [ ] Demandes nécessitant validation.
* [ ] Emails envoyés.
* [ ] Factures générées.

---

## 27. Figma — écrans à maqueter

Pour la maquette, on pourra commencer par ces écrans.

### Côté public

* [ ] Page d’accueil.
* [ ] Page catalogue.
* [ ] Page détail produit.
* [ ] Page panier.
* [ ] Page formulaire client.
* [ ] Page message de validation spéciale.
* [ ] Page confirmation de commande.
* [ ] Page avis clients.
* [ ] Page contact.
* [ ] Page à propos.

### Côté administrateur

* [ ] Connexion admin.
* [ ] Tableau de bord admin.
* [ ] Liste des produits.
* [ ] Création/modification produit.
* [ ] Gestion des prix dégressifs.
* [ ] Gestion du stock.
* [ ] Liste des commandes.
* [ ] Détail commande.
* [ ] Validation/refus d’une grosse commande.
* [ ] Gestion des factures.
* [ ] Liste des avis.
* [ ] Modération d’un avis.
* [ ] Réponse à un avis.
* [ ] Gestion des pages du site.
* [ ] Modification page d’accueil.
* [ ] Paramètres du site.
* [ ] Paramètres de livraison.
* [ ] Paramètres des emails.

---

## 28. Priorité de développement proposée

### Priorité 1 — Base indispensable

* [ ] Site public.
* [ ] Catalogue.
* [ ] Produits.
* [ ] Catégories.
* [ ] Page détail produit.
* [ ] Panier ou demande de commande.
* [ ] Back-office admin.
* [ ] Gestion produits.
* [ ] Gestion commandes.
* [ ] Emails de base.

### Priorité 2 — Fonctionnalités métier fortes

* [ ] Prix dégressifs.
* [ ] Gestion intelligente du stock.
* [ ] Validation manuelle selon quantité et distance.
* [ ] Factures.
* [ ] Devis.
* [ ] Statuts de commande.
* [ ] Paramètres de livraison.

### Priorité 3 — Confiance et relation client

* [ ] Système d’avis après commande.
* [ ] Email automatique de demande d’avis.
* [ ] Modération des avis.
* [ ] Réponse publique de l’apiculteur.
* [ ] Mise en avant des avis sur le site.
* [ ] Textes humains et rassurants.

### Priorité 4 — Administration avancée

* [ ] Modification complète de la page d’accueil.
* [ ] Gestion des sections.
* [ ] Gestion des images.
* [ ] Gestion des modèles d’emails.
* [ ] Gestion des paramètres globaux.
* [ ] Statistiques.
* [ ] Logs et historique.

---

## 29. Gros modules finaux de l’application

Au final, l’application serait composée de ces grands modules :

| Module         | Rôle                                                        |
| -------------- | ----------------------------------------------------------- |
| Site public    | Présenter l’apiculteur et les produits                      |
| Catalogue      | Afficher les essaims/ruches/articles                        |
| Commande       | Permettre au client de commander ou demander une validation |
| Livraison      | Gérer distance, quantité, faisabilité et retrait            |
| Facturation    | Générer et envoyer les factures                             |
| Emails         | Automatiser les échanges client/admin                       |
| Avis clients   | Collecter, modérer et afficher les retours                  |
| Administration | Permettre à l’admin de tout gérer                           |
| CMS            | Modifier les pages sans développeur                         |
| Paramètres     | Adapter règles, seuils, textes, livraison et emails         |
| Statistiques   | Suivre l’activité du site                                   |

---

## 30. Résumé de l’objectif produit

L’objectif n’est pas uniquement de vendre des essaims ou des ruches.

L’objectif est de créer une application web complète qui permet à l’apiculteur de :

* présenter son activité de manière humaine ;
* vendre ou faire réserver ses produits ;
* gérer ses commandes ;
* gérer les grosses demandes avec validation manuelle ;
* envoyer des emails ;
* envoyer des factures ;
* récolter des avis après commande ;
* répondre aux clients ;
* modifier son site sans développeur ;
* donner une image sérieuse, vivante et de confiance.
