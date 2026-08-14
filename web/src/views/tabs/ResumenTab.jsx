import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { KpiGrid, Kpi, Section, EstadoTag } from '../../components/Kpi.jsx';
import { Sparkline, Range52 } from '../../components/SvgCharts.jsx';
import IndicatorInfo from '../../components/IndicatorInfo.jsx';
import { fmtBig, fmtNum, fmtPct, fmtRatio, fmtPrice, clsPN, fmtDate, pct100 } from '../../lib/format.js';

export default function ResumenTab({ symbol, fund, quote }) {
  const [eod, setEod] = useState(null);
  const [tech, setTech] = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/eod/${symbol}?range=1y`).then((r) => alive && setEod(r)).catch(() => {});
    api(`/technicals/${symbol}`).then((r) => alive && setTech(r)).catch(() => {});
    return () => { alive = false; };
  }, [symbol]);

  const h = fund?.Highlights || {};
  const v = fund?.Valuation || {};
  const t = fund?.Technicals || {};
  const g = fund?.General || {};
  const ar = fund?.AnalystRatings;
  const currency = g.CurrencyCode;
  const price = quote?.price ?? null;

  const target = h.WallStreetTargetPrice ?? ar?.TargetPrice;
  const potencial = price && target ? ((target - price) / price) * 100 : null;

  return (
    <>
      <Section eyebrow="Claves" title="De un vistazo">
        <KpiGrid>
          <Kpi label="Capitalización" value={fmtBig(h.MarketCapitalization, currency)} />
          <Kpi label="PER (ttm)" value={fmtRatio(h.PERatio)} sub={v.ForwardPE ? `Forward ${fmtRatio(v.ForwardPE)}` : null} />
          <Kpi label="EV / EBITDA" value={fmtRatio(v.EnterpriseValueEbitda)} />
          <Kpi label="Rent. por dividendo" value={fmtPct(pct100(h.DividendYield), 2, false)} />
          <Kpi label="ROE (ttm)" value={fmtPct(pct100(h.ReturnOnEquityTTM), 1, false)} />
          <Kpi label="Margen neto" value={fmtPct(pct100(h.ProfitMargin), 1, false)} />
          <Kpi label="Beta" value={t.Beta != null ? fmtNum(t.Beta, 2) : '—'} />
          <Kpi
            label="Precio objetivo"
            value={target ? fmtPrice(target, currency) : '—'}
            sub={potencial != null ? `Potencial ${fmtPct(potencial, 1)}` : null}
            cls={clsPN(potencial)}
          />
        </KpiGrid>
      </Section>

      <div className="grid2 section">
        <div className="card">
          <div className="eyebrow">Cotización · último año</div>
          {eod?.candles?.length ? (
            <div style={{ marginTop: 12 }}>
              <Sparkline candles={eod.candles} />
              <Range52
                low={tech?.latest?.low52 ?? t['52WeekLow']}
                high={tech?.latest?.high52 ?? t['52WeekHigh']}
                price={price}
                fmt={(x) => fmtPrice(x, currency)}
              />
            </div>
          ) : (
            <div className="loading">Cargando serie…</div>
          )}
        </div>

        <div className="card">
          <div className="eyebrow">Lectura técnica</div>
          {tech?.latest?.senales ? (
            <table className="tbl" style={{ marginTop: 12 }}>
              <tbody>
                {tech.latest.senales.map((s) => (
                  <tr key={s.nombre}>
                    <td className="l"><IndicatorInfo name={s.nombre} /></td>
                    <td className="l muted" style={{ fontSize: 11 }}>{s.detalle}</td>
                    <td><EstadoTag estado={s.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="loading">Calculando…</div>
          )}
          {tech?.latest?.perf && (
            <div className="tiny" style={{ marginTop: 10 }}>
              1 mes <b className={clsPN(tech.latest.perf.m1)}>{fmtPct(tech.latest.perf.m1)}</b> ·
              YTD <b className={clsPN(tech.latest.perf.ytd)}>{fmtPct(tech.latest.perf.ytd)}</b> ·
              1 año <b className={clsPN(tech.latest.perf.y1)}>{fmtPct(tech.latest.perf.y1)}</b>
            </div>
          )}
        </div>
      </div>

      {g.Description && (
        <Section eyebrow="La compañía" title={null}>
          <p className="lead">{String(g.Description).slice(0, 900)}{String(g.Description).length > 900 ? '…' : ''}</p>
          <div className="tiny" style={{ marginTop: 10 }}>
            {g.FullTimeEmployees ? `${fmtNum(g.FullTimeEmployees, 0)} empleados · ` : ''}
            {g.WebURL && <a href={g.WebURL} target="_blank" rel="noreferrer">{g.WebURL}</a>}
            {g.IPODate ? ` · Cotiza desde ${fmtDate(g.IPODate)}` : ''}
          </div>
        </Section>
      )}

      {ar && (ar.StrongBuy || ar.Buy || ar.Hold) != null && (
        <Section eyebrow="Consenso" title="Analistas">
          <div className="card">
            <div style={{ display: 'flex', gap: 30, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div>
                <span className="eyebrow">Valoración media</span>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 30, marginTop: 4 }}>
                  {ar.Rating != null ? fmtNum(ar.Rating, 2) : '—'}<span className="tiny"> / 5</span>
                </div>
              </div>
              <div className="tiny">
                {(ar.StrongBuy ?? 0) + (ar.Buy ?? 0)} recomendaciones de compra ·{' '}
                {ar.Hold ?? 0} mantener · {(ar.Sell ?? 0) + (ar.StrongSell ?? 0)} venta
              </div>
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
