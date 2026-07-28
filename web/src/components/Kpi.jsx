import React from 'react';

export function KpiGrid({ children }) {
  return <div className="kpis">{children}</div>;
}

export function Kpi({ label, value, sub, cls = '' }) {
  return (
    <div className="kpi">
      <div className="k">{label}</div>
      <div className={`v ${cls}`}>{value ?? '—'}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Section({ eyebrow, title, right, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {title && <h2 className="sec-title">{title}</h2>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function EstadoTag({ estado }) {
  return <span className={`tag ${estado}`}>{estado}</span>;
}