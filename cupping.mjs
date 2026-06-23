import { getStore } from '@netlify/blobs';
import { getSession } from './_auth.mjs';

const STORE_NAME = 'cupping';
const KEY = 'entries';

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

async function readAll(s) {
  try {
    const data = await s.get(KEY, { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async (req) => {
  // ---- gate: valid session required for everything ----
  if (!getSession(req)) {
    return new Response(JSON.stringify({ error: 'non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const s = store();
  const method = req.method;

  try {
    if (method === 'GET') {
      const entries = await readAll(s);
      return new Response(JSON.stringify(entries), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      const entry = await req.json();
      if (!entry || !entry.ref) {
        return new Response(JSON.stringify({ error: 'ref manquante' }), { status: 400 });
      }
      const entries = await readAll(s);
      entry.id = Date.now();
      if (!entry.date) {
        entry.date = new Date().toLocaleString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      }
      entries.unshift(entry);
      await s.setJSON(KEY, entries);
      return new Response(JSON.stringify(entry), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      const id = Number(new URL(req.url).searchParams.get('id'));
      if (!id) return new Response(JSON.stringify({ error: 'id manquant' }), { status: 400 });
      const entries = await readAll(s);
      const next = entries.filter((e) => e.id !== id);
      await s.setJSON(KEY, next);
      return new Response(JSON.stringify({ ok: true, removed: entries.length - next.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'méthode non supportée' }), { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};

export const config = { path: '/api/cupping' };
