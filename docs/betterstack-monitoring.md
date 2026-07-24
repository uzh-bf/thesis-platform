# Better Stack Uptime Monitoring & Status Page

The thesis platform is monitored with [Better Stack](https://betterstack.com)
(uptime monitors + public status page), analogous to the KlickerUZH setup
(<https://klicker-uzh.betteruptime.com>). This document describes the code-side
integration and the one-time setup in the Better Stack dashboard.

## Code-side integration

### Health endpoint

`GET /api/health` (`src/pages/api/health.ts`) is the endpoint uptime monitors
should check. It returns

- `200 {"status":"ok","version":...}` when the app is running and can reach the
  database (`SELECT 1` via Prisma), and
- `503 {"status":"error",...}` when the database is unreachable,

so a monitor on this endpoint catches both app and database outages. The
endpoint is unauthenticated and not affected by the admin IP allowlist
middleware (which only covers `/admin` and admin tRPC procedures).

### Footer link

The footer shows a "System Status" link (in the Links column, and in the slim
embedded footer) whenever `NEXT_PUBLIC_STATUS_PAGE_URL` is set. The variable is

- baked into the Docker image as a build arg (`Dockerfile`, set in
  `.github/workflows/docker-image-prd.yml` and `docker-image-stg-arm.yml`), and
- defined in `.env.production`, `.env.stage`, `.env.stg` for local builds.

If the status page URL changes in Better Stack, update it in those places.

## One-time setup in the Better Stack dashboard

1. In the team's Better Stack account (same one as KlickerUZH), create uptime
   monitors of type "Expected HTTP status 200" for:
   - `https://theses.df.uzh.ch/api/health` (Production DF)
   - `https://theses.business.uzh.ch/api/health` (Production IBW)
   - optionally `https://theses.stg.df-app.ch/api/health` (Staging)

   Recommended settings: check frequency 30s–1min, alert after 2–3 failed
   checks, notify the team channel/on-call as configured for Klicker.

2. Create a status page (Status pages → Create) named e.g. "Thesis Platform"
   with the subdomain `thesis-platform`, so it is served at
   `https://thesis-platform.betteruptime.com`, and add the monitors above as
   resources (e.g. "Thesis Platform DF (Production)", "Thesis Platform IBW
   (Production)").

3. Verify the URL matches `NEXT_PUBLIC_STATUS_PAGE_URL` (see above); adjust the
   env var / workflow build args if a different subdomain or a custom domain
   (e.g. `status.theses.df.uzh.ch`) is chosen.
