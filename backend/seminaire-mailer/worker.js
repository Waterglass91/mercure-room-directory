const DEFAULT_ALLOWED_ORIGINS = [
  'https://guide.mercureleplessisrobinson.fr',
  'https://waterglass91.github.io'
];

function corsHeaders(origin, allowed) {
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}

function json(data, status, origin, allowed) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin, allowed),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function cleanHeader(value = '', max = 180) {
  return String(value).replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

function validEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function publicEntries(payload) {
  return Object.entries(payload)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => [String(key).slice(0, 80), String(value ?? '').slice(0, 4000)]);
}

function buildEmail(payload, requestId) {
  const entries = publicEntries(payload);
  const rows = entries.map(([key, value]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #e7e7e7;color:#66706a;width:32%;vertical-align:top">${escapeHtml(key)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e7e7e7;color:#1f2b26;font-weight:600;vertical-align:top">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
    </tr>`).join('');

  const text = entries.map(([key, value]) => `${key}: ${value}`).join('\n');
  const subject = cleanHeader(payload._subject || 'Nouvelle demande séminaire');

  return {
    subject,
    text: `${subject}\n\n${text}\n\nRéférence: ${requestId}`,
    html: `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f1eb;font-family:Arial,sans-serif;color:#1f2b26">
  <div style="max-width:760px;margin:0 auto;padding:28px 16px">
    <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e7e3">
      <div style="padding:24px 26px;background:#4c5c4f;color:white">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8">Mercure Le Plessis-Robinson</div>
        <h1 style="font-size:24px;margin:7px 0 0">Nouvelle demande séminaire</h1>
      </div>
      <div style="padding:18px 14px">
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      </div>
      <div style="padding:14px 26px 22px;color:#7a827d;font-size:12px">
        Référence : ${escapeHtml(requestId)}<br>
        Reçu : ${escapeHtml(new Date().toISOString())}
      </div>
    </div>
  </div>
</body></html>`
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const origins = allowedOrigins(env);
    const originAllowed = origins.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: originAllowed ? 204 : 403,
        headers: corsHeaders(origin, originAllowed)
      });
    }

    if (request.method !== 'POST') {
      return json({ success: false, message: 'Méthode non autorisée.' }, 405, origin, originAllowed);
    }

    if (!originAllowed) {
      return json({ success: false, message: 'Origine non autorisée.' }, 403, origin, false);
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return json({ success: false, message: 'Format non pris en charge.' }, 415, origin, true);
    }

    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > 60000) {
      return json({ success: false, message: 'Demande trop volumineuse.' }, 413, origin, true);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ success: false, message: 'Données invalides.' }, 400, origin, true);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ success: false, message: 'Données invalides.' }, 400, origin, true);
    }

    // Honeypot anti-spam : un utilisateur réel ne remplit jamais ce champ.
    if (String(payload._website || '').trim()) {
      return json({ success: true }, 200, origin, true);
    }

    const required = [
      'Société', 'Contact', 'E-mail client', 'Téléphone',
      'Type d’événement', 'Date souhaitée', 'Horaires',
      'Configuration', 'Participants'
    ];

    for (const field of required) {
      if (!String(payload[field] || '').trim()) {
        return json({ success: false, message: `Champ requis manquant : ${field}` }, 400, origin, true);
      }
    }

    const clientEmail = String(payload['E-mail client'] || '').trim();
    if (!validEmail(clientEmail)) {
      return json({ success: false, message: 'Adresse e-mail client invalide.' }, 400, origin, true);
    }

    if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) {
      return json({ success: false, message: 'Service e-mail non configuré.' }, 503, origin, true);
    }

    const requestId = crypto.randomUUID();
    const mail = buildEmail(payload, requestId);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [env.MAIL_TO],
        reply_to: clientEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text
      })
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('Resend error', resendResponse.status, resendData);
      return json({ success: false, message: 'L’envoi du message a échoué.' }, 502, origin, true);
    }

    return json({ success: true, id: requestId }, 200, origin, true);
  }
};
