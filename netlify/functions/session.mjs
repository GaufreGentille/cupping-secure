import { clearCookie, getSession } from './_auth.mjs';

export default async (req) => {
  // GET /api/session — check if logged in
  if (req.method === 'GET') {
    const session = getSession(req);
    return new Response(JSON.stringify({ authenticated: !!session }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // POST /api/session/logout — clear session
  if (req.method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCookie() },
    });
  }
  return new Response(JSON.stringify({ error: 'méthode non supportée' }), { status: 405 });
};

export const config = { path: '/api/session' };
