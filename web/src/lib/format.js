// Formateadores es-ES para cifras financieras
const SYM = { USD: '$', EUR: '€', GBP: '£', GBX: 'p', JPY: '¥', CHF: 'CHF', CAD: 'C$', AUD: 'A$', HKD: 'HK$', SEK: 'kr', NOK: 'kr', DKK: 'kr' };

export function cur(c) { return SYM[c] || (c ? `${c} ` : ''); }

export function fmtNum(x, dec = 2) {
  if (x == null || Number.isNaN(Number(x))) return '—';
  return Number(x).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtPrice(x, currency, dec = 2) {
  if (x == null || Number.isNaN(Number(x))) return '—';
  const s = cur(currency);
  return currency === 'USD' || currency === 'GBP'
    ? `${s}${fmtNum(x, dec)}`
    : `${fmtNum(x, dec)} ${s}`.trim();
}

export function fmtPct(x, dec = 2, signed = true) {
  if (x == null || Number.isNaN(Number(x))) return '—';
  const n = Number(x);
  const sign = signed && n > 0 ? '+' : '';
  return `${sign}${fmtNum(n, dec)} %`;
}

/** Cifras grandes: B (billones), mm (miles de millones), M (millones) */
export function fmtBig(x, currency) {
  if (x == null || Number.isNaN(Number(x))) return '—';
  const n = Number(x);
  const abs = Math.abs(n);
  let v, suf;
  if (abs >= 1e12) { v = n / 1e12; suf = 'B'; }
  else if (abs >= 1e9) { v = n / 1e9; suf = 'mm'; }
  else if (abs >= 1e6) { v = n / 1e6; suf = 'M'; }
  else if (abs >= 1e3) { v = n / 1e3; suf = 'k'; }
  else { v = n; suf = ''; }
  const s = cur(currency);
  return `${s}${v.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${suf}`.trim();
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtRatio(x, dec = 1) {
  if (x == null || Number.isNaN(Number(x)) || Number(x) === 0) return '—';
  return `${fmtNum(x, dec)}×`;
}

export function clsPN(x) {
  if (x == null) return '';
  return Number(x) >= 0 ? 'pos' : 'neg';
}

/** Convierte una fracción EODHD (o 'NA') a porcentaje, o null si no hay dato. */
export function pct100(x) {
  if (x == null || x === 'NA') return null;
  const n = Number(x);
  return Number.isNaN(n) ? null : n * 100;
}