#!/bin/sh
set -e
# Assemble the site from the built artifact using the deploy-time, site-only env
# (SEED_DEMO / UMAMI_* / SENTRY_DSN). This wires analytics and error tracking
# into the landing page only. The artifact bytes stay untouched.
node scripts/prepare-site.mjs
# Serve on container port 80, as the staging contract requires.
exec node scripts/serve-site.mjs -p 80
