# O.A.A — Análisis y Valoración de Empresas

Herramienta personal de análisis **fundamental, técnico y de valoración** de empresas cotizadas
a nivel global, con **últimas noticias** e **informes/fichas imprimibles** (A4, sello O.A.A).
Interfaz con el sistema de diseño *papel, tinta y bosque* (papel crema, Fraunces + Roboto Flex,
filetes bronce, acento granate).

## Qué hace

- **Búsqueda global** de valores por nombre, ticker o ISIN (todas las bolsas cubiertas por EODHD).
- **Ficha de empresa** con cinco pestañas:
  - *Resumen* — cotización, KPIs clave, rango 52 semanas, lectura técnica y consenso.
  - *Fundamental* — múltiplos, márgenes, cuenta de resultados, balance, flujos de caja,
    dividendos, accionariado, recomendaciones de analistas e historial de BPA.
  - *Técnico* — velas + volumen con SMA 50/200 y Bollinger, RSI y MACD, señales
    automáticas, rendimiento por periodos, volatilidad y drawdown.
  - *Noticias* — EODHD News (con sentimiento) fusionadas con Google News (es/en).
  - *Informe* — ficha de valor A4 de 2 páginas, imprimible a PDF y archivable.
- **Watchlist** persistida en Firestore.
- Acceso restringido con Google (solo el correo autorizado).

## Arquitectura y coste

```
web/        React 18 + Vite  →  Firebase Hosting (sitio "oaa-analisis")
functions/  Node 20 (codebase "analisis", europe-west1)  →  Cloud Function "api"
            proxy EODHD + caché Firestore (gzip, TTL) + fuentes de respaldo
Firestore   av_cache · av_watchlist · av_informes   (prefijo av_, convive con BDB-ACTIVOS)
```

- **EODHD** es el proveedor principal (la clave vive en un *secret* de Functions, nunca en el
  navegador). **Yahoo Finance**, **Stooq** y **Google News RSS** actúan de respaldo y complemento.
- Los indicadores técnicos se **calculan en el servidor** a partir de la serie EOD cacheada
  (la API de técnicos de EODHD cobra 5 peticiones por indicador; así solo se paga 1 por serie).
- La caché en Firestore (comprimida) + `maxInstances: 2` mantienen el proyecto dentro de la
  capa gratuita de Blaze en uso personal: coste objetivo **≈ 0 €/mes**.

| Dato          | TTL caché | Fuente principal | Respaldo            |
|---------------|-----------|------------------|---------------------|
| Búsqueda      | 30 días   | EODHD            | —                   |
| Fundamentales | 7 días    | EODHD            | —                   |
| Serie EOD     | 12 h      | EODHD            | Yahoo → Stooq       |
| Técnicos      | 12 h      | calculados       | (sobre EOD)         |
| Noticias      | 30 min    | EODHD News       | Google News RSS     |
| Cotización    | 60 s (memoria) | EODHD       | Yahoo               |

## Desarrollo local

```bash
cd web && npm install && npm run dev        # frontend
cd functions && npm install                 # backend
```

## Despliegue

Ver **[DESPLIEGUE.md](DESPLIEGUE.md)** — pasos completos desde el PC (firebase-tools),
incluida la fusión de reglas de Firestore con las de BDB-ACTIVOS.

> ⚠️ Nunca ejecutes `firebase deploy --only firestore:rules` desde este repo: las reglas del
> proyecto las gobierna `3-BDB-ACTIVOS_app`. Este repo solo aporta `firestore-fragmento.rules`.

---
Uso interno de Oscar Antiza (O.A.A / Private Bankers). Los datos y análisis no constituyen
recomendación de inversión.