# Guía de despliegue — paso a paso desde tu PC

Todo se despliega en el proyecto Firebase existente **`bbdd-activos-financieros`** (ya en plan
Blaze), sin tocar nada de BDB-ACTIVOS: hosting en un sitio nuevo, functions en un codebase
separado y colecciones con prefijo `av_`.

## 0. Requisitos (una sola vez)

```powershell
npm install -g firebase-tools
firebase login    # con oantiza@gmail.com (probablemente ya hecho)
```

## 1. Instalar dependencias (el código ya está en esta carpeta)

```powershell
cd C:\Users\oanti\Proyectos\BDB\4-ANALISIS-EMPRESAS
cd functions ; npm install ; cd ..
cd web ; npm install ; npm run build ; cd ..
```

## 2. Crear el sitio de Hosting (una sola vez)

```powershell
firebase hosting:sites:create oaa-analisis
```

Si el nombre `oaa-analisis` estuviera cogido globalmente, elige otro (p. ej. `oaa-analisis-oa`)
y cámbialo también en `.firebaserc` (línea `"analisis": ["oaa-analisis"]`).

## 3. Guardar la clave EODHD como secret (una sola vez)

```powershell
firebase functions:secrets:set EODHD_API_KEY
```
Pega tu clave de EODHD cuando la pida. Queda cifrada en Google Secret Manager; el navegador
nunca la ve.

## 4. Reglas de Firestore — fusionar, no sustituir ⚠️

Las reglas del proyecto las gobierna `3-BDB-ACTIVOS_app`. Abre
`C:\Users\oanti\Proyectos\BDB\3-BDB-ACTIVOS_app\firestore.rules` y copia dentro del bloque
`match /databases/{database}/documents { ... }` el contenido de
**`firestore-fragmento.rules`** de este repo (los bloques `av_watchlist`, `av_informes`,
`av_cache` y la función `esOscar()`). Después, desde AQUELLA carpeta:

```powershell
cd C:\Users\oanti\Proyectos\BDB\3-BDB-ACTIVOS_app
firebase deploy --only firestore:rules
```

## 5. Autenticación

En la consola de Firebase (proyecto bbdd-activos-financieros → Authentication):

1. Comprueba que el proveedor **Google** está habilitado (Sign-in method).
2. En Settings → **Authorized domains**, añade el dominio del sitio nuevo:
   `oaa-analisis.web.app` (los sitios secundarios no se añaden solos).

## 6. Desplegar

```powershell
cd C:\Users\oanti\Proyectos\BDB\4-ANALISIS-EMPRESAS
firebase deploy --only functions:analisis,hosting:analisis
```

Abre **https://oaa-analisis.web.app** y entra con tu Google. Listo.

## 7. (Recomendado) Limpieza automática de la caché

Una política TTL borra sola los documentos caducados de `av_cache`:

```powershell
gcloud firestore fields ttls update expiresAt --collection-group=av_cache --enable-ttl --project=bbdd-activos-financieros
```

(O en la consola: Firestore → TTL → colección `av_cache`, campo `expiresAt`.)

## Actualizaciones futuras

```powershell
git pull
cd web ; npm run build ; cd ..
firebase deploy --only functions:analisis,hosting:analisis
```

## Control de costes

- `maxInstances: 2` en la función limita cualquier desbocamiento.
- Opcional: crea una alerta de presupuesto de 1 € en la facturación de Google Cloud.
- Uso personal esperado: bien dentro de las capas gratuitas de Functions, Firestore y Hosting.