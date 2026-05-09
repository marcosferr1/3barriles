# 3 Barriles — panel interno (stock y ventas)

Sistema **propio del negocio**: inventario por movimientos, compras a proveedor con recepción, registro de ventas del **local** (no es canal de venta online).

## Stack

- **Frontend**: React 19 · Vite 8 · TypeScript · React Router 7 · Tailwind 4 + shadcn (tokens), paleta **[Manual de marca 3 Barriles](file:///home/marcos/Descargas/Manual%20de%20Marca%203barriles%20(1).pdf)** (verde `#1F3D2B`, dorado `#C9A24D`, marfil `#F3F0E6`, arena `#D7CAB1`, bordo `#591E2A`).
- **Backend**: Node 20 · Express 5 · Sequelize 6 · PostgreSQL 16 · JWT.
- **Dev/Prod**: Docker Compose (véase archivos en la raíz).

## Tipografía web

Century Gothic no está disponible gratuitamente como webfont en todas las plataformas; el UI usa **Geist Variable** + stack `Century Gothic` como fallback local. Para titulajes se usa **[Forum](https://fonts.google.com/specimen/Forum)** en `index.html` como alternativa cercana cuando **Ananda Black** no es utilizada por restricciones de licencia.

## Variables de entorno

- Raíz del repo: [`.env.example`](./.env.example) lista **todas** las variables que usa `docker-compose.dev.yml` (sin valores mágicos en el YAML): copiala a `.env` y ajustá.
- **`docker-compose.dev.yml`**: casi todo viene del `.env`; **excepción**: dentro del backend en Docker **`DB_HOST=db`** y **`DB_PORT=5432`** fijos para hablar con el servicio Postgres de la misma red de Compose (`127.0.0.1` dentro del contenedor sería él mismo).
- **`DB_HOST` / `DB_PORT` del `.env`**: usarlos cuando **no** usa Docker para el backend (por ejemplo `cd backend && npm run dev`) contra Postgres en tu máquina.
- En backend también podés usar `DATABASE_URL` (cloud) según comentarios en `.env.example`. Para proveedores con cert self-signed (Neon, Supabase) sumá `DB_SSL_REJECT_UNAUTHORIZED=false`.

## Usuario para ingresar al panel

- Email y contraseña: **`ADMIN_EMAIL`** y **`ADMIN_PASSWORD`** del `.env` (por defecto en el ejemplo: `admin@3barriles.local` / `change_me_admin_password`).
- El usuario ADMIN se crea con el seed **`bootstrap-admin`** (se ejecuta al hacer `npm run seed` en `backend/` o al levantar el contenedor dev, que corre `migrate` + `seed`).
- Si ya existía, el seed no duplica usuarios ni rompe datos demo (`ignoreDuplicates`).

### “Failed to fetch” al hacer login pero el frontend carga

Casi siempre el **backend no está escuchando** en `:4000` (contenedor reiniciando). Mirá logs:  
`docker compose -f docker-compose.dev.yml logs backend --tail 80`.

Si aparece **`password authentication failed`** para Postgres, el volumen dev se creó con otra clave que la de tu `.env`. En desarrollo podés resetear DB + volúmenes:

```bash
sh scripts/reset-docker-dev-db.sh
```

(o manualmente: `docker compose -f docker-compose.dev.yml down -v` y volver a `up -d --build`). Eso **borra** los datos del Postgres del contenedor.

## Arranque (Docker Compose)

Desarrollo (hot reload):

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- Postgres en host (puerto configurado por `DB_PUBLISH_PORT`, default `5433`)

Producción (build + nginx):

```bash
docker compose up --build
```

> Si cambió `DB_PASSWORD` pero ya existía el volumen del contenedor Postgres, puede seguir usando la clave vieja hasta `docker compose down -v` (borra datos).

## Arranque local (sin Docker)

1. Postgres accesible y `.env` con `DB_HOST` correcto (`127.0.0.1` + `DB_PUBLISH_PORT` si aplicá).
2. Backend:

```bash
cd backend
npm ci
npm run setup   # migrate + seed (demo)
npm run dev
```

3. Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Cliente apunta al API mediante `VITE_API_URL`.

## Roles y seguridad

- MVP: todas las rutas (salvo `/auth` y `/health`) requieren JWT.
- Seed demo crea categorías y productos; el admin inicial se crea vía variables `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Estructura (resumen)

```
backend/      Express + Sequelize · migraciones · modelos dominio vinoteca/bar
frontend/     Vite SPA · ThemeProvider marca · páginas dashboard/productos/etc.
docker-compose.yml / docker-compose.dev.yml
```

## Deploy a producción (Neon + Railway + Vercel)

Arquitectura objetivo:

- **DB**: Postgres en [Neon](https://neon.tech).
- **Backend**: Node/Express en [Railway](https://railway.com).
- **Frontend**: Vite SPA en [Vercel](https://vercel.com).

### 1) Neon (DB)

1. Crear proyecto y copiar el connection string (`postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`).
2. Para el backend en Railway, usar el connection **directo** (no el `-pooler`) durante migraciones; para tráfico normal cualquiera anda.

### 2) Railway (backend)

El repo trae `backend/railway.json` con builder Nixpacks y `startCommand: npm run start:prod` (corre `migrate` y luego `start`, sin seed).

1. **New Project → Deploy from GitHub repo**.
2. **Root Directory**: `backend`.
3. **Variables** (Settings → Variables):
   - `DATABASE_URL` = la URL de Neon (con `?sslmode=require`)
   - `DB_SSL_REJECT_UNAUTHORIZED` = `false` (Neon usa cert que no valida con la cadena pública por default)
   - `JWT_SECRET` = string fuerte (`openssl rand -hex 48`)
   - `NODE_ENV` = `production`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` reales
   - `AUTO_SEED_ADMIN` = `true` (crea el admin la primera vez; idempotente)
   - `CORS_ORIGIN` = la URL final de Vercel (después del paso 3)
4. **Networking → Generate Domain**: anotá la URL pública (ej. `https://3barriles-backend.up.railway.app`). Probar `GET /health`.
5. **Seed demo (opcional, una vez)**: desde la consola del servicio en Railway o con CLI:

```bash
railway run --service backend npm run seed
```

> El `startCommand` corre `migrate` en cada deploy, pero **no** corre seeds (idempotentes pero ruidosos). El admin se siembra solo en el arranque vía `AUTO_SEED_ADMIN`.

### 3) Vercel (frontend)

1. **Add New Project** → importar el repo.
2. **Root Directory**: `frontend`.
3. **Framework Preset**: Vite (autodetectado). Build: `npm run build`. Output: `dist`.
4. **Environment Variables**:
   - `VITE_API_URL` = `https://<tu-backend>.up.railway.app` (sin barra final).
5. Deploy. El `frontend/vercel.json` ya hace SPA fallback al `index.html`.

### 4) Cerrar el círculo (CORS)

En Railway, actualizar `CORS_ORIGIN` con la URL final de Vercel (separadas por coma si querés permitir previews):

```
CORS_ORIGIN=https://3barriles.vercel.app,https://3barriles-git-main-tu-user.vercel.app
```

Redeployar el servicio para que tome la variable.

### Troubleshooting

- **`self-signed certificate in certificate chain`** al conectar a Neon → poner `DB_SSL_REJECT_UNAUTHORIZED=false` en Railway.
- **CORS bloqueado** → la URL del frontend tiene que estar **exacta** en `CORS_ORIGIN` (con `https://`, sin barra final).
- **`Failed to fetch` en login en producción** → revisar que `VITE_API_URL` en Vercel apunte a la URL pública de Railway y que el dominio de Railway esté arriba (`/health`).

## Endpoints útiles (`/`)

- `GET /health`
- `POST /auth/login` · `GET /auth/me`
- `/categories`, `/suppliers`, `/products` (+ `POST /products/:id/adjust-stock`)
- `/purchase-orders` (+ `POST /purchase-orders/:id/receive`)
- `/sales`
- `GET /dashboard/summary`
