import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Section } from '../../components/Kpi.jsx';
import { fmtDateTime } from '../../lib/format.js';

function sentColor(s) {
  if (s == null) return 'transparent';
  if (s > 0.15) return '#2e6b4e';
  if (s < -0.15) return '#a81e33';
  return '#9c8459';
}

export default function NoticiasTab({ symbol, name }) {
  const [news, setNews] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    let alive = true;
    setNews(null); setError(null);
    api(`/news/${symbol}?name=${encodeURIComponent(name || '')}`)
      .then((r) => alive && setNews(r))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [symbol, name]);

  if (error) return <div className="error-box section">No se pudieron cargar las noticias: {error}</div>;
  if (!news) return <div className="loading">Buscando las últimas noticias…</div>;

  const items = (news.items || []).filter((n) =>
    filtro === 'todas' ? true : filtro === 'eodhd' ? n.provider === 'eodhd' : n.provider !== 'eodhd'
  );

  return (
    <Section
      eyebrow="Actualidad"
      title="Últimas noticias"
      right={
        <div className="range-btns">
          {[['todas', 'Todas'], ['eodhd', 'Financieras'], ['rss', 'Prensa']].map(([k, lab]) => (
            <button key={k} className={`range-btn${filtro === k ? ' active' : ''}`} onClick={() => setFiltro(k)}>{lab}</button>
          ))}
        </div>
      }
    >
      <div className="card">
        {!items.length && <div className="empty" style={{ border: 0 }}>Sin noticias recientes para este valor.</div>}
        {items.map((n, i) => (
          <div className="news-item" key={`${n.url}-${i}`}>
            <div className="news-date">{fmtDateTime(n.date)}</div>
            <div className="news-body">
              <a className="news-title" href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
              <div className="news-sub">
                {n.sentiment != null && <span className="sent" style={{ background: sentColor(n.sentiment) }} title={`Sentimiento ${n.sentiment}`} />}
                <span>{n.source}</span>
                {n.provider !== 'eodhd' && <span className="tag" style={{ padding: '1px 6px' }}>prensa</span>}
              </div>
              {n.summary && <div className="news-summary">{n.summary}…</div>}
            </div>
          </div>
        ))}
      </div>
      <p className="tiny" style={{ marginTop: 10 }}>
        Fuentes: EODHD News (financieras, con sentimiento) y Google News (prensa general) · actualización cada 30 min.
      </p>
    </Section>
  );
}