#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  npx prisma migrate deploy
fi

exec node server.js
