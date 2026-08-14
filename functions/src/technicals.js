// Indicadores técnicos calculados localmente a partir de la serie EOD cacheada.
// Ahorra llamadas a la API de técnicos de EODHD (que consume 5 peticiones por indicador).

function smaSeries(values, n) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

function emaSeries(values, n) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (n + 1);
  let ema = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (ema == null) {
      if (i === n - 1) {
        let s = 0;
        for (let j = 0; j < n; j++) s += values[j];
        ema = s / n;
        out[i] = ema;
      }
    } else {
      ema = v * k + ema * (1 - k);
      out[i] = ema;
    }
  }
  return out;
}

function rsiSeries(closes, n = 14) {
  const out = new Array(closes.length).fill(null);
  let gain = 0, loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const up = Math.max(ch, 0), down = Math.max(-ch, 0);
    if (i <= n) {
      gain += up; loss += down;
      if (i === n) {
        gain /= n; loss /= n;
        out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
      }
    } else {
      gain = (gain * (n - 1) + up) / n;
      loss = (loss * (n - 1) + down) / n;
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
  }
  return out;
}

function macdSeries(closes, fast = 12, slow = 26, signal = 9) {
  const emaF = emaSeries(closes, fast);
  const emaS = emaSeries(closes, slow);
  const macd = closes.map((_, i) => (emaF[i] != null && emaS[i] != null ? emaF[i] - emaS[i] : null));
  const firstIdx = macd.findIndex((v) => v != null);
  const valid = macd.slice(firstIdx).map((v) => v ?? 0);
  const sigValid = emaSeries(valid, signal);
  const sig = new Array(closes.length).fill(null);
  for (let i = 0; i < sigValid.length; i++) sig[firstIdx + i] = sigValid[i];
  const hist = macd.map((v, i) => (v != null && sig[i] != null ? v - sig[i] : null));
  return { macd, signal: sig, hist };
}

function bollingerSeries(closes, n = 20, mult = 2) {
  const mid = smaSeries(closes, n);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = n - 1; i < closes.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (closes[j] - mid[i]) ** 2;
    const sd = Math.sqrt(s / n);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}

function atrSeries(candles, n = 14) {
  const out = new Array(candles.length).fill(null);
  let atr = null, sum = 0;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    if (i <= n) {
      sum += tr;
      if (i === n) { atr = sum / n; out[i] = atr; }
    } else {
      atr = (atr * (n - 1) + tr) / n;
      out[i] = atr;
    }
  }
  return out;
}

function pctChange(from, to) {
  if (from == null || to == null || !from) return null;
  return +(((to - from) / from) * 100).toFixed(2);
}

function findCloseNDaysAgo(candles, days) {
  const target = Date.now() - days * 86400_000;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (new Date(candles[i].date).getTime() <= target) return candles[i].close;
  }
  return null;
}

function maxDrawdown(closes) {
  let peak = -Infinity, mdd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (c - peak) / peak;
    if (dd < mdd) mdd = dd;
  }
  return +(mdd * 100).toFixed(2);
}

