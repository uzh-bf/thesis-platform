#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-backups/staging}"
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
pg_dump_bin="${PG_DUMP_BIN:-pg_dump}"
pg_restore_bin="${PG_RESTORE_BIN:-pg_restore}"

if [[ -x "/opt/homebrew/Cellar/libpq/17.5/bin/pg_dump" ]]; then
  pg_dump_bin="${PG_DUMP_BIN:-/opt/homebrew/Cellar/libpq/17.5/bin/pg_dump}"
fi

if [[ -x "/opt/homebrew/Cellar/libpq/17.5/bin/pg_restore" ]]; then
  pg_restore_bin="${PG_RESTORE_BIN:-/opt/homebrew/Cellar/libpq/17.5/bin/pg_restore}"
fi

if [[ "${DOPPLER_CONFIG:-}" != "stg" ]]; then
  echo "Refusing backup: DOPPLER_CONFIG must be stg." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Refusing backup: DATABASE_URL is not set." >&2
  exit 1
fi

database_name="$(psql "$DATABASE_URL" -XAtq -c "select current_database();")"

if [[ "$database_name" != *stg* ]] || [[ "$database_name" == *prod* ]] || [[ "$database_name" == *prd* ]]; then
  echo "Refusing backup: unexpected database name '$database_name'." >&2
  exit 1
fi

mkdir -p "$backup_dir"

dump_file="$backup_dir/${database_name}-${timestamp}.dump"
counts_file="$backup_dir/${database_name}-${timestamp}.counts.tsv"
list_file="$backup_dir/${database_name}-${timestamp}.restore-list.txt"

echo "Backing up staging database '$database_name'..."

psql "$DATABASE_URL" -XAtq -F $'\t' -c "
  select table_name, row_count
  from (
    select 'Account' as table_name, count(*)::bigint as row_count from public.\"Account\"
    union all select 'AdminInfo', count(*)::bigint from public.\"AdminInfo\"
    union all select 'ApplicationAttachment', count(*)::bigint from public.\"ApplicationAttachment\"
    union all select 'ApplicationStatus', count(*)::bigint from public.\"ApplicationStatus\"
    union all select 'Proposal', count(*)::bigint from public.\"Proposal\"
    union all select 'ProposalApplication', count(*)::bigint from public.\"ProposalApplication\"
    union all select 'ProposalAttachment', count(*)::bigint from public.\"ProposalAttachment\"
    union all select 'ProposalFeedbackType', count(*)::bigint from public.\"ProposalFeedbackType\"
    union all select 'ProposalStatus', count(*)::bigint from public.\"ProposalStatus\"
    union all select 'ProposalType', count(*)::bigint from public.\"ProposalType\"
    union all select 'Responsible', count(*)::bigint from public.\"Responsible\"
    union all select 'TopicArea', count(*)::bigint from public.\"TopicArea\"
    union all select 'User', count(*)::bigint from public.\"User\"
    union all select 'UserProposalFeedback', count(*)::bigint from public.\"UserProposalFeedback\"
    union all select 'UserProposalSupervision', count(*)::bigint from public.\"UserProposalSupervision\"
    union all select 'VerificationToken', count(*)::bigint from public.\"VerificationToken\"
    union all select '_prisma_migrations', count(*)::bigint from public._prisma_migrations
  ) counts
  order by table_name;
" > "$counts_file"

"$pg_dump_bin" --format=custom --no-owner --no-acl --file="$dump_file" "$DATABASE_URL"
"$pg_restore_bin" --list "$dump_file" > "$list_file"

echo "Backup complete:"
echo "  dump: $dump_file"
echo "  counts: $counts_file"
echo "  restore list: $list_file"
