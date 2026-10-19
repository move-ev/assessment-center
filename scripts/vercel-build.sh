#!/usr/bin/env sh
# Build command on Vercel (package.json "vercel-build").
# Applies pending migrations before building, but only for production
# deployments: preview builds may share the production database and must not
# migrate it before a PR is merged. A failing migration fails the build, so a
# deployment never runs against an outdated schema.
#
# Neon: set DIRECT_DATABASE_URL to the direct (non-pooled) connection string;
# migrations need a session-level lock that the pooler does not provide.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
	DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}" prisma migrate deploy
fi

next build
