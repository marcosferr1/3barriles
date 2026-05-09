#!/usr/bin/env sh
# Borra el volumen de Postgres de desarrollo para que reaplique POSTGRES_* del .env actual.
# Uso desde la raíz del repo:
#   sh scripts/reset-docker-dev-db.sh
set -eu
ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
echo "[reset-docker-dev-db] Bajando Compose y volumen postgres_data_dev…"
docker compose -f docker-compose.dev.yml down -v

echo "[reset-docker-dev-db] Volviendo a subir DB + migrate + backend + frontend…"
docker compose -f docker-compose.dev.yml up -d --build

echo ""
echo "[reset-docker-dev-db] Listo. API: $(grep -m1 '^VITE_API_URL=' .env 2>/dev/null || echo 'http://localhost:4000') /health"
echo "[reset-docker-dev-db] Tip: Postgres del contenedor inicializa usuario/clave desde DB_USER / DB_PASSWORD del .env SOLO la primera vez (volumen vacío)."
