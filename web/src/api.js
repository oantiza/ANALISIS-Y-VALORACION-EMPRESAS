// Cliente de la API propia (Cloud Function tras /api/**) con una pequeña
// caché en memoria para no repetir peticiones al cambiar de pestaña.
import { auth } from './firebase.js';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const memo = new Map(); // path -> { promise, expires }

const CLIENT_TTL = {
  '/search': 10 * 60_000,
  '/quote': 60_000,
  '/fundamentals': 30 * 60_000,
  '/consensus': 30 * 60_000,
  '/eod': 30 * 60_000,
  '/technicals': 30 * 60_000,
  '/news': 10 * 60_000
};

function ttlFor(path) {
  for (const [prefix, ttl] of Object.entries(CLIENT_TTL)) {
    if (path.startsWith(prefix)) return ttl;
  }
  return 60_000;
}

export async function api(path) {
  const hit = memo.get(path);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = (async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Sesión no iniciada');
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch { /* noop */ }
      throw new Error(msg);
    }
    return res.json();
  })();

  memo.set(path, { promise, expires: Date.now() + ttlFor(path) });
  promise.catch(() => memo.delete(path)); // no cachear errores
  return promise;
}