#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-backups/staging}"
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
mysql_bin="${MYSQL_BIN:-mysql}"
mysqldump_bin="${MYSQLDUMP_BIN:-mysqldump}"
node_bin="${NODE_BIN:-node}"

if [[ "${THESIS_PLATFORM_ENV:-}" != "stg" ]]; then
  echo "Refusing backup: THESIS_PLATFORM_ENV must be stg." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Refusing backup: DATABASE_URL is not set." >&2
  exit 1
fi

for required_bin in "$mysql_bin" "$mysqldump_bin" "$node_bin"; do
  if ! command -v "$required_bin" >/dev/null 2>&1; then
    echo "Refusing backup: required command '$required_bin' was not found." >&2
    exit 1
  fi
done

mkdir -p "$backup_dir"
defaults_file="$(mktemp "${TMPDIR:-/tmp}/thesis-staging-mysql.XXXXXX.cnf")"
trap 'rm -f "$defaults_file"' EXIT

connection_info="$(
  "$node_bin" - "$defaults_file" <<'NODE'
const fs = require('fs')
const defaultsFile = process.argv[2]
const url = new URL(process.env.DATABASE_URL)

if (!['mysql:', 'mysqls:'].includes(url.protocol)) {
  throw new Error(`DATABASE_URL must use mysql:// or mysqls://, got ${url.protocol}`)
}

const database = decodeURIComponent(url.pathname.replace(/^\//, ''))

if (!database) {
  throw new Error('DATABASE_URL must include a database name.')
}

const lines = [
  '[client]',
  `host=${url.hostname || 'localhost'}`,
  `port=${url.port || '3306'}`,
  `user=${decodeURIComponent(url.username)}`,
  `password=${decodeURIComponent(url.password)}`,
  `database=${database}`,
]

const sslMode = url.searchParams.get('ssl-mode')

if (sslMode) {
  lines.push(`ssl-mode=${sslMode}`)
}

fs.writeFileSync(defaultsFile, `${lines.join('\n')}\n`, { mode: 0o600 })
console.log(`${database}\t${url.hostname || 'localhost'}`)
NODE
)"

IFS=$'\t' read -r database_name database_host <<< "$connection_info"
target_identity="${database_host}/${database_name}"
target_identity_lc="$(printf '%s' "$target_identity" | tr '[:upper:]' '[:lower:]')"

if [[ "$target_identity_lc" == *prod* ]] || [[ "$target_identity_lc" == *prd* ]]; then
  echo "Refusing backup: production-like staging target '$target_identity'." >&2
  exit 1
fi

if [[ "$target_identity_lc" != *stg* ]] && [[ "$target_identity_lc" != *stage* ]] && [[ "$target_identity_lc" != *qa* ]] && [[ "$target_identity_lc" != *dev* ]]; then
  echo "Refusing backup: unexpected staging target '$target_identity'." >&2
  exit 1
fi

mysql_args=(--defaults-extra-file="$defaults_file" --batch --raw --skip-column-names)

actual_database="$("$mysql_bin" "${mysql_args[@]}" -e "select database();")"

if [[ "$actual_database" != "$database_name" ]]; then
  echo "Refusing backup: connected to '$actual_database', expected '$database_name'." >&2
  exit 1
fi

dump_file="$backup_dir/${database_name}-${timestamp}.sql"
counts_file="$backup_dir/${database_name}-${timestamp}.counts.tsv"

echo "Backing up staging database '$database_name'..."

"$mysql_bin" "${mysql_args[@]}" -e "
  select table_name, row_count
  from (
    select 'Account' as table_name, count(*) as row_count from \`Account\`
    union all select 'AdminInfo', count(*) from \`AdminInfo\`
    union all select 'ApplicationAttachment', count(*) from \`ApplicationAttachment\`
    union all select 'ApplicationStatus', count(*) from \`ApplicationStatus\`
    union all select 'Proposal', count(*) from \`Proposal\`
    union all select 'ProposalApplication', count(*) from \`ProposalApplication\`
    union all select 'ProposalAttachment', count(*) from \`ProposalAttachment\`
    union all select 'ProposalFeedbackType', count(*) from \`ProposalFeedbackType\`
    union all select 'ProposalStatus', count(*) from \`ProposalStatus\`
    union all select 'ProposalType', count(*) from \`ProposalType\`
    union all select 'Responsible', count(*) from \`Responsible\`
    union all select 'TopicArea', count(*) from \`TopicArea\`
    union all select 'User', count(*) from \`User\`
    union all select 'UserProposalFeedback', count(*) from \`UserProposalFeedback\`
    union all select 'UserProposalSupervision', count(*) from \`UserProposalSupervision\`
    union all select 'VerificationToken', count(*) from \`VerificationToken\`
    union all select '_prisma_migrations', count(*) from \`_prisma_migrations\`
  ) counts
  order by table_name;
" > "$counts_file"

"$mysqldump_bin" \
  --defaults-extra-file="$defaults_file" \
  --single-transaction \
  --routines \
  --triggers \
  "$database_name" > "$dump_file"

echo "Backup complete:"
echo "  dump: $dump_file"
echo "  counts: $counts_file"
