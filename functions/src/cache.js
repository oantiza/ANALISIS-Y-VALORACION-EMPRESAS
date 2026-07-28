// Caché de dos niveles: memoria de la instancia + Firestore (gzip).
// Cada entrada guarda payload comprimido, origen y expiración.
// Una política TTL de Firestore sobre `expiresAt` limpia los documentos solos.
import { gzipSync, gunzipSync } from 'node:zlib';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CACHE_COLLECTION } from './config.js';

const mem = new Map(); // key -> { data, source, fetchedAt, expiresMs }

function memGet(key) {
  const hit = mem.get(key);
  if (hit && hit.expiresMs > Date.now()) return hit;
  if (hit) mem.delete(key);
  return null;
}

function memSet(key, data, source, fetchedAt, ttlSeconds) {
  // Límite defensivo para no crecer sin control en instancias longevas
  if (mem.size > 500) mem.clear();
  mem.set(key, { data, source, fetchedAt, expiresMs: Date.now() + ttlSeconds * 1000 });
}

function sanitizeKey(key) {
  return key.replace(/[\/\\#?%\s]+/g, '_').slice(0, 400);
}

/**
 * Devuelve el valor cacheado o ejecuta `fetcher` y lo guarda.
 * @param {string} key      clave lógica (p. ej. "fund_AAPL.US")
 * @param {number} ttl      segundos de vida
 * @param {Function} fetcher async () => ({ data, source })
 * @param {object} opts     { memOnly } para datos muy volátiles (cotización)
 */
export async function cached(key, ttl, fetcher, opts = {}) {
  const k = sanitizeKey(key);

  const hitMem = memGet(k);
  if (hitMem) return { data: hitMem.data, source: hitMem.source, fetchedAt: hitMem.fetchedAt, cache: 'mem' };

  const db = getFirestore();
  const ref = db.collection(CACHE_COLLECTION).doc(k);

  if (!opts.memOnly) {
    try {
      const snap = await ref.get();
      if (snap.exists) {
        const d = snap.data();
        const expires = d.expiresAt?.toMillis?.() ?? 0;
        if (expires > Date.now() && d.gz) {
          const data = JSON.parse(gunzipSync(Buffer.from(d.gz)).toString('utf8'));
          const fetchedAt = d.fetchedAt?.toDate?.()?.toISOString() ?? null;
          memSet(k, data, d.source, fetchedAt, Math.min(ttl, 300));
          return { data, source: d.source, fetchedAt, cache: 'firestore' };
        }
      }
    } catch (err) {
      console.warn(`[cache] lectura fallida ${k}: ${err.message}`);
    }
  }

  const { data, source } = await fetcher();
  const fetchedAt = new Date().toISOString();
  memSet(k, data, source, fetchedAt, ttl);

  if (!opts.memOnly) {
    try {
      const gz = gzipSync(Buffer.from(JSON.stringify(data), 'utf8'));
      if (gz.length < 950_000) { // margen bajo el límite de 1 MiB por documento
        await ref.set({
          gz,
          source,
          key: k,
          fetchedAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + ttl * 1000)
        });
      } else {
        console.warn(`[cache] ${k} demasiado grande incluso comprimido (${gz.length} B), no se persiste`);
      }
    } catch (err) {
      console.warn(`[cache] escritura fallida ${k}: ${err.message}`);
    }
  }

  return { data, source, fetchedAt, cache: 'none' };
}