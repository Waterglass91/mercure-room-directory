# Chatbot séminaire

Page dédiée aux demandes de séminaire du Mercure Le Plessis-Robinson.

## Publication

Le dossier est servi par le GitHub Pages déjà associé au dépôt.

URL : `https://guide.mercureleplessisrobinson.fr/seminaire/`

## Fichiers

- `index.html` : structure de la page
- `styles.css` : design
- `app.js` : parcours et règles métier
- `config.js` : URL du backend d'envoi
- `transport.js` : bascule de l'envoi vers le backend sécurisé
- `formsubmit-config.js` : adresse de réception active pour les tests FormSubmit

## Règles intégrées

- Cocktail debout : maximum 80 personnes
- Format assis : maximum 50 personnes
- Théâtre : maximum 50 personnes
- En U / classe / îlots / autre : maximum 50 personnes, sous réserve de validation commerciale
- Horaires : de 09h00 à 23h00
- Destinataire actuel : `commercial@plessisrobinsonhotels.com`

## Envoi des demandes

Pour le moment, le formulaire utilise FormSubmit avec l'adresse `commercial@plessisrobinsonhotels.com`.

L'architecture cible Cloudflare Worker + Resend reste disponible dans `backend/seminaire-mailer/`, mais n'est pas activée tant que `window.SEMINAR_API_ENDPOINT` reste vide dans `config.js`.
