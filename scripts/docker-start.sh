#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  npx prisma migrate deploy
fi

if [ "${BOOTSTRAP_SEED_ON_START:-false}" = "true" ]; then
  node scripts/seed-if-empty.mjs
fi

exec node server.js
