# Backend e-mail du chatbot séminaire

Ce dossier contient le backend sécurisé utilisé pour envoyer les demandes du chatbot à `HC5M7@accor.com`.

## Architecture

- Frontend : GitHub Pages, `https://guide.mercureleplessisrobinson.fr/seminaire/`
- Backend : Cloudflare Worker
- Envoi transactionnel : Resend
- Clé Resend : stockée uniquement comme secret Cloudflare, jamais dans GitHub ni dans le navigateur

## Pourquoi ce système

GitHub Pages est un hébergement statique et ne peut pas conserver une clé privée ni envoyer lui-même des e-mails de manière sécurisée. Le Worker reçoit la demande, vérifie son origine et les champs obligatoires, puis appelle Resend côté serveur.

## Configuration Resend

1. Créer un compte Resend.
2. Ajouter et vérifier le sous-domaine `mail.mercureleplessisrobinson.fr`.
3. Ajouter dans le DNS les enregistrements SPF/DKIM fournis par Resend.
4. Créer une clé API Resend.

Le sender prévu dans `wrangler.toml` est :

`Séminaires Mercure <seminaires@mail.mercureleplessisrobinson.fr>`

Le destinataire est :

`HC5M7@accor.com`

## Configuration Cloudflare Worker

Déployer le contenu de `worker.js` dans un Worker Cloudflare avec les variables suivantes :

- `ALLOWED_ORIGINS` = `https://guide.mercureleplessisrobinson.fr,https://waterglass91.github.io`
- `MAIL_TO` = `HC5M7@accor.com`
- `MAIL_FROM` = `Séminaires Mercure <seminaires@mail.mercureleplessisrobinson.fr>`

Ajouter en secret :

- `RESEND_API_KEY` = clé API créée dans Resend

Ne jamais mettre `RESEND_API_KEY` dans un fichier GitHub.

## Activation côté chatbot

Après déploiement du Worker, récupérer son URL HTTPS, par exemple :

`https://mercure-seminaire-mailer.<votre-sous-domaine>.workers.dev`

Puis modifier uniquement `seminaire/config.js` :

```js
window.SEMINAR_API_ENDPOINT = "https://mercure-seminaire-mailer.<votre-sous-domaine>.workers.dev";
```

Dès que cette valeur est renseignée, `transport.js` intercepte l'ancien appel FormSubmit et utilise automatiquement le backend sécurisé. Si la valeur est vide, le chatbot conserve temporairement l'ancien transport.

## Sécurité intégrée

- destinataire fixé côté serveur ;
- clé API absente du navigateur ;
- CORS limité aux domaines autorisés ;
- méthode POST uniquement ;
- JSON uniquement ;
- contrôle de taille ;
- validation des champs essentiels ;
- validation de l'adresse e-mail client ;
- honeypot anti-spam ;
- échappement HTML du contenu envoyé ;
- identifiant unique pour chaque demande ;
- aucune donnée stockée durablement par le Worker.
