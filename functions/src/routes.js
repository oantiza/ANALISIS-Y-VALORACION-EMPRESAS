// Rutas de la API. Cada endpoint intenta EODHD primero y cae a las
// fuentes gratuitas si falla; todo pasa por la caché.
import { Router } from 'express';
import { cached } from './cache.js';
import { TTL } from './config.js';
import * as eodhd from './eodhd.js';
import { yahooQuote, yahooDaily, stooqDaily, googleNewsRss, mergeNews } from './fallbacks.js';
import { computeTechnicals } from './technicals.js';

const RANGES_DAYS = { '1m': 31, '3m': 92, '6m': 183, '1y': 366, '2y': 731, '5y': 1827, max: 15000 };

function fromDate(rangeKey) {
  const days = RANGES_DAYS[rangeKey] ?? 366;
  return new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
}

function normSymbol(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,24}$/.test(s)) throw Object.assign(new Error('Símbolo no válido'), { status: 400 });
  return s.includes('.') ? s : `${s}.US`;
}

async function firstOk(attempts) {
  const errors = [];
  for (const [source, fn] of attempts) {
    try {
      const data = await fn();
      if (data == null || (Array.isArray(data) && data.length === 0)) {
        errors.push(`${source}: sin datos`);
        continue;
      }
      return { data, source };
    } catch (err) {
      errors.push(`${source}: ${err.message}`);
    }
  }
  throw new Error(`Todas las fuentes fallaron → ${errors.join(' | ')}`);
}

export function buildRouter() {
  const r = Router();

  r.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  // --- Búsqueda global de valores ---
  r.get('/search', async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json({ items: [] });
      const out = await cached(`search_${q.toLowerCase()}`, TTL.search, () =>
        firstOk([[ 'eodhd', () => eodhd.searchSymbols(q) ]])
      );
      res.json({ items: out.data, source: out.source });
    } catch (err) { next(err); }
  });

  // --- Cotización (solo caché en memoria: 60 s) ---
  r.get('/quote/:symbol', async (req, res, next) => {
    try {
      const symbol = normSymbol(req.params.symbol);
      const out = await cached(`quote_${symbol}`, TTL.quote, () =>
        firstOk([
          ['eodhd', () => eodhd.getQuote(symbol)],
          ['yahoo', () => yahooQuote(symbol)]
        ]), { memOnly: true });
      res.json({ ...out.data, source: out.source, fetchedAt: out.fetchedAt });
    } catch (err) { next(err); }
  });

  // --- Fundamentales ---
  r.get('/fundamentals/:symbol', async (req, res, next) => {
    try {
      const symbol = normSymbol(req.params.symbol);
      const out = await cached(`fund_${symbol}`, TTL.fundamentals, () =>
        firstOk([[ 'eodhd', () => eodhd.getFundamentals(symbol) ]])
      );
      res.json({ symbol, source: out.source, fetchedAt: out.fetchedAt, data: out.data });
    } catch (err) { next(err); }
  });

  // --- Serie histórica diaria ---
  r.get('/eod/:symbol', async (req, res, next) => {
    try {
      const symbol = normSymbol(req.params.symbol);
      const range = String(req.query.range || '1y');
      const out = await cached(`eod_${symbol}_${range}`, TTL.eod, () =>
        firstOk([
          ['eodhd', () => eodhd.getEod(symbol, fromDate(range))],
          ['yahoo', () => yahooDaily(symbol, range)],
          ['stooq', async () => {
            const all = await stooqDaily(symbol);
            const from = fromDate(range);
            return all.filter((c) => c.date >= from);
          }]
        ])
      );
      res.json({ symbol, range, source: out.source, fetchedAt: out.fetchedAt, candles: out.data });
    } catch (err) { next(err); }
  });

  // --- Técnicos calculados en el servidor (2 años de base) ---
  r.get('/technicals/:symbol', async (req, res, next) => {
    try {
      const symbol = normSymbol(req.params.symbol);
      const out = await cached(`tech_${symbol}`, TTL.technicals, async () => {
        const eod = await firstOk([
          ['eodhd', () => eodhd.getEod(symbol, fromDate('2y'))],
          ['yahoo', () => yahooDaily(symbol, '2y')]
        ]);
        const pack = computeTechnicals(eod.data);
        return { data: pack, source: eod.source };
      });
      res.json({ symbol, source: out.source, fetchedAt: out.fetchedAt, ...out.data });
    } catch (err) { next(err); }
  });

  // --- Noticias: EODHD + Google News RSS fusionadas ---
  r.get('/news/:symbol', async (req, res, next) => {
    try {
      const symbol = normSymbol(req.params.symbol);
      const name = String(req.query.name || '').trim();
      const out = await cached(`news_${symbol}`, TTL.news, async () => {
        const jobs = [
          eodhd.getNews(symbol, 25).catch((e) => { console.warn(`news eodhd: ${e.message}`); return []; })
        ];
        if (name) {
          jobs.push(googleNewsRss(`"${name}" bolsa OR acciones OR resultados`, 'es').catch(() => []));
          jobs.push(googleNewsRss(`"${name}" stock`, 'en').catch(() => []));
        }
        const lists = await Promise.all(jobs);
        const merged = mergeNews(lists).slice(0, 40);
        const source = lists[0].length ? 'eodhd+rss' : 'rss';
        return { data: merged, source };
      });
      res.json({ symbol, source: out.source, fetchedAt: out.fetchedAt, items: out.data });
    } catch (err) { next(err); }
  });

  return r;
}