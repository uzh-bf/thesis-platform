# Production MySQL to PostgreSQL Migration

Purpose: copy all production data from the legacy production MySQL database to the Infisical-managed PostgreSQL database, then deploy the app with the PostgreSQL Prisma client.

The script never prints connection strings. It prints only protocol, host, port, database, SSL mode, PgBouncer flag, and row counts.

Use these environment pairings:

| Instance | MySQL source | PostgreSQL target |
| --- | --- | --- |
| DF | legacy DF production MySQL URL | Infisical `prd` |
| IBW | legacy IBW production MySQL URL | Infisical `prd-ibw` |

## Before Maintenance

1. Confirm latest app build contains the PostgreSQL Prisma schema.
2. Confirm the target PostgreSQL secret is available as either:
   - `POSTGRES_DATABASE_URL`
   - `TARGET_DATABASE_URL`
   - Infisical `DATABASE_URL`
3. Set endpoint guard variables before dry-run or execute:
   - `EXPECTED_MYSQL_HOST`
   - `EXPECTED_MYSQL_DATABASE`
   - `EXPECTED_POSTGRES_HOST`
   - `EXPECTED_POSTGRES_DATABASE`
4. If the target uses port `6432`, add `pgbouncer=true` to the Prisma runtime URL. Prisma documents this as the compatibility flag for PgBouncer-like poolers: <https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer>.
5. Back up production MySQL through Azure or a local dump from an allowlisted machine.
6. Back up the PostgreSQL target if it already contains any schema or data:

```bash
pg_dump "$POSTGRES_DATABASE_URL" --format=custom --file backups/prod/postgres-before-mysql-copy.dump
```

## Apply PostgreSQL Baseline

For an empty target database:

```bash
DATABASE_URL="$POSTGRES_DATABASE_URL" pnpm exec prisma migrate deploy
```

If the URL is only available through Infisical:

```bash
infisical run --env=prd --projectId "$INFISICAL_PROJECT_ID" -- pnpm exec prisma migrate deploy
```

Do not run old MySQL migrations against PostgreSQL. The active baseline is:

```text
prisma/migrations/20260609000000_postgres_baseline/migration.sql
```

Archived MySQL migrations are retained under:

```text
prisma/migrations_mysql_archive/
```

## Dry Run

The shell wrapper and package aliases were removed after the migration window.
Set both database URLs explicitly before running the historical TypeScript
script.

```bash
MYSQL_DATABASE_URL="$MYSQL_DATABASE_URL" \
POSTGRES_DATABASE_URL="$POSTGRES_DATABASE_URL" \
EXPECTED_MYSQL_HOST="$EXPECTED_MYSQL_HOST" \
EXPECTED_MYSQL_DATABASE="$EXPECTED_MYSQL_DATABASE" \
EXPECTED_POSTGRES_HOST="$EXPECTED_POSTGRES_HOST" \
EXPECTED_POSTGRES_DATABASE="$EXPECTED_POSTGRES_DATABASE" \
pnpm exec ts-node --project tsconfig.tsnode.json scripts/prod-mysql-to-postgres.ts
```

The dry run connects to both databases, verifies guarded hosts, verifies target schema, and prints row counts. It writes nothing.

## Execute Copy

Freeze production writes first. Scale the app down, enable maintenance, or otherwise block all user write paths.

For an empty PostgreSQL target:

```bash
MYSQL_DATABASE_URL="$MYSQL_DATABASE_URL" \
POSTGRES_DATABASE_URL="$POSTGRES_DATABASE_URL" \
EXPECTED_MYSQL_HOST="$EXPECTED_MYSQL_HOST" \
EXPECTED_MYSQL_DATABASE="$EXPECTED_MYSQL_DATABASE" \
EXPECTED_POSTGRES_HOST="$EXPECTED_POSTGRES_HOST" \
EXPECTED_POSTGRES_DATABASE="$EXPECTED_POSTGRES_DATABASE" \
pnpm exec ts-node --project tsconfig.tsnode.json scripts/prod-mysql-to-postgres.ts --execute --confirm-prod-migration=MYSQL_TO_POSTGRES_PRD
```

If the target already contains app rows and a backup exists, wipe it in the same transaction:

```bash
MYSQL_DATABASE_URL="$MYSQL_DATABASE_URL" \
POSTGRES_DATABASE_URL="$POSTGRES_DATABASE_URL" \
EXPECTED_MYSQL_HOST="$EXPECTED_MYSQL_HOST" \
EXPECTED_MYSQL_DATABASE="$EXPECTED_MYSQL_DATABASE" \
EXPECTED_POSTGRES_HOST="$EXPECTED_POSTGRES_HOST" \
EXPECTED_POSTGRES_DATABASE="$EXPECTED_POSTGRES_DATABASE" \
pnpm exec ts-node --project tsconfig.tsnode.json scripts/prod-mysql-to-postgres.ts --execute --confirm-prod-migration=MYSQL_TO_POSTGRES_PRD --wipe-target
```

The execute mode requires `--confirm-prod-migration=MYSQL_TO_POSTGRES_PRD`.

## Deploy App

Production runtime must receive the PostgreSQL URL as `DATABASE_URL` through the Infisical-backed Kubernetes secret.

Deployment is now ArgoCD repo pull from `deploy/chart_new` with `deploy/prd_new/values.yaml` or `deploy/prd_ibw_new/values.yaml`. Do not use local Helmfile/envsubst deployment scripts. After changing Infisical values, confirm the ExternalSecret is synced and restart or resync pods so `envFrom` secrets are loaded.

After deploy, run smoke checks:

1. Public proposals load.
2. Admin page loads for an admin user.
3. Proposal details load.
4. Application and feedback forms can read required lookup data.
5. No app pod logs contain Prisma connector errors.
