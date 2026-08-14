// Fuentes gratuitas: respaldo cuando EODHD falla y complemento de valor.
// - Yahoo Finance  → cotización y series históricas
// - Stooq          → series EOD (respaldo del respaldo, EE. UU. y grandes plazas)
// - Google News RSS → noticias en español/inglés que complementan las de EODHD
import { XMLParser } from 'fast-xml-parser';
import { USER_AGENT } from './config.js';

// --- Conversión de símbolo EODHD (CODE.EXCH) a Yahoo -------------------
const YAHOO_SUFFIX = {
  US: '',      // NYSE/NASDAQ/AMEX
  MC: 'MC',    // BME Madrid
  LSE: 'L', XETRA: 'DE', F: 'F', PA: 'PA', MI: 'MI', AS: 'AS', BR: 'BR',
  SW: 'SW', VX: 'SW', ST: 'ST', OL: 'OL', CO: 'CO', HE: 'HE', IR: 'IR',
  LS: 'LS', VI: 'VI', WAR: 'WA', AT: 'AT', BUD: 'BD',
  TO: 'TO', V: 'V', MX: 'MX', SA: 'SA', BA: 'BA', SN: 'SN',
  HK: 'HK', T: 'T', KO: 'KS', KQ: 'KQ', SHG: 'SS', SHE: 'SZ', TW: 'TW',
  AU: 'AX', NZ: 'NZ', SG: 'SI', JSE: 'JO', NSE: 'NS', BSE: 'BO', TA: 'TA'
};

export function toYahoo(symbol) {
  const i = symbol.lastIndexOf('.');
  if (i === -1) return symbol;
  const code = symbol.slice(0, i);
  const exch = symbol.slice(i + 1).toUpperCase();
  const suffix = YAHOO_SUFFIX[exch];
  if (suffix === '') return code;
  if (suffix) return `${code}.${suffix}`;
  return symbol; // desconocido: probar tal cual
}

async function yahooChart(symbol, range, interval) {
  const ySym = toYahoo(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!res.ok) throw new Error(`Yahoo chart ${ySym} → HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo chart ${ySym}: sin datos`);
  return result;
}

// --- Cotización (respaldo) ---------------------------------------------
export async function yahooQuote(symbol) {
  const r = await yahooChart(symbol, '1d', '1m');
  const m = r.meta || {};
  const price = m.regularMarketPrice ?? null;
  const prev = m.chartPreviousClose ?? m.previousClose ?? null;
  return {
    symbol,
    price,
    change: price != null && prev != null ? +(price - prev).toFixed(4) : null,
    changePct: price != null && prev ? +(((price - prev) / prev) * 100).toFixed(2) : null,
    previousClose: prev,
    open: null,
    high: m.regularMarketDayHigh ?? null,
    low: m.regularMarketDayLow ?? null,
    volume: m.regularMarketVolume ?? null,
    timestamp: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null
  };
}

// --- Serie diaria (respaldo) -------------------------------------------
export async function yahooDaily(symbol, rangeKey) {
  const range = { '1m': '1mo', '3m': '3mo', '6m': '6mo', '1y': '1y', '2y': '2y', '5y': '5y', '10y': '10y', max: 'max' }[rangeKey] || '1y';
  const r = await yahooChart(symbol, range, '1d');
  const ts = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const adj = r.indicators?.adjclose?.[0]?.adjclose || [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.close?.[i] == null) continue;
    out.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      open: round4(q.open?.[i]),
      high: round4(q.high?.[i]),
      low: round4(q.low?.[i]),
      close: round4(q.close?.[i]),
      adjClose: round4(adj[i] ?? q.close?.[i]),
      volume: q.volume?.[i] ?? null
    });
  }
  return out;
}

function round4(x) { return x == null ? null : +Number(x).toFixed(4); }

// --- Stooq (segundo respaldo de series) --------------------------------
const STOOQ_SUFFIX = { US: 'us', MC: 'es', LSE: 'uk', XETRA: 'de', PA: 'fr', MI: 'it', AS: 'nl', T: 'jp', HK: 'hk' };

export async function stooqDaily(symbol) {
  const i = symbol.lastIndexOf('.');
  const code = i === -1 ? symbol : symbol.slice(0, i);
  const exch = i === -1 ? 'US' : symbol.slice(i + 1).toUpperCase();
  const suffix = STOOQ_SUFFIX[exch];
  if (!suffix) throw new Error(`Stooq: mercado ${exch} no soportado`);
  const url = `https://stooq.com/q/d/l/?s=${code.toLowerCase()}.${suffix}&i=d`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Stooq → HTTP ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split('\n');
  if (lines.length < 2 || !lines[0].startsWith('Date')) throw new Error('Stooq: sin datos');
  return lines.slice(1).map((l) => {
    const [date, open, high, low, close, volume] = l.split(',');
    return {
      date,
      open: +open, high: +high, low: +low, close: +close,
      adjClose: +close,
      volume: volume ? +volume : null
    };
  });
}

// --- Google News RSS ----------------------------------------------------
const xml = new XMLParser({ ignoreAttributes: false });

export async function googleNewsRss(query, lang = 'es') {
  const cfg = lang === 'es'
    ? { hl: 'es', gl: 'ES', ceid: 'ES:es' }
    : { hl: 'en-US', gl: 'US', ceid: 'US:en' };
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${cfg.ceid}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Google News RSS → HTTP ${res.status}`);
  const doc = xml.parse(await res.text());
  let items = doc?.rss?.channel?.item || [];
  if (!Array.isArray(items)) items = [items];
  return items.slice(0, 15).map((it) => ({
    title: String(it.title || '').replace(/ - [^-]+$/, ''),
    url: it.link,
    date: it.pubDate ? new Date(it.pubDate).toISOString() : null,
    source: it.source?.['#text'] || 'Google News',
    provider: 'google-news',
    summary: '',
    symbols: [],
    sentiment: null
  }));
}

// --- Fusión y deduplicado de noticias ----------------------------------
export function mergeNews(lists) {
  const seen = new Set();
  const all = lists.flat().filter(Boolean);
  const out = [];
  for (const n of all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))) {
    const key = normTitle(n.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function normTitle(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
