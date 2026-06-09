import { PrismaClient as PostgresPrismaClient } from '@prisma/client'

const { PrismaClient: MySqlPrismaClient } = require('../node_modules/.prisma/mysql-client')

type DbUrlSummary = {
  database: string
  host: string
  pgbouncer: string | null
  port: string
  protocol: string
  ssl: string | null
}

type MigrationModel = {
  delegate: string
  label: string
  orderBy?: unknown
}

const sourceUrl = process.env.MYSQL_DATABASE_URL ?? process.env.SOURCE_DATABASE_URL
const rawTargetUrl =
  process.env.POSTGRES_DATABASE_URL ?? process.env.TARGET_DATABASE_URL

const confirmToken = 'MYSQL_TO_POSTGRES_PRD'
const args = process.argv.slice(2)
const argSet = new Set(args)
const isExecute = argSet.has('--execute')
const shouldWipeTarget = argSet.has('--wipe-target')
const allowUnexpectedSource = argSet.has('--allow-unexpected-source')
const allowUnexpectedTarget = argSet.has('--allow-unexpected-target')
const batchSize = Number(process.env.MIGRATION_BATCH_SIZE ?? 500)
const expectedSourceHost = process.env.EXPECTED_MYSQL_HOST
const expectedSourceDatabase = process.env.EXPECTED_MYSQL_DATABASE
const expectedTargetHost = process.env.EXPECTED_POSTGRES_HOST
const expectedTargetDatabase = process.env.EXPECTED_POSTGRES_DATABASE
const confirmValue =
  args
    .find((arg) => arg.startsWith('--confirm-prod-migration='))
    ?.split('=')
    .slice(1)
    .join('=') ?? ''

