import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { api } from '../api.js';
import { Section } from '../components/Kpi.jsx';
import { fmtPrice, fmtPct, clsPN, fmtDateTime } from '../lib/format.js';

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [quotes, setQuotes] = useState({});
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
      const results = await Promise.allSettled(items.map((it) => api(`/quote/${it.symbol}`)));
      if (!alive) return;
      const map = {};
      results.forEach((r, i) => { if (r.status === 'fulfilled') map[items[i].symbol] = r.value; });
      setQuotes(map);
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
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="l">Valor</th>
                  <th className="l">Mercado</th>
                  <th>Último</th>
                  <th>Var. día</th>
                  <th>Actualizado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const q = quotes[it.symbol];
                  return (
                    <tr key={it.symbol} className="click" onClick={() => navigate(`/empresa/${it.symbol}`)}>
                      <td className="l">
                        <strong>{it.name || it.symbol}</strong>
                        <div className="tiny">{it.symbol}</div>
                      </td>
                      <td className="l muted">{it.exchange || '—'}</td>
                      <td className="num">{q ? fmtPrice(q.price, it.currency) : '…'}</td>
                      <td className={`num ${q ? clsPN(q.changePct) : ''}`}>{q ? fmtPct(q.changePct) : '…'}</td>
                      <td className="num tiny">{q ? fmtDateTime(q.timestamp || q.fetchedAt) : ''}</td>
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
            Cotizaciones vía EODHD con respaldo de Yahoo Finance · pueden llevar retardo según mercado.
          </p>
        </Section>
      )}
    </>
  );
}