#!/bin/sh
set -e
cd /app

LOCKFILE_HASH_FILE="node_modules/.package-lock.sha1"
CURRENT_LOCKFILE_HASH="$(sha1sum package-lock.json | awk '{ print $1 }')"
STORED_LOCKFILE_HASH=""
if [ -f "$LOCKFILE_HASH_FILE" ]; then
  STORED_LOCKFILE_HASH="$(cat "$LOCKFILE_HASH_FILE")"
fi

if [ ! -d node_modules ] || [ "$CURRENT_LOCKFILE_HASH" != "$STORED_LOCKFILE_HASH" ]; then
  echo "[frontend dev] npm ci…"
  npm ci
  echo "$CURRENT_LOCKFILE_HASH" > "$LOCKFILE_HASH_FILE"
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
