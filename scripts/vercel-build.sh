#!/usr/bin/env sh
# Vercel's build command (package.json "vercel-build").
#
# Migrations run only on production deploys. Preview deploys share the
# production DATABASE_URL, and an unguarded `prisma migrate deploy` here meant
# opening a PR that carried a migration applied it to production before anyone
# had reviewed it (that happened: 20260827000000_coach_report_review landed
# from a preview build). A preview of a migration PR now builds against the
# current production schema, so the preview may not exercise the new columns —
# review those PRs locally; merging to main is still the deploy step.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  prisma migrate deploy
else
  echo "vercel-build: skipping prisma migrate deploy on ${VERCEL_ENV:-non-production} deploy"
fi

next build
