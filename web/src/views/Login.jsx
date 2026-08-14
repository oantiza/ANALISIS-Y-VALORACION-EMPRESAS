import React, { useEffect, useState } from 'react';
import {
  signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const MENSAJES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/user-not-found': 'No existe ninguna cuenta con ese correo.',
  'auth/too-many-requests': 'Demasiados intentos; espera unos minutos.',
  'auth/invalid-email': 'El correo no es válido.'
};

function traducir(err) {
  const code = (err?.code || '').toString();
  return MENSAJES[code] || err.message;
}

export default function Login({ denegado }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modoPass, setModoPass] = useState(false);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');

  // Recoger el resultado (o error) al volver de un login por redirección (móvil)
  useEffect(() => {
    getRedirectResult(auth).catch((err) => setError(traducir(err)));
  }, []);

  async function entrarGoogle() {
    setBusy(true); setError(null);
    try {
      if (esMovil) {
        await signInWithRedirect(auth, googleProvider); // navega fuera; no vuelve aquí
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      setError(traducir(err));
    } finally {
      if (!esMovil) setBusy(false);
    }
  }

  async function entrarPass(e) {
    e.preventDefault();
    if (!correo || !clave) return;
    setBusy(true); setError(null);
    try {
      await signInWithEmailAndPassword(auth, correo.trim(), clave);
    } catch (err) {
      setError(traducir(err));
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

        {!modoPass && (
          <button className="btn-solid" onClick={entrarGoogle} disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar con Google'}
          </button>
        )}

        {modoPass && (
          <form onSubmit={entrarPass} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 260, margin: '0 auto' }}>
            <input
              className="search-input" type="email" placeholder="Correo" value={correo}
              onChange={(e) => setCorreo(e.target.value)} autoComplete="username"
            />
            <input
              className="search-input" type="password" placeholder="Contraseña" value={clave}
              onChange={(e) => setClave(e.target.value)} autoComplete="current-password"
            />
            <button className="btn-solid" type="submit" disabled={busy || !correo || !clave}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        <p className="tiny" style={{ marginTop: 14 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setModoPass(!modoPass); setError(null); }}>
            {modoPass ? '← Volver a entrar con Google' : 'O entrar con correo y contraseña'}
          </a>
        </p>

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
