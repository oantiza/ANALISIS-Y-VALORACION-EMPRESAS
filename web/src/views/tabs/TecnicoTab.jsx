import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Section, EstadoTag, KpiGrid, Kpi } from '../../components/Kpi.jsx';
import CandleChart, { IndicatorChart } from '../../components/CandleChart.jsx';
import IndicatorInfo from '../../components/IndicatorInfo.jsx';
import { fmtNum, fmtPct, fmtPrice, clsPN } from '../../lib/format.js';

const CHART_RANGES = [
  { key: '6m', label: '6M', days: 183 },
  { key: '1y', label: '1A', days: 366 },
  { key: '3y', label: '3A', days: 3 * 366 },
  { key: '5y', label: '5A', days: 5 * 366 }
];

function visibleSeries(series, rangeKey) {
  const range = CHART_RANGES.find((item) => item.key === rangeKey) || CHART_RANGES[1];
  const candles = series?.candles || [];
  if (!candles.length) return series;
  const end = new Date(candles[candles.length - 1].date).getTime();
  const cutoff = new Date(end - range.days * 86400_000).toISOString().slice(0, 10);
  const start = Math.max(0, candles.findIndex((c) => c.date >= cutoff));
  const slice = (values) => values?.slice(start);
  return {
    candles: candles.slice(start),
    sma50: slice(series.sma50),
    sma200: slice(series.sma200),
    bbUpper: slice(series.bbUpper),
    bbLower: slice(series.bbLower),
    rsi: slice(series.rsi),
    macd: slice(series.macd),
    macdSignal: slice(series.macdSignal),
    macdHist: slice(series.macdHist)
  };
}

export default function TecnicoTab({ symbol, currency }) {
  const [tech, setTech] = useState(null);
  const [error, setError] = useState(null);
  const [verBB, setVerBB] = useState(false);
  const [chartRange, setChartRange] = useState('1y');

  useEffect(() => {
    let alive = true;
    setTech(null); setError(null);
    api(`/technicals/${symbol}?range=5y`)
      .then((r) => alive && setTech(r))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [symbol]);

  if (error) return <div className="error-box section">Análisis técnico no disponible: {error}</div>;
  if (!tech) return <div className="loading">Calculando indicadores…</div>;
  if (tech.error) return <div className="error-box section">{tech.error}</div>;

  const { latest: l } = tech;
  const s = visibleSeries(tech.series, chartRange);
  const dates = s.candles.map((c) => c.date);
  const rangeName = CHART_RANGES.find((item) => item.key === chartRange)?.label || '1A';

  return (
    <>
      <Section
        eyebrow={`Precio · ${rangeName}`}
        title="Evolución"
        right={
          <div className="chart-controls no-print">
            <div className="range-btns" role="group" aria-label="Periodo del gráfico">
              {CHART_RANGES.map((item) => (
                <button
                  key={item.key}
                  className={`range-btn${chartRange === item.key ? ' active' : ''}`}
                  type="button"
                  aria-pressed={chartRange === item.key}
                  onClick={() => setChartRange(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button className={`range-btn${verBB ? ' active' : ''}`} onClick={() => setVerBB(!verBB)}>
              Bollinger
            </button>
          </div>
        }
      >
        <div className="card">
          <div className="chart-legend">
            <span><span className="sw" style={{ background: 'var(--sma50)' }} /><IndicatorInfo name="SMA 50" /></span>
            <span><span className="sw" style={{ background: 'var(--sma200)' }} /><IndicatorInfo name="SMA 200" /></span>
            {verBB && <span><span className="sw" style={{ background: 'var(--bb)' }} /><IndicatorInfo name="Bandas de Bollinger" /> (20, 2σ)</span>}
          </div>
          <CandleChart
            candles={s.candles}
            sma50={s.sma50}
            sma200={s.sma200}
            bbUpper={verBB ? s.bbUpper : null}
            bbLower={verBB ? s.bbLower : null}
          />
          <div className="chart-hint">Arrastra para desplazarte · pellizca o usa la rueda para ampliar</div>
        </div>
      </Section>

      <div className="grid2 section">
        <div className="card">
          <div className="eyebrow indicator-heading" style={{ marginBottom: 8 }}><IndicatorInfo name="RSI (14)" /><span>— 70 sobrecompra · 30 sobreventa</span></div>
          <IndicatorChart
            dates={dates}
            lines={[{ data: s.rsi, color: '--gold' }]}
            levels={[{ value: 70, color: '--ink3' }, { value: 30, color: '--ink3' }]}
          />
        </div>
        <div className="card">
          <div className="eyebrow indicator-heading" style={{ marginBottom: 8 }}><IndicatorInfo name="MACD" /><span>(12, 26, 9)</span></div>
          <IndicatorChart
            dates={dates}
            lines={[
              { data: s.macd, color: '--sma200' },
              { data: s.macdSignal, color: '--sma50' }
            ]}
            histogram={s.macdHist}
          />
        </div>
      </div>

      <Section eyebrow="Diagnóstico" title="Señales">
        <div className="card">
          <table className="tbl">
            <tbody>
              {l.senales.map((sig) => (
                <tr key={sig.nombre}>
                  <td className="l" style={{ width: 170 }}><strong><IndicatorInfo name={sig.nombre} /></strong></td>
                  <td className="l muted">{sig.detalle}</td>
                  <td style={{ width: 130 }}><EstadoTag estado={sig.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow="Métricas" title="Indicadores y riesgo">
        <KpiGrid>
          <Kpi label="RSI (14)" value={fmtNum(l.rsi14, 1)} />
          <Kpi label="SMA 50 / 200" value={`${fmtNum(l.sma50, 2)} / ${fmtNum(l.sma200, 2)}`} />
          <Kpi label="ATR (14)" value={fmtNum(l.atr14, 2)} sub={l.close ? `${fmtNum((l.atr14 / l.close) * 100, 1)} % del precio` : null} />
          <Kpi label="Volatilidad 30d (anual.)" value={l.vol30 != null ? fmtPct(l.vol30, 1, false) : '—'} />
          <Kpi label="Distancia a máx. 52s" value={fmtPct(l.distHigh52, 1)} cls={clsPN(l.distHigh52)} sub={fmtPrice(l.high52, currency)} />
          <Kpi label="Distancia a mín. 52s" value={fmtPct(l.distLow52, 1)} cls={clsPN(l.distLow52)} sub={fmtPrice(l.low52, currency)} />
          <Kpi label="Caída máxima (1a)" value={fmtPct(l.maxDrawdown1y, 1)} cls="neg" />
          <Kpi label="Bollinger" value={`${fmtNum(l.bbLower, 1)} — ${fmtNum(l.bbUpper, 1)}`} sub={`Media ${fmtNum(l.bbMid, 1)}`} />
        </KpiGrid>
      </Section>

      <Section eyebrow="Rendimiento" title="Por periodos">
        <KpiGrid>
          {[['1 semana', l.perf.w1], ['1 mes', l.perf.m1], ['3 meses', l.perf.m3], ['6 meses', l.perf.m6], ['Año en curso', l.perf.ytd], ['12 meses', l.perf.y1]].map(([lab, val]) => (
            <Kpi key={lab} label={lab} value={fmtPct(val)} cls={clsPN(val)} />
          ))}
        </KpiGrid>
      </Section>

      <p className="note section">
        Indicadores calculados sobre precios de cierre diarios ({tech.source === 'yahoo' ? 'Yahoo Finance, respaldo' : 'EODHD'}).
        Lectura orientativa: no constituye recomendación de inversión.
      </p>
    </>
  );
}
