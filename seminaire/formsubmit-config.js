// Adresse de réception active pour FormSubmit.
// Ce fichier est chargé avant app.js et force les requêtes FormSubmit vers l'adresse commerciale.
window.SEMINAR_FORMSUBMIT_EMAIL = 'commercial@plessisrobinsonhotels.com';

(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const url = typeof input === 'string' ? input : input?.url;
      if (url && url.startsWith('https://formsubmit.co/ajax/')) {
        input = `https://formsubmit.co/ajax/${window.SEMINAR_FORMSUBMIT_EMAIL}`;
      }
    } catch (_) {}
    return originalFetch(input, init);
  };
})();