function annualVol(closes, days = 30) {
  const rets = [];
  const start = Math.max(1, closes.length - days);
  for (let i = start; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  if (rets.length < 5) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varr = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return +(Math.sqrt(varr) * Math.sqrt(252) * 100).toFixed(2);
}

/**
 * Calcula el paquete técnico completo a partir de velas diarias (orden ascendente).
 * Devuelve series alineadas por fecha para el rango solicitado y una foto actual con señales.
 */
export function computeTechnicals(candles, seriesRange = '1y') {
  if (!candles || candles.length < 30) {
    return { error: 'Serie insuficiente para análisis técnico (mínimo 30 sesiones)' };
  }
  const closes = candles.map((c) => c.close);
  const sma20 = smaSeries(closes, 20);
  const sma50 = smaSeries(closes, 50);
  const sma200 = smaSeries(closes, 200);
  const ema20 = emaSeries(closes, 20);
  const rsi = rsiSeries(closes, 14);
  const { macd, signal, hist } = macdSeries(closes);
  const bb = bollingerSeries(closes, 20, 2);
  const atr = atrSeries(candles, 14);

  const i = candles.length - 1;
  const last = candles[i];
  const yearAgoIdx = Math.max(0, candles.length - 252);
  const seriesDays = { '1y': 366, '3y': 3 * 366, '5y': 5 * 366 }[seriesRange] ?? 366;
  const seriesCutoff = new Date(new Date(last.date).getTime() - seriesDays * 86400_000).toISOString().slice(0, 10);
  const firstVisible = candles.findIndex((c) => c.date >= seriesCutoff);
  const seriesStartIdx = firstVisible === -1 ? 0 : firstVisible;
  const yearCloses = closes.slice(yearAgoIdx);
  const high52 = Math.max(...candles.slice(yearAgoIdx).map((c) => c.high));
  const low52 = Math.min(...candles.slice(yearAgoIdx).map((c) => c.low));

  const ytdStart = candles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`)?.close ?? null;

  const latest = {
    date: last.date,
    close: last.close,
    sma20: rnd(sma20[i]), sma50: rnd(sma50[i]), sma200: rnd(sma200[i]), ema20: rnd(ema20[i]),
    rsi14: rnd(rsi[i]),
    macd: rnd(macd[i]), macdSignal: rnd(signal[i]), macdHist: rnd(hist[i]),
    bbUpper: rnd(bb.upper[i]), bbMid: rnd(bb.mid[i]), bbLower: rnd(bb.lower[i]),
    atr14: rnd(atr[i]),
    high52, low52,
    distHigh52: pctChange(high52, last.close),
    distLow52: pctChange(low52, last.close),
    perf: {
      w1: pctChange(findCloseNDaysAgo(candles, 7), last.close),
      m1: pctChange(findCloseNDaysAgo(candles, 30), last.close),
      m3: pctChange(findCloseNDaysAgo(candles, 91), last.close),
      m6: pctChange(findCloseNDaysAgo(candles, 182), last.close),
      ytd: pctChange(ytdStart, last.close),
      y1: pctChange(closes[yearAgoIdx], last.close)
    },
    vol30: annualVol(closes, 30),
    maxDrawdown1y: maxDrawdown(yearCloses)
  };

  latest.senales = buildSignals(latest, sma50[i], sma200[i], sma50[i - 5], sma200[i - 5]);

  // Series del rango visible para el gráfico; los cálculos conservan el histórico de calentamiento.
  const s = (arr) => arr.slice(seriesStartIdx).map(rnd);
  const series = {
    candles: candles.slice(seriesStartIdx),
    sma50: s(sma50),
    sma200: s(sma200),
    bbUpper: s(bb.upper),
    bbLower: s(bb.lower),
    rsi: s(rsi),
    macd: s(macd),
    macdSignal: s(signal),
    macdHist: s(hist)
  };

  return { latest, series };
}

function rnd(x) { return x == null ? null : +Number(x).toFixed(4); }

function buildSignals(l, sma50Now, sma200Now, sma50Prev, sma200Prev) {
  const out = [];
  const add = (nombre, estado, detalle) => out.push({ nombre, estado, detalle });
  const f = (x, d = 2) => (x == null ? '—' : Number(x).toFixed(d).replace('.', ','));

  if (l.sma200 != null) {
    add('Tendencia de fondo', l.close > l.sma200 ? 'alcista' : 'bajista',
      `Precio ${l.close > l.sma200 ? 'por encima' : 'por debajo'} de la media de 200 sesiones (${f(l.sma200)})`);
  }
  if (sma50Now != null && sma200Now != null && sma50Prev != null && sma200Prev != null) {
    if (sma50Prev <= sma200Prev && sma50Now > sma200Now) {
      add('Cruce de medias', 'alcista', 'Cruce dorado reciente: SMA50 supera a SMA200');
    } else if (sma50Prev >= sma200Prev && sma50Now < sma200Now) {
      add('Cruce de medias', 'bajista', 'Cruce de la muerte reciente: SMA50 pierde la SMA200');
    } else {
      add('Cruce de medias', sma50Now > sma200Now ? 'alcista' : 'bajista',
        `SMA50 ${sma50Now > sma200Now ? 'sobre' : 'bajo'} SMA200`);
    }
  }
  if (l.rsi14 != null) {
    const estado = l.rsi14 >= 70 ? 'sobrecompra' : l.rsi14 <= 30 ? 'sobreventa' : 'neutral';
    add('RSI (14)', estado, `RSI en ${f(l.rsi14, 1)}`);
  }
  if (l.macdHist != null) {
    add('MACD', l.macdHist > 0 ? 'alcista' : 'bajista',
      `Histograma ${l.macdHist > 0 ? 'positivo' : 'negativo'} (${f(l.macdHist, 3)})`);
  }
  if (l.bbUpper != null && l.bbLower != null) {
    const estado = l.close >= l.bbUpper ? 'sobrecompra' : l.close <= l.bbLower ? 'sobreventa' : 'neutral';
    add('Bandas de Bollinger', estado,
      estado === 'neutral' ? 'Precio dentro de las bandas' : `Precio en la banda ${l.close >= l.bbUpper ? 'superior' : 'inferior'}`);
  }
  return out;
}
