import { checkPassword, sessionCookie } from './_auth.mjs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'méthode non supportée' }), { status: 405 });
  }
  // CSRF: only accept same-origin requests
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.endsWith(host)) {
    return new Response(JSON.stringify({ error: 'origine invalide' }), { status: 403 });
  }
  try {
    const { password } = await req.json();
    if (!checkPassword(password)) {
      return new Response(JSON.stringify({ error: 'Mot de passe incorrect.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie(),
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};

export const config = { path: '/api/login' };
