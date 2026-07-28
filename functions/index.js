// Herramienta de Análisis y Valoración de Empresas — API (codebase "analisis")
// Cloud Function HTTPS única (Express) tras el rewrite /api/** del Hosting.
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import express from 'express';
import cors from 'cors';
import { buildRouter } from './src/routes.js';
import { ALLOWED_EMAILS, REGION } from './src/config.js';

const EODHD_API_KEY = defineSecret('EODHD_API_KEY');

initializeApp();

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));

// --- Autenticación: token de Firebase + email autorizado ---
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  try {
    const header = req.headers.authorization || '';
    const m = header.match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Falta el token de autenticación' });
    const decoded = await getAuth().verifyIdToken(m[1]);
    if (!decoded.email || !ALLOWED_EMAILS.includes(decoded.email.toLowerCase())) {
      return res.status(403).json({ error: 'Usuario no autorizado' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.warn(`auth: ${err.message}`);
    res.status(401).json({ error: 'Token no válido o caducado' });
  }
});

app.use('/api', buildRouter());

// Errores centralizados
app.use((err, _req, res, _next) => {
  const status = err.status || 502;
  console.error(`[api] ${err.message}`);
  res.status(status).json({ error: err.message });
});

export const api = onRequest(
  {
    region: REGION,
    secrets: [EODHD_API_KEY],
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 2,   // salvaguarda de coste
    concurrency: 40
  },
  app
);