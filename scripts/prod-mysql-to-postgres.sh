#!/usr/bin/env bash
set -euo pipefail

doppler_project="${DOPPLER_PROJECT:-thesis-platform}"
doppler_config="${DOPPLER_CONFIG:-prd}"
doppler_scope="${DOPPLER_SCOPE:-$PWD}"
infisical_env="${INFISICAL_ENV:-prd}"
infisical_secret_name="${INFISICAL_SECRET_NAME:-DATABASE_URL}"

load_mysql_url() {
  if [[ -n "${MYSQL_DATABASE_URL:-}" ]]; then
    return
  fi

  if [[ -n "${SOURCE_DATABASE_URL:-}" ]]; then
    MYSQL_DATABASE_URL="$SOURCE_DATABASE_URL"
    export MYSQL_DATABASE_URL
    return
  fi

  if ! command -v doppler >/dev/null 2>&1; then
    echo "DATABASE_URL source missing: set MYSQL_DATABASE_URL or install Doppler CLI." >&2
    exit 1
  fi

  MYSQL_DATABASE_URL="$(
    doppler run \
      --scope "$doppler_scope" \
      --project "$doppler_project" \
      --config "$doppler_config" \
      -- node -e 'process.stdout.write(process.env.DATABASE_URL || "")'
  )"
  export MYSQL_DATABASE_URL

  if [[ -z "$MYSQL_DATABASE_URL" ]]; then
    echo "Doppler did not provide DATABASE_URL for source MySQL." >&2
    exit 1
  fi
}

load_postgres_url() {
  if [[ -n "${POSTGRES_DATABASE_URL:-}" ]]; then
    return
  fi

  if [[ -n "${TARGET_DATABASE_URL:-}" ]]; then
    POSTGRES_DATABASE_URL="$TARGET_DATABASE_URL"
    export POSTGRES_DATABASE_URL
    return
  fi

  if ! command -v infisical >/dev/null 2>&1; then
    echo "DATABASE_URL target missing: set POSTGRES_DATABASE_URL or install Infisical CLI." >&2
    exit 1
  fi

  infisical_args=(run --env "$infisical_env")

  if [[ -n "${INFISICAL_PROJECT_ID:-}" ]]; then
    infisical_args+=(--projectId "$INFISICAL_PROJECT_ID")
  fi

  POSTGRES_DATABASE_URL="$(
    INFISICAL_SECRET_NAME="$infisical_secret_name" \
      infisical "${infisical_args[@]}" \
      -- node -e 'process.stdout.write(process.env[process.env.INFISICAL_SECRET_NAME] || process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL || "")'
  )"
  export POSTGRES_DATABASE_URL

  if [[ -z "$POSTGRES_DATABASE_URL" ]]; then
    echo "Infisical did not provide target database URL." >&2
    echo "Set POSTGRES_DATABASE_URL, TARGET_DATABASE_URL, INFISICAL_PROJECT_ID, or run infisical init." >&2
    exit 1
  fi
}

load_mysql_url
load_postgres_url

echo "Generating Prisma clients..."
pnpm run prisma:generate:mysql
pnpm run prisma:generate

echo "Running MySQL to PostgreSQL migration script..."
pnpm exec ts-node --project tsconfig.tsnode.json scripts/prod-mysql-to-postgres.ts "$@"
