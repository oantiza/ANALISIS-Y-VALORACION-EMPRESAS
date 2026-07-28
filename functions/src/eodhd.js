// Cliente EODHD — proveedor principal. La clave llega por secret (EODHD_API_KEY).
import { EODHD_BASE } from './config.js';

function token() {
  const t = process.env.EODHD_API_KEY;
  if (!t) throw new Error('Falta el secret EODHD_API_KEY');
  return t;
}

async function eodhdGet(path, params = {}) {
  const url = new URL(`${EODHD_BASE}/${path}`);
  url.searchParams.set('api_token', token());
  url.searchParams.set('fmt', 'json');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`EODHD ${path} → HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

// --- Búsqueda de símbolos ---
export async function searchSymbols(q) {
  const raw = await eodhdGet(`search/${encodeURIComponent(q)}`, { limit: 20 });
  return (raw || []).map((r) => ({
    symbol: `${r.Code}.${r.Exchange}`,
    code: r.Code,
    exchange: r.Exchange,
    name: r.Name,
    country: r.Country,
    currency: r.Currency,
    isin: r.ISIN || null,
    type: r.Type || null,
    previousClose: r.previousClose ?? null
  }));
}

// --- Cotización en tiempo (casi) real ---
export async function getQuote(symbol) {
  const r = await eodhdGet(`real-time/${encodeURIComponent(symbol)}`);
  const num = (x) => (x === 'NA' || x == null ? null : Number(x));
  return {
    symbol,
    price: num(r.close),
    change: num(r.change),
    changePct: num(r.change_p),
    previousClose: num(r.previousClose),
    open: num(r.open),
    high: num(r.high),
    low: num(r.low),
    volume: num(r.volume),
    timestamp: r.timestamp ? new Date(r.timestamp * 1000).toISOString() : null
  };
}

// --- Serie histórica diaria ---
export async function getEod(symbol, fromISO) {
  const raw = await eodhdGet(`eod/${encodeURIComponent(symbol)}`, {
    from: fromISO,
    period: 'd',
    order: 'a'
  });
  return (raw || []).map((r) => ({
    date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    adjClose: r.adjusted_close,
    volume: r.volume
  }));
}

// --- Noticias ---
export async function getNews(symbol, limit = 25) {
  const raw = await eodhdGet('news', { s: symbol, limit, offset: 0 });
  return (raw || []).map((n) => ({
    title: n.title,
    url: n.link,
    date: n.date,
    source: hostFrom(n.link) || 'EODHD',
    provider: 'eodhd',
    summary: (n.content || '').replace(/\s+/g, ' ').slice(0, 320),
    symbols: n.symbols || [],
    sentiment: n.sentiment?.polarity ?? null
  }));
}

function hostFrom(link) {
  try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return null; }
}

// --- Fundamentales (recortados para caber cómodamente en la caché) ---
export async function getFundamentals(symbol) {
  const raw = await eodhdGet(`fundamentals/${encodeURIComponent(symbol)}`);
  return trimFundamentals(raw);
}

function lastEntries(obj, n) {
  if (!obj || typeof obj !== 'object') return obj;
  const keys = Object.keys(obj).sort().reverse().slice(0, n);
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

export function trimFundamentals(f) {
  if (!f || typeof f !== 'object') return f;
  const out = { ...f };

  // Financieros: 6 ejercicios anuales y 8 trimestres por estado
  if (out.Financials) {
    const fin = {};
    for (const stmt of ['Balance_Sheet', 'Income_Statement', 'Cash_Flow']) {
      const s = out.Financials[stmt];
      if (!s) continue;
      fin[stmt] = {
        currency_symbol: s.currency_symbol,
        yearly: lastEntries(s.yearly, 6),
        quarterly: lastEntries(s.quarterly, 8)
      };
    }
    out.Financials = fin;
  }

  if (out.Earnings) {
    out.Earnings = {
      History: lastEntries(out.Earnings.History, 12),
      Trend: lastEntries(out.Earnings.Trend, 8),
      Annual: lastEntries(out.Earnings.Annual, 6)
    };
  }

  if (out.outstandingShares) {
    out.outstandingShares = {
      annual: lastEntries(out.outstandingShares.annual, 6),
      quarterly: lastEntries(out.outstandingShares.quarterly, 8)
    };
  }

  if (out.Holders) {
    const topN = (h) => Object.fromEntries(Object.entries(h || {}).slice(0, 10));
    out.Holders = {
      Institutions: topN(out.Holders.Institutions),
      Funds: topN(out.Holders.Funds)
    };
  }

  if (out.InsiderTransactions) {
    out.InsiderTransactions = Object.fromEntries(
      Object.entries(out.InsiderTransactions).slice(0, 20)
    );
  }

  if (out.SplitsDividends?.NumberDividendsByYear) {
    out.SplitsDividends.NumberDividendsByYear = lastEntries(
      out.SplitsDividends.NumberDividendsByYear, 12
    );
  }

  return out;
}