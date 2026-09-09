(() => {
  const endpoint = String(window.SEMINAR_API_ENDPOINT || '').trim();
  if (!endpoint) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';

    // Le code historique appelle FormSubmit. Dès qu'un endpoint serveur est configuré,
    // on intercepte uniquement cet envoi et on le redirige vers notre backend privé.
    if (!url.startsWith('https://formsubmit.co/ajax/')) {
      return nativeFetch(input, init);
    }

    let body = {};
    try {
      body = init.body ? JSON.parse(init.body) : {};
    } catch (_) {
      throw new Error('Le récapitulatif n’a pas pu être préparé pour l’envoi.');
    }

    body._website = ''; // honeypot serveur
    body._page = window.location.href;
    body._clientTimestamp = new Date().toISOString();

    return nativeFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit'
    });
  };
})();
