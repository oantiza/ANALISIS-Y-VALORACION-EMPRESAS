import React from 'react';
import { fmtBig } from '../lib/format.js';
import IndicatorInfo from './IndicatorInfo.jsx';

/** Línea/área ligera para el resumen y el informe (SVG puro, estilo OAA). */
export function Sparkline({ candles, width = 560, height = 150, stroke = 'var(--crimson)' }) {
  if (!candles?.length) return null;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const pad = 6;
  const span = max - min || 1;
  const x = (i) => pad + (i / (closes.length - 1)) * (width - pad * 2);
  const y = (v) => pad + (1 - (v - min) / span) * (height - pad * 2 - 14);

  const path = closes.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(closes.length - 1).toFixed(1)},${height - 14} L${x(0).toFixed(1)},${height - 14} Z`;

  const first = candles[0], last = candles[candles.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <path d={area} fill="var(--chart-area)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.8" />
      <text x={pad} y={height - 2} fontSize="10" fill="var(--ink3)">{first.date}</text>
      <text x={width - pad} y={height - 2} fontSize="10" fill="var(--ink3)" textAnchor="end">{last.date}</text>
    </svg>
  );
}

/** Barras anuales dobles (p. ej. ingresos vs beneficio neto), estilo informes-oaa. */
export function DualBars({ rows, aLabel, bLabel, currency, height = 210 }) {
  // rows: [{ label, a, b }]
  if (!rows?.length) return null;
  const width = 620;
  const padL = 10, padR = 10, padT = 14, padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.a || 0), Math.abs(r.b || 0)]), 1);
  const hasNeg = rows.some((r) => (r.a || 0) < 0 || (r.b || 0) < 0);
  const zeroY = hasNeg ? padT + innerH * (maxAbs / (2 * maxAbs)) : padT + innerH;
  const scale = hasNeg ? innerH / (2 * maxAbs) : innerH / maxAbs;

  const groupW = innerW / rows.length;
  const barW = Math.min(26, groupW * 0.28);

  return (
    <div>
      <div className="chart-legend">
        <span><span className="sw" style={{ background: 'var(--sma50)' }} /><IndicatorInfo name={aLabel} /></span>
        <span><span className="sw" style={{ background: 'var(--pos)' }} /><IndicatorInfo name={bLabel} /></span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={padL} x2={width - padR} y1={zeroY} y2={zeroY} stroke="var(--line)" strokeWidth="1" />
        {rows.map((r, i) => {
          const cx = padL + groupW * i + groupW / 2;
          const bars = [
            { v: r.a || 0, color: 'var(--sma50)', off: -barW - 2 },
            { v: r.b || 0, color: (r.b || 0) >= 0 ? 'var(--pos)' : 'var(--neg)', off: 2 }
          ];
          return (
            <g key={r.label}>
              {bars.map((b, j) => {
                const h = Math.abs(b.v) * scale;
                const yTop = b.v >= 0 ? zeroY - h : zeroY;
                return <rect key={j} x={cx + b.off} y={yTop} width={barW} height={Math.max(h, 0.5)} fill={b.color} rx="1" />;
              })}
              <text x={cx} y={height - 8} fontSize="10.5" fill="var(--ink3)" textAnchor="middle">{r.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="tiny" style={{ marginTop: 4 }}>
        Último ejercicio: {aLabel} {fmtBig(rows[rows.length - 1]?.a, currency)} · {bLabel} {fmtBig(rows[rows.length - 1]?.b, currency)}
      </div>
    </div>
  );
}

/** Rango 52 semanas con posición actual. */
export function Range52({ low, high, price, fmt }) {
  if (low == null || high == null || price == null) return null;
  const pct = Math.min(100, Math.max(0, ((price - low) / (high - low || 1)) * 100));
  return (
    <div className="range52">
      <div className="track">
        <div className="dot" style={{ left: `${pct}%` }} />
      </div>
      <div className="ends">
        <span>Mín. 52s · {fmt(low)}</span>
        <span>Máx. 52s · {fmt(high)}</span>
      </div>
    </div>
  );
}

/** Distribución de recomendaciones de analistas. */
export function RatingBars({ ratings }) {
  if (!ratings) return null;
  const rows = [
    ['Compra fuerte', ratings.StrongBuy, '#1e7a46'],
    ['Compra', ratings.Buy, '#5c9970'],
    ['Mantener', ratings.Hold, '#8a94a3'],
    ['Venta', ratings.Sell, '#cf6b60'],
    ['Venta fuerte', ratings.StrongSell, '#c0303c']
  ];
  const total = rows.reduce((a, [, v]) => a + (v || 0), 0) || 1;
  return (
    <div className="hb">
      {rows.map(([label, v, color]) => (
        <div className="hb-row" key={label}>
          <span className="hb-lab">{label}</span>
          <div className="hb-track"><div className="hb-fill" style={{ width: `${((v || 0) / total) * 100}%`, background: color }} /></div>
          <span className="hb-val">{v ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