const migrationPlan: MigrationModel[] = [
  {
    delegate: 'proposalStatus',
    label: 'ProposalStatus',
    orderBy: { key: 'asc' },
  },
  {
    delegate: 'applicationStatus',
    label: 'ApplicationStatus',
    orderBy: { key: 'asc' },
  },
  { delegate: 'proposalType', label: 'ProposalType', orderBy: { key: 'asc' } },
  {
    delegate: 'proposalFeedbackType',
    label: 'ProposalFeedbackType',
    orderBy: { key: 'asc' },
  },
  { delegate: 'topicArea', label: 'TopicArea', orderBy: { id: 'asc' } },
  { delegate: 'user', label: 'User', orderBy: { id: 'asc' } },
  { delegate: 'responsible', label: 'Responsible', orderBy: { id: 'asc' } },
  { delegate: 'proposal', label: 'Proposal', orderBy: { id: 'asc' } },
  {
    delegate: 'proposalAttachment',
    label: 'ProposalAttachment',
    orderBy: { id: 'asc' },
  },
  {
    delegate: 'userProposalSupervision',
    label: 'UserProposalSupervision',
    orderBy: { id: 'asc' },
  },
  {
    delegate: 'proposalApplication',
    label: 'ProposalApplication',
    orderBy: { id: 'asc' },
  },
  {
    delegate: 'applicationAttachment',
    label: 'ApplicationAttachment',
    orderBy: { id: 'asc' },
  },
  {
    delegate: 'userProposalFeedback',
    label: 'UserProposalFeedback',
    orderBy: { id: 'asc' },
  },
  { delegate: 'adminInfo', label: 'AdminInfo', orderBy: { id: 'asc' } },
  { delegate: 'account', label: 'Account', orderBy: { id: 'asc' } },
  {
    delegate: 'verificationToken',
    label: 'VerificationToken',
    orderBy: [{ identifier: 'asc' }, { token: 'asc' }],
  },
]

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is required.`)
  }

  return value
}

function parseDbUrl(value: string): DbUrlSummary {
  const url = new URL(value)
  const ssl =
    url.searchParams.get('sslmode') ??
    url.searchParams.get('ssl-mode') ??
    url.searchParams.get('sslaccept')

  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    host: url.hostname,
    pgbouncer: url.searchParams.get('pgbouncer'),
    port: url.port,
    protocol: url.protocol,
    ssl,
  }
}

function formatSummary(summary: DbUrlSummary) {
  return JSON.stringify({
    protocol: summary.protocol,
    host: summary.host,
    port: summary.port || '(default)',
    database: summary.database,
    ssl: summary.ssl,
    pgbouncer: summary.pgbouncer,
  })
}

function withPrismaPgBouncerParam(value: string) {
  const url = new URL(value)

  if (
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
    url.port === '6432' &&
    url.searchParams.get('pgbouncer') !== 'true'
  ) {
    url.searchParams.set('pgbouncer', 'true')
    return { targetUrl: url.toString(), addedPgBouncer: true }
  }

  return { targetUrl: value, addedPgBouncer: false }
}

function assertExpectedEndpoints(source: DbUrlSummary, target: DbUrlSummary) {
  if (!['mysql:', 'mysqls:'].includes(source.protocol)) {
    throw new Error(`Source must be MySQL, got ${source.protocol}.`)
  }

  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error(`Target must be PostgreSQL, got ${target.protocol}.`)
  }

  if (!allowUnexpectedSource) {
    if (!expectedSourceHost || !expectedSourceDatabase) {
      throw new Error(
        'Set EXPECTED_MYSQL_HOST and EXPECTED_MYSQL_DATABASE, or pass --allow-unexpected-source.'
      )
    }

    if (source.host !== expectedSourceHost) {
      throw new Error(`Unexpected source host: ${source.host}.`)
    }

    if (source.database !== expectedSourceDatabase) {
      throw new Error(`Unexpected source database: ${source.database}.`)
    }
  }

  if (!allowUnexpectedTarget) {
    if (!expectedTargetHost || !expectedTargetDatabase) {
      throw new Error(
        'Set EXPECTED_POSTGRES_HOST and EXPECTED_POSTGRES_DATABASE, or pass --allow-unexpected-target.'
      )
    }

    if (target.host !== expectedTargetHost) {
      throw new Error(`Unexpected target host: ${target.host}.`)
    }

    if (target.port !== '5432' && target.port !== '6432') {
      throw new Error(`Unexpected target port: ${target.port || '(default)'}.`)
    }

    if (target.database !== expectedTargetDatabase) {
      throw new Error(`Unexpected target database: ${target.database}.`)
    }

    if (!/(prod|prd)/i.test(`${target.host}/${target.database}`)) {
      throw new Error(
        `Target does not look production-like: ${target.host}/${target.database}.`
      )
    }
  }
}

function getDelegate(client: any, delegate: string) {
  const model = client[delegate]

  if (!model) {
    throw new Error(`Prisma delegate missing: ${delegate}.`)
  }

  return model
}

async function getCounts(client: any) {
  const rows: { count: number; label: string }[] = []

  for (const model of migrationPlan) {
    const count = await getDelegate(client, model.delegate).count()
    rows.push({ count, label: model.label })
  }

  return rows
}

function printCounts(label: string, rows: { count: number; label: string }[]) {
  console.log(label)

  for (const row of rows) {
    console.log(`  ${row.label}: ${row.count}`)
  }
}

function findMismatches(
  sourceCounts: { count: number; label: string }[],
  targetCounts: { count: number; label: string }[]
) {
  const targetByLabel = new Map(targetCounts.map((row) => [row.label, row.count]))

  return sourceCounts.filter(
    (sourceCount) => targetByLabel.get(sourceCount.label) !== sourceCount.count
  )
}

async function assertTargetWritableSchema(client: PostgresPrismaClient) {
  await client.$queryRaw`select current_database()`
  await getCounts(client)
}

async function wipeTarget(tx: any) {
  for (const model of [...migrationPlan].reverse()) {
    await getDelegate(tx, model.delegate).deleteMany()
  }
}

async function copyModel(source: any, target: any, model: MigrationModel) {
  let copied = 0

  while (true) {
    const rows = await getDelegate(source, model.delegate).findMany({
      orderBy: model.orderBy,
      skip: copied,
      take: batchSize,
    })

    if (rows.length === 0) {
      break
    }

    await getDelegate(target, model.delegate).createMany({ data: rows })
    copied += rows.length
    console.log(`  ${model.label}: copied ${copied}`)
  }
}

async function main() {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error(
      `MIGRATION_BATCH_SIZE must be a positive integer, got ${batchSize}.`
    )
  }

  if (isExecute && confirmValue !== confirmToken) {
    throw new Error(
      `Write mode requires --confirm-prod-migration=${confirmToken}.`
    )
  }

  if (shouldWipeTarget && !isExecute) {
    throw new Error('--wipe-target only works together with --execute.')
  }

  const mysqlUrl = requireEnv(sourceUrl, 'MYSQL_DATABASE_URL')
  const { targetUrl, addedPgBouncer } = withPrismaPgBouncerParam(
    requireEnv(rawTargetUrl, 'POSTGRES_DATABASE_URL')
  )
  const sourceSummary = parseDbUrl(mysqlUrl)
  const targetSummary = parseDbUrl(targetUrl)

  assertExpectedEndpoints(sourceSummary, targetSummary)

  console.log(`Source: ${formatSummary(sourceSummary)}`)
  console.log(`Target: ${formatSummary(targetSummary)}`)

  if (addedPgBouncer) {
    console.log(
      'Target port 6432 detected; added pgbouncer=true for Prisma client.'
    )
  }

  if (!isExecute) {
    console.log('Mode: dry-run. No target writes will be performed.')
  }

  const mysql = new MySqlPrismaClient({
    datasources: { db: { url: mysqlUrl } },
    log: ['error'],
  })
  const postgres = new PostgresPrismaClient({
    datasources: { db: { url: targetUrl } },
    log: ['error'],
  })

  try {
    await mysql.$connect()
    await postgres.$connect()
    await assertTargetWritableSchema(postgres)

    const sourceCounts = await getCounts(mysql)
    const targetCountsBefore = await getCounts(postgres)

    printCounts('Source counts:', sourceCounts)
    printCounts('Target counts before:', targetCountsBefore)

    const nonEmptyTargetTables = targetCountsBefore.filter(
      (row) => row.count > 0
    )

    if (nonEmptyTargetTables.length > 0 && !shouldWipeTarget) {
      throw new Error(
        `Target contains data in ${nonEmptyTargetTables
          .map((row) => row.label)
          .join(', ')}. Re-run with --wipe-target only after backup and explicit approval.`
      )
    }

    if (!isExecute) {
      return
    }

    await postgres.$transaction(
      async (tx) => {
        if (shouldWipeTarget) {
          console.log('Wiping target app tables...')
          await wipeTarget(tx)
        }

        console.log('Copying data...')

        for (const model of migrationPlan) {
          await copyModel(mysql, tx, model)
        }
      },
      { maxWait: 30_000, timeout: 10 * 60_000 }
    )

    const targetCountsAfter = await getCounts(postgres)
    printCounts('Target counts after:', targetCountsAfter)

    const mismatches = findMismatches(sourceCounts, targetCountsAfter)

    if (mismatches.length > 0) {
      throw new Error(
        `Count mismatch after copy: ${mismatches
          .map((row) => row.label)
          .join(', ')}.`
      )
    }

    console.log('Migration copy complete. Source and target counts match.')
  } finally {
    await mysql.$disconnect()
    await postgres.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
