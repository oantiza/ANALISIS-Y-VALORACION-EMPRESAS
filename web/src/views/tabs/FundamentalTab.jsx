import React from 'react';
import { KpiGrid, Kpi, Section } from '../../components/Kpi.jsx';
import { DualBars, RatingBars } from '../../components/SvgCharts.jsx';
import { fmtBig, fmtNum, fmtPct, fmtRatio, fmtDate, clsPN, pct100 } from '../../lib/format.js';

const N = (x) => (x == null || x === 'NA' ? null : Number(x));

function yearlyRows(fund, statement, fields) {
  const y = fund?.Financials?.[statement]?.yearly || {};
  return Object.keys(y).sort().map((date) => {
    const row = { date, label: date.slice(0, 4) };
    for (const f of fields) row[f] = N(y[date][f]);
    return row;
  });
}

export default function FundamentalTab({ fund }) {
  const h = fund?.Highlights || {};
  const v = fund?.Valuation || {};
  const ss = fund?.SharesStats || {};
  const sd = fund?.SplitsDividends || {};
  const ar = fund?.AnalystRatings;
  const g = fund?.General || {};
  const currency = fund?.Financials?.Income_Statement?.currency_symbol || g.CurrencyCode;

  const income = yearlyRows(fund, 'Income_Statement', ['totalRevenue', 'grossProfit', 'operatingIncome', 'netIncome', 'ebitda']);
  const balance = yearlyRows(fund, 'Balance_Sheet', ['totalAssets', 'totalLiab', 'totalStockholderEquity', 'cash', 'netDebt', 'shortLongTermDebtTotal']);
  const cashflow = yearlyRows(fund, 'Cash_Flow', ['totalCashFromOperatingActivities', 'capitalExpenditures', 'freeCashFlow', 'dividendsPaid']);

  const earnHist = Object.values(fund?.Earnings?.History || {})
    .filter((e) => e?.epsActual != null)
    .sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1))
    .slice(0, 8);

  const instituciones = Object.values(fund?.Holders?.Institutions || {}).slice(0, 8);

  return (
    <>
      <Section eyebrow="Valoración" title="Múltiplos">
        <KpiGrid>
          <Kpi label="PER (ttm)" value={fmtRatio(N(h.PERatio))} />
          <Kpi label="PER estimado" value={fmtRatio(N(v.ForwardPE))} />
          <Kpi label="PEG" value={fmtRatio(N(h.PEGRatio))} />
          <Kpi label="Precio / Ventas" value={fmtRatio(N(v.PriceSalesTTM))} />
          <Kpi label="Precio / Valor contable" value={fmtRatio(N(v.PriceBookMRQ))} />
          <Kpi label="EV" value={fmtBig(N(v.EnterpriseValue), currency)} />
          <Kpi label="EV / Ventas" value={fmtRatio(N(v.EnterpriseValueRevenue))} />
          <Kpi label="EV / EBITDA" value={fmtRatio(N(v.EnterpriseValueEbitda))} />
        </KpiGrid>
      </Section>

      <Section eyebrow="Rentabilidad y crecimiento" title="Calidad del negocio">
        <KpiGrid>
          <Kpi label="Margen bruto (ttm)" value={h.GrossProfitTTM && h.RevenueTTM ? fmtPct((N(h.GrossProfitTTM) / N(h.RevenueTTM)) * 100, 1, false) : '—'} />
          <Kpi label="Margen operativo" value={fmtPct(pct100(h.OperatingMarginTTM), 1, false)} />
          <Kpi label="Margen neto" value={fmtPct(pct100(h.ProfitMargin), 1, false)} />
          <Kpi label="ROE" value={fmtPct(pct100(h.ReturnOnEquityTTM), 1, false)} />
          <Kpi label="ROA" value={fmtPct(pct100(h.ReturnOnAssetsTTM), 1, false)} />
          <Kpi label="Crec. ingresos (a/a)" value={fmtPct(pct100(h.QuarterlyRevenueGrowthYOY), 1)} cls={clsPN(pct100(h.QuarterlyRevenueGrowthYOY))} />
          <Kpi label="Crec. beneficio (a/a)" value={fmtPct(pct100(h.QuarterlyEarningsGrowthYOY), 1)} cls={clsPN(pct100(h.QuarterlyEarningsGrowthYOY))} />
          <Kpi label="BPA (ttm)" value={h.EarningsShare != null ? fmtNum(N(h.EarningsShare), 2) : '—'} sub={h.EPSEstimateNextYear ? `Est. próx. año ${fmtNum(N(h.EPSEstimateNextYear), 2)}` : null} />
        </KpiGrid>
      </Section>

      {income.length > 0 && (
        <Section eyebrow="Cuenta de resultados" title="Ingresos y beneficio">
          <div className="grid2">
            <div className="card">
              <DualBars
                rows={income.map((r) => ({ label: r.label, a: r.totalRevenue, b: r.netIncome }))}
                aLabel="Ingresos" bLabel="Beneficio neto" currency={currency}
              />
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th className="l">Ejercicio</th><th>Ingresos</th><th>EBITDA</th><th>Bº operativo</th><th>Bº neto</th><th>Margen neto</th></tr>
                </thead>
                <tbody>
                  {[...income].reverse().map((r) => (
                    <tr key={r.date}>
                      <td className="l">{r.label}</td>
                      <td className="num">{fmtBig(r.totalRevenue, currency)}</td>
                      <td className="num">{fmtBig(r.ebitda, currency)}</td>
                      <td className="num">{fmtBig(r.operatingIncome, currency)}</td>
                      <td className={`num ${clsPN(r.netIncome)}`}>{fmtBig(r.netIncome, currency)}</td>
                      <td className="num">{r.totalRevenue ? fmtPct((r.netIncome / r.totalRevenue) * 100, 1, false) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      <div className="grid2 section">
        {balance.length > 0 && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Balance</div>
            <table className="tbl">
              <thead>
                <tr><th className="l">Ejercicio</th><th>Activos</th><th>Patrimonio</th><th>Caja</th><th>Deuda neta</th></tr>
              </thead>
              <tbody>
                {[...balance].reverse().map((r) => (
                  <tr key={r.date}>
                    <td className="l">{r.label}</td>
                    <td className="num">{fmtBig(r.totalAssets, currency)}</td>
                    <td className="num">{fmtBig(r.totalStockholderEquity, currency)}</td>
                    <td className="num">{fmtBig(r.cash, currency)}</td>
                    <td className="num">{fmtBig(r.netDebt, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cashflow.length > 0 && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Flujos de caja</div>
            <table className="tbl">
              <thead>
                <tr><th className="l">Ejercicio</th><th>Flujo operativo</th><th>Capex</th><th>FCF</th><th>Dividendos</th></tr>
              </thead>
              <tbody>
                {[...cashflow].reverse().map((r) => (
                  <tr key={r.date}>
                    <td className="l">{r.label}</td>
                    <td className="num">{fmtBig(r.totalCashFromOperatingActivities, currency)}</td>
                    <td className="num">{fmtBig(r.capitalExpenditures, currency)}</td>
                    <td className={`num ${clsPN(r.freeCashFlow)}`}>{fmtBig(r.freeCashFlow, currency)}</td>
                    <td className="num">{fmtBig(r.dividendsPaid, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid2 section">
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Dividendos</div>
          <table className="tbl">
            <tbody>
              <tr><td className="l">Dividendo anual estimado</td><td className="num">{sd.ForwardAnnualDividendRate != null ? fmtNum(N(sd.ForwardAnnualDividendRate), 2) : '—'}</td></tr>
              <tr><td className="l">Rentabilidad estimada</td><td className="num">{fmtPct(pct100(sd.ForwardAnnualDividendYield), 2, false)}</td></tr>
              <tr><td className="l">Pay-out</td><td className="num">{fmtPct(pct100(sd.PayoutRatio), 1, false)}</td></tr>
              <tr><td className="l">Próximo pago</td><td className="num">{fmtDate(sd.DividendDate)}</td></tr>
              <tr><td className="l">Ex-dividendo</td><td className="num">{fmtDate(sd.ExDividendDate)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Accionariado</div>
          <table className="tbl">
            <tbody>
              <tr><td className="l">Acciones en circulación</td><td className="num">{fmtBig(N(ss.SharesOutstanding))}</td></tr>
              <tr><td className="l">% institucionales</td><td className="num">{ss.PercentInstitutions != null ? fmtPct(N(ss.PercentInstitutions), 1, false) : '—'}</td></tr>
              <tr><td className="l">% insiders</td><td className="num">{ss.PercentInsiders != null ? fmtPct(N(ss.PercentInsiders), 2, false) : '—'}</td></tr>
            </tbody>
          </table>
          {instituciones.length > 0 && (
            <>
              <div className="tiny" style={{ margin: '12px 0 6px' }}>Principales instituciones</div>
              <table className="tbl">
                <tbody>
                  {instituciones.map((i2) => (
                    <tr key={i2.name}>
                      <td className="l" style={{ fontSize: 11 }}>{i2.name}</td>
                      <td className="num tiny">{i2.totalShares != null ? fmtPct(N(i2.totalShares), 2, false) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <div className="grid2 section">
        {ar && (
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Recomendaciones de analistas</div>
            <RatingBars ratings={ar} />
          </div>
        )}
        {earnHist.length > 0 && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Historial de resultados (BPA)</div>
            <table className="tbl">
              <thead>
                <tr><th className="l">Trimestre</th><th>BPA real</th><th>Estimado</th><th>Sorpresa</th></tr>
              </thead>
              <tbody>
                {earnHist.map((e) => (
                  <tr key={e.reportDate}>
                    <td className="l">{fmtDate(e.reportDate)}</td>
                    <td className="num">{fmtNum(N(e.epsActual), 2)}</td>
                    <td className="num muted">{fmtNum(N(e.epsEstimate), 2)}</td>
                    <td className={`num ${clsPN(N(e.surprisePercent))}`}>{fmtPct(N(e.surprisePercent), 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="note section">
        Fundamentales de EODHD, actualizados como máximo cada 7 días en caché. Los importes se muestran
        en {currency || 'divisa local'}; «mm» = miles de millones.
      </p>
    </>
  );
}