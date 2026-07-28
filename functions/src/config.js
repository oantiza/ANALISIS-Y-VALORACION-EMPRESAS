// Configuración central del backend
export const REGION = 'europe-west1';

// Correos con acceso a la API (uso personal)
export const ALLOWED_EMAILS = ['oantiza@gmail.com', 'aceberiognosspelius@gmail.com'];

// TTLs de caché (segundos) por tipo de dato — pensados para minimizar
// coste Firestore y llamadas EODHD sin servir datos rancios.
export const TTL = {
  search: 30 * 24 * 3600,      // búsquedas de símbolos: 30 días
  fundamentals: 7 * 24 * 3600, // fundamentales: 7 días
  eod: 12 * 3600,              // series históricas diarias: 12 horas
  technicals: 12 * 3600,       // indicadores técnicos: 12 horas
  news: 30 * 60,               // noticias: 30 minutos
  quote: 60                    // cotización en vivo: 60 s (solo memoria)
};

// Colección de caché en Firestore (prefijo av_ para convivir con BDB-ACTIVOS)
export const CACHE_COLLECTION = 'av_cache';

export const EODHD_BASE = 'https://eodhd.com/api';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';