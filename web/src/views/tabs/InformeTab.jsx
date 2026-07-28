import React, { useEffect, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { api } from '../../api.js';
import { Sparkline, Range52 } from '../../components/SvgCharts.jsx';
import { EstadoTag } from '../../components/Kpi.jsx';
import { fmtBig, fmtNum, fmtPct, fmtRatio, fmtPrice, fmtDate, clsPN, pct100 } from '../../lib/format.js';

const N = (x) => (x == null || x === 'NA' ? null : Number(x));

export default function InformeTab({ symbol, fund, quote }) {
  const [eod, setEod] = useState(null);
  const [tech, setTech] = useState(null);
  const [news, setNews] = useState(null);
  const [saved, setSaved] = useState(false);

  const g = fund?.General || {};
  const h = fund?.Highlights || {};
  const v = fund?.Valuation || {};
  const ar = fund?.AnalystRatings;
  const currency = g.CurrencyCode;

  useEffect(() => {
    let alive = true;
    api(`/eod/${symbol}?range=1y`).then((r) => alive && setEod(r)).catch(() => {});
    api(`/technicals/${symbol}`).then((r) => alive && setTech(r)).catch(() => {});
    api(`/news/${symbol}?name=${encodeURIComponent(g.Name || '')}`).then((r) => alive && setNews(r)).catch(() => {});
    return () => { alive = false; };
  }, [symbol, g.Name]);

  const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const l = tech?.latest;

  async function guardar() {
    const id = `${symbol}_${new Date().toISOString().slice(0, 10)}`;
    await setDoc(doc(db, 'av_informes', id), {
      symbol,
      name: g.Name || symbol,
      createdAt: serverTimestamp(),
      snapshot: {
        price: quote?.price ?? null,
        changePct: quote?.changePct ?? null,
        marketCap: N(h.MarketCapitalization),
        per: N(h.PERatio),
        divYield: N(h.DividendYield),
        target: N(h.WallStreetTargetPrice ?? ar?.TargetPrice),
        rating: N(ar?.Rating),
        rsi: l?.rsi14 ?? null,
        senales: l?.senales ?? [],
        perf: l?.perf ?? null
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const income = Object.entries(fund?.Financials?.Income_Statement?.yearly || {}).sort().slice(-5);
  const cash = Object.entries(fund?.Financials?.Cash_Flow?.yearly || {}).sort().slice(-5);
  const topNews = (news?.items || []).slice(0, 5);
  const target = N(h.WallStreetTargetPrice ?? ar?.TargetPrice);
  const potencial = quote?.price && target ? ((target - quote.price) / quote.price) * 100 : null;

  const Brand = () => (
    <div className="brand-p">
      <div className="b1">O.A.A</div>
      <div className="b2">Private Bankers</div>
    </div>
  );

  const Foot = ({ n }) => (
    <div className="foot-print">
      <span>O.A.A ∕ Análisis de Empresas · Documento interno — no es recomendación de inversión</span>
      <span>{hoy} · pág. {n}</span>
    </div>
  );

  return (
    <>
      <div className="informe-toolbar no-print section">
        <button className="btn-solid" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button className="btn-ghost" onClick={guardar}>{saved ? '✓ Guardado' : 'Archivar informe'}</button>
        <span className="tiny">La ficha se imprime en A4 vertical (2 páginas) con el sello O.A.A.</span>
      </div>

      <div className="a4-stage print-root">
        {/* ---------- PÁGINA 1 ---------- */}
        <div className="page">
          <div className="head">
            <div>
              <div className="eyebrow">Ficha de valor · {hoy}</div>
              <div className="sec">{g.Name || symbol}</div>
              <div className="tiny" style={{ marginTop: 4 }}>
                {symbol} · {g.Exchange} · {g.Sector}{g.Industry ? ` — ${g.Industry}` : ''} · {g.CountryName}
                {g.ISIN ? ` · ISIN ${g.ISIN}` : ''}
              </div>
            </div>
            <Brand />
          </div>
          <hr className="rule" />

          <div className="kpis-p">
            <div className="kpi-p">
              <div className="k">Cotización</div>
              <div className="v">{fmtPrice(quote?.price, currency)}</div>
              <div className={`s ${clsPN(quote?.changePct)}`}>{fmtPct(quote?.changePct)} hoy</div>
            </div>
            <div className="kpi-p">
              <div className="k">Capitalización</div>
              <div className="v">{fmtBig(N(h.MarketCapitalization), currency)}</div>
            </div>
            <div className="kpi-p">
              <div className="k">PER (ttm)</div>
              <div className="v">{fmtRatio(N(h.PERatio))}</div>
              <div className="s">Forward {fmtRatio(N(v.ForwardPE))}</div>
            </div>
            <div className="kpi-p">
              <div className="k">Precio objetivo</div>
              <div className="v">{target ? fmtPrice(target, currency) : '—'}</div>
              {potencial != null && <div className={`s ${clsPN(potencial)}`}>Potencial {fmtPct(potencial, 1)}</div>}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="eyebrow">Evolución · últimos 12 meses</div>
            {eod?.candles?.length ? (
              <div style={{ marginTop: 8 }}>
                <Sparkline candles={eod.candles} width={640} height={170} />
                <Range52 low={l?.low52} high={l?.high52} price={quote?.price} fmt={(x) => fmtPrice(x, currency)} />
              </div>
            ) : <div className="tiny">Cargando serie…</div>}
          </div>

          <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 18 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Valoración</div>
              <table>
                <tbody>
                  <tr><td className="l">PER (ttm / forward)</td><td>{fmtRatio(N(h.PERatio))} / {fmtRatio(N(v.ForwardPE))}</td></tr>
                  <tr><td className="l">EV / EBITDA</td><td>{fmtRatio(N(v.EnterpriseValueEbitda))}</td></tr>
                  <tr><td className="l">Precio / Ventas</td><td>{fmtRatio(N(v.PriceSalesTTM))}</td></tr>
                  <tr><td className="l">Precio / Valor contable</td><td>{fmtRatio(N(v.PriceBookMRQ))}</td></tr>
                  <tr><td className="l">Rentabilidad por dividendo</td><td>{fmtPct(pct100(h.DividendYield), 2, false)}</td></tr>
                  <tr><td className="l">Beta</td><td>{fmtNum(N(fund?.Technicals?.Beta), 2)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Calidad</div>
              <table>
                <tbody>
                  <tr><td className="l">Ingresos (ttm)</td><td>{fmtBig(N(h.RevenueTTM), currency)}</td></tr>
                  <tr><td className="l">Margen operativo</td><td>{fmtPct(pct100(h.OperatingMarginTTM), 1, false)}</td></tr>
                  <tr><td className="l">Margen neto</td><td>{fmtPct(pct100(h.ProfitMargin), 1, false)}</td></tr>
                  <tr><td className="l">ROE</td><td>{fmtPct(pct100(h.ReturnOnEquityTTM), 1, false)}</td></tr>
                  <tr><td className="l">Crec. ingresos (a/a)</td><td>{fmtPct(pct100(h.QuarterlyRevenueGrowthYOY), 1)}</td></tr>
                  <tr><td className="l">BPA (ttm)</td><td>{fmtNum(N(h.EarningsShare), 2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {l?.senales && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Lectura técnica</div>
              <table>
                <tbody>
                  {l.senales.map((s2) => (
                    <tr key={s2.nombre}>
                      <td className="l" style={{ width: '30%' }}><strong>{s2.nombre}</strong></td>
                      <td className="l" style={{ color: 'var(--ink2)' }}>{s2.detalle}</td>
                      <td style={{ width: 110 }}><EstadoTag estado={s2.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Foot n={1} />
        </div>

        {/* ---------- PÁGINA 2 ---------- */}
        <div className="page">
          <div className="head">
            <div>
              <div className="eyebrow">Ficha de valor · {g.Name || symbol}</div>
              <div className="sec">Fundamentales y actualidad</div>
            </div>
            <Brand />
          </div>
          <hr className="rule" />

          {income.length > 0 && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Cuenta de resultados (anual, {currency})</div>
              <table>
                <thead>
                  <tr><th className="l">Ejercicio</th><th>Ingresos</th><th>EBITDA</th><th>Bº neto</th><th>Margen neto</th><th>FCF</th></tr>
                </thead>
                <tbody>
                  {income.map(([date, r], idx) => {
                    const fcf = N(cash.find(([d2]) => d2 === date)?.[1]?.freeCashFlow);
                    return (
                      <tr key={date}>
                        <td className="l">{date.slice(0, 4)}</td>
                        <td>{fmtBig(N(r.totalRevenue), currency)}</td>
                        <td>{fmtBig(N(r.ebitda), currency)}</td>
                        <td className={clsPN(N(r.netIncome))}>{fmtBig(N(r.netIncome), currency)}</td>
                        <td>{N(r.totalRevenue) ? fmtPct((N(r.netIncome) / N(r.totalRevenue)) * 100, 1, false) : '—'}</td>
                        <td>{fmtBig(fcf, currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {ar && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Consenso de analistas</div>
              <table>
                <tbody>
                  <tr>
                    <td className="l">Valoración media (1-5)</td><td>{fmtNum(N(ar.Rating), 2)}</td>
                    <td className="l" style={{ paddingLeft: 20 }}>Compra / Mantener / Venta</td>
                    <td>{(ar.StrongBuy ?? 0) + (ar.Buy ?? 0)} / {ar.Hold ?? 0} / {(ar.Sell ?? 0) + (ar.StrongSell ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {l?.perf && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Rendimiento</div>
              <table>
                <thead>
                  <tr><th>1 sem.</th><th>1 mes</th><th>3 meses</th><th>6 meses</th><th>YTD</th><th>12 meses</th></tr>
                </thead>
                <tbody>
                  <tr>
                    {[l.perf.w1, l.perf.m1, l.perf.m3, l.perf.m6, l.perf.ytd, l.perf.y1].map((p, i) => (
                      <td key={i} className={clsPN(p)}>{fmtPct(p)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {topNews.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Últimas noticias</div>
              <table>
                <tbody>
                  {topNews.map((n, i) => (
                    <tr key={i}>
                      <td className="l" style={{ width: 84, color: 'var(--ink3)' }}>{fmtDate(n.date)}</td>
                      <td className="l">{n.title}<span style={{ color: 'var(--ink3)' }}> — {n.source}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {g.Description && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>La compañía</div>
              <p style={{ fontSize: 10.5, color: 'var(--ink2)', lineHeight: 1.55 }}>
                {String(g.Description).slice(0, 620)}{String(g.Description).length > 620 ? '…' : ''}
              </p>
            </div>
          )}

          <div className="note" style={{ marginTop: 18 }}>
            Datos: EODHD (fundamentales, cotizaciones y noticias financieras) con respaldo de Yahoo Finance y
            Google News. Documento generado automáticamente el {hoy}. No constituye asesoramiento ni
            recomendación de compra o venta de valores.
          </div>

          <Foot n={2} />
        </div>
      </div>
    </>
  );
}