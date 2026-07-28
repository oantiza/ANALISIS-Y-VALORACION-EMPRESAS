import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

export default function Login() {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function entrar() {
    setBusy(true); setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="b1">O.A.A</div>
        <div className="b2">Análisis de Empresas</div>
        <p className="desc">
          Análisis fundamental, técnico y valoración de compañías cotizadas a nivel global.
        </p>
        <button className="btn-solid" onClick={entrar} disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar con Google'}
        </button>
        {error && <p className="tiny" style={{ marginTop: 14, color: 'var(--neg)' }}>{error}</p>}
        <div className="login-line" />
      </div>
    </div>
  );
}