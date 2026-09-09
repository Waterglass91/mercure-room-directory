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

## Règles intégrées

- Cocktail debout : maximum 80 personnes
- Format assis : maximum 50 personnes
- Théâtre : maximum 50 personnes
- En U / classe / îlots / autre : maximum 50 personnes, sous réserve de validation commerciale
- Horaires : de 09h00 à 23h00
- Destinataire : `HC5M7@accor.com`

## Envoi des demandes

L'architecture cible utilise un Cloudflare Worker et Resend afin que la clé d'envoi reste côté serveur et ne soit jamais exposée dans le navigateur.

Le backend est présent dans :

`backend/seminaire-mailer/`

Tant que `window.SEMINAR_API_ENDPOINT` reste vide dans `config.js`, le formulaire conserve temporairement l'ancien transport FormSubmit. Dès que l'URL du Worker est renseignée, le nouveau backend est utilisé automatiquement.
