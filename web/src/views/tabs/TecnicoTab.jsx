import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Section, EstadoTag, KpiGrid, Kpi } from '../../components/Kpi.jsx';
import CandleChart, { IndicatorChart } from '../../components/CandleChart.jsx';
import { fmtNum, fmtPct, fmtPrice, clsPN } from '../../lib/format.js';

export default function TecnicoTab({ symbol, currency }) {
  const [tech, setTech] = useState(null);
  const [error, setError] = useState(null);
  const [verBB, setVerBB] = useState(false);

  useEffect(() => {
    let alive = true;
    setTech(null); setError(null);
    api(`/technicals/${symbol}`)
      .then((r) => alive && setTech(r))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [symbol]);

  if (error) return <div className="error-box section">Análisis técnico no disponible: {error}</div>;
  if (!tech) return <div className="loading">Calculando indicadores…</div>;
  if (tech.error) return <div className="error-box section">{tech.error}</div>;

  const { latest: l, series: s } = tech;
  const dates = s.candles.map((c) => c.date);

  return (
    <>
      <Section
        eyebrow="Precio · último año"
        title="Evolución"
        right={
          <div className="range-btns no-print">
            <button className={`range-btn${verBB ? ' active' : ''}`} onClick={() => setVerBB(!verBB)}>
              Bollinger
            </button>
          </div>
        }
      >
        <div className="card">
          <div className="chart-legend">
            <span><span className="sw" style={{ background: '#9c8459' }} />SMA 50</span>
            <span><span className="sw" style={{ background: '#201e1b' }} />SMA 200</span>
            {verBB && <span><span className="sw" style={{ background: 'rgba(168,30,51,0.45)' }} />Bandas de Bollinger (20, 2σ)</span>}
          </div>
          <CandleChart
            candles={s.candles}
            sma50={s.sma50}
            sma200={s.sma200}
            bbUpper={verBB ? s.bbUpper : null}
            bbLower={verBB ? s.bbLower : null}
          />
        </div>
      </Section>

      <div className="grid2 section">
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>RSI (14) — 70 sobrecompra · 30 sobreventa</div>
          <IndicatorChart
            dates={dates}
            lines={[{ data: s.rsi, color: '#a81e33' }]}
            levels={[{ value: 70, color: '#c9a26a' }, { value: 30, color: '#c9a26a' }]}
          />
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>MACD (12, 26, 9)</div>
          <IndicatorChart
            dates={dates}
            lines={[
              { data: s.macd, color: '#201e1b' },
              { data: s.macdSignal, color: '#9c8459' }
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
                  <td className="l" style={{ width: 170 }}><strong>{sig.nombre}</strong></td>
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