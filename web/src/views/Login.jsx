import React, { useEffect, useState } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function Login({ denegado }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Recoger el resultado (o error) al volver de un login por redirección (móvil)
  useEffect(() => {
    getRedirectResult(auth).catch((err) => setError(err.message));
  }, []);

  async function entrar() {
    setBusy(true); setError(null);
    try {
      if (esMovil) {
        await signInWithRedirect(auth, googleProvider); // navega fuera; no vuelve aquí
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!esMovil) setBusy(false);
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
        {denegado && (
          <p className="tiny" style={{ marginTop: 14, color: 'var(--neg)', maxWidth: '36ch' }}>
            La cuenta <b>{denegado}</b> no está autorizada. Pulsa de nuevo y elige la cuenta
            correcta en el selector de Google.
          </p>
        )}
        {error && <p className="tiny" style={{ marginTop: 14, color: 'var(--neg)' }}>{error}</p>}
        <div className="login-line" />
      </div>
    </div>
  );
}