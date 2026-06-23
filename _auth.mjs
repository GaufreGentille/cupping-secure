// Shared auth helpers — HMAC-signed session cookie, no external deps.
import crypto from 'node:crypto';

const COOKIE_NAME = 'cupping_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET manquant ou trop court (32+ caractères requis).');
  }
  return s;
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${mac}`;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [data, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  // constant-time comparison
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// Read the session cookie from a request, return payload or null.
export function getSession(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(COOKIE_NAME + '='));
  if (!match) return null;
  return verify(match.slice(COOKIE_NAME.length + 1));
}

// Build a Set-Cookie header that establishes a session.
export function sessionCookie() {
  const token = sign({ ok: true, exp: Math.floor(Date.now() / 1000) + MAX_AGE });
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

// Build a Set-Cookie header that clears the session.
export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// Compare a submitted password to the configured one, constant-time.
export function checkPassword(submitted) {
  const real = process.env.CUPPING_PASSWORD || '';
  if (!real) throw new Error('CUPPING_PASSWORD non configuré.');
  const a = Buffer.from(String(submitted));
  const b = Buffer.from(real);
  // pad to equal length to avoid leaking length, then constant-time compare
  if (a.length !== b.length) {
    // still burn time
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
