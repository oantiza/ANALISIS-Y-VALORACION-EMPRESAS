import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, ALLOWED_EMAILS } from './firebase.js';
import Login from './views/Login.jsx';
import Dashboard from './views/Dashboard.jsx';
import Company from './views/Company.jsx';
import SearchBox from './components/SearchBox.jsx';
import { ThemeSelector } from './components/Theme.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = comprobando
  const [denegado, setDenegado] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u && !ALLOWED_EMAILS.includes((u.email || '').toLowerCase())) {
        setDenegado(u.email || 'esa cuenta');
        signOut(auth);
        setUser(null);
        return;
      }
      if (u) setDenegado(null);
      setUser(u);
    });
  }, []);

  if (user === undefined) return <div className="loading">Cargando…</div>;
  if (!user) return <Login denegado={denegado} />;

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand" onClick={() => navigate('/')}>
          <div className="b1">O.A.A<span className="slash"> ∕ </span></div>
          <div className="b2">Análisis de Empresas</div>
        </div>
        <SearchBox onPick={(item) => navigate(`/empresa/${item.symbol}`)} />
        <div className="topbar-right">
          <ThemeSelector compact />
          <span className="user-mail">{user.email}</span>
          <button className="btn-ghost" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/empresa/:symbol" element={<Company />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="foot no-print">
        <span>O.A.A ∕ Análisis y Valoración de Empresas</span>
        <span>Datos: EODHD · Yahoo Finance · Google News — uso interno, no es recomendación de inversión</span>
      </footer>
    </div>
  );
}
