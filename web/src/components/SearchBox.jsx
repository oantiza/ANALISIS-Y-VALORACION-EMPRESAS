import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export default function SearchBox({ onPick, placeholder = 'Buscar empresa o ticker (Apple, SAN.MC, AIR.PA…)' }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function onChange(e) {
    const value = e.target.value;
    setQ(value);
    setActive(-1);
    clearTimeout(timer.current);
    if (value.trim().length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await api(`/search?q=${encodeURIComponent(value.trim())}`);
        setItems(res.items || []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setBusy(false);
      }
    }, 320);
  }

  function pick(item) {
    setOpen(false);
    setQ('');
    setItems([]);
    onPick(item);
  }

  function onKey(e) {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="search-wrap" ref={boxRef}>
      <input
        className="search-input"
        value={q}
        onChange={onChange}
        onKeyDown={onKey}
        onFocus={() => items.length && setOpen(true)}
        placeholder={placeholder}
        spellCheck={false}
      />
      {open && (
        <div className="search-drop">
          {busy && <div className="search-item"><span className="s-name">Buscando…</span></div>}
          {!busy && !items.length && <div className="search-item"><span className="s-name">Sin resultados</span></div>}
          {items.map((it, i) => (
            <div
              key={it.symbol}
              className={`search-item${i === active ? ' active' : ''}`}
              onMouseDown={() => pick(it)}
            >
              <span className="s-sym">{it.symbol}</span>
              <span className="s-name">{it.name}</span>
              <span className="s-exch">{it.exchange} · {it.currency}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}