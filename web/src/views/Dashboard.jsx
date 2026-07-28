import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { api } from '../api.js';
import { Section } from '../components/Kpi.jsx';
import { fmtPrice, fmtPct, fmtNum, clsPN } from '../lib/format.js';

function consLabel(r) {
  if (r == null) return null;
  if (r >= 4.5) return 'Compra fuerte';
  if (r >= 3.5) return 'Compra';
  if (r >= 2.5) return 'Mantener';
  if (r >= 1.5) return 'Venta';
  return 'Venta fuerte';
}

function consCls(r) {
  if (r == null) return '';
  if (r >= 3.5) return 'pos';
  if (r < 2.5) return 'neg';
  return '';
}

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [cons, setCons] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'av_watchlist'), orderBy('addedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error(err);
      setItems([]);
    });
  }, []);

  useEffect(() => {
    if (!items?.length) return;
    let alive = true;
    (async () => {
      const [qr, cr] = await Promise.all([
        Promise.allSettled(items.map((it) => api(`/quote/${it.symbol}`))),
        Promise.allSettled(items.map((it) => api(`/consensus/${it.symbol}`)))
      ]);
      if (!alive) return;
      const qMap = {}, cMap = {};
      qr.forEach((r, i) => { if (r.status === 'fulfilled') qMap[items[i].symbol] = r.value; });
      cr.forEach((r, i) => { if (r.status === 'fulfilled') cMap[items[i].symbol] = r.value; });
      setQuotes(qMap);
      setCons(cMap);
    })();
    return () => { alive = false; };
  }, [items]);

  async function quitar(e, symbol) {
    e.stopPropagation();
    await deleteDoc(doc(db, 'av_watchlist', symbol));
  }

  return (
    <>
      <div className="eyebrow">Panel de seguimiento</div>
      <h1 className="page-title">Mis valores</h1>
      <hr className="rule" />

      {items === null && <div className="loading">Cargando…</div>}

      {items?.length === 0 && (
        <div className="empty">
          <div className="big">Todavía no sigues ningún valor</div>
          Busca una empresa en la barra superior — por nombre, ticker o ISIN — y añádela
          a tu lista desde su ficha.
        </div>
      )}

      {items?.length > 0 && (
        <Section>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l">Valor</th>
                  <th>Último</th>
                  <th>Var. día</th>
                  <th>Precio objetivo</th>
                  <th>Potencial</th>
                  <th>Consenso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const q = quotes[it.symbol];
                  const c = cons[it.symbol];
                  const target = c?.targetPrice ?? null;
                  const potencial = q?.price && target ? ((target - q.price) / q.price) * 100 : null;
                  const counts = c && c.strongBuy != null
                    ? `${(c.strongBuy ?? 0) + (c.buy ?? 0)} compra · ${c.hold ?? 0} mantener · ${(c.sell ?? 0) + (c.strongSell ?? 0)} venta`
                    : null;
                  return (
                    <tr key={it.symbol} className="click" onClick={() => navigate(`/empresa/${it.symbol}`)}>
                      <td className="l">
                        <strong>{it.name || it.symbol}</strong>
                        <div className="tiny">{it.symbol} · {it.exchange || '—'}</div>
                      </td>
                      <td className="num">{q ? fmtPrice(q.price, it.currency) : '…'}</td>
                      <td className={`num ${q ? clsPN(q.changePct) : ''}`}>{q ? fmtPct(q.changePct) : '…'}</td>
                      <td className="num">{target ? fmtPrice(target, c?.currency || it.currency) : '—'}</td>
                      <td className={`num ${clsPN(potencial)}`}>{potencial != null ? fmtPct(potencial, 1) : '—'}</td>
                      <td className="num" title={counts || 'Sin cobertura de analistas'}>
                        {c?.rating != null ? (
                          <>
                            <span className={consCls(c.rating)}>{consLabel(c.rating)}</span>
                            <div className="tiny">{fmtNum(c.rating, 1)} / 5</div>
                          </>
                        ) : '—'}
                      </td>
                      <td>
                        <button className="mini-btn" title="Quitar de la lista" onClick={(e) => quitar(e, it.symbol)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="tiny" style={{ marginTop: 10 }}>
            Cotizaciones vía EODHD (respaldo Yahoo) · precio objetivo y consenso del agregado de analistas de EODHD,
            actualizados con los fundamentales (máx. 7 días) · pasa el ratón por el consenso para ver el desglose.
          </p>
        </Section>
      )}
    </>
  );
}