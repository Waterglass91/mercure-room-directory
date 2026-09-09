// Adresse de réception active pour FormSubmit.
// Ce fichier est chargé avant app.js et force les requêtes FormSubmit vers l'adresse commerciale.
window.SEMINAR_FORMSUBMIT_EMAIL = 'commercial@plessisrobinsonhotels.com';

(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input?.url;

      if (url && url.startsWith('https://formsubmit.co/ajax/')) {
        input = `https://formsubmit.co/ajax/${window.SEMINAR_FORMSUBMIT_EMAIL}`;

        // FormSubmit recommande de fournir l'URL exacte du formulaire afin
        // d'éviter les problèmes liés aux politiques modernes de referrer.
        if (init.body && typeof init.body === 'string') {
          try {
            const body = JSON.parse(init.body);
            body._url = 'https://guide.mercureleplessisrobinson.fr/seminaire/';
            body.email = body['E-mail client'] || body.email || '';
            init = {
              ...init,
              body: JSON.stringify(body)
            };
          } catch (_) {}
        }
      }
    } catch (_) {}

    return originalFetch(input, init);
  };
})();
