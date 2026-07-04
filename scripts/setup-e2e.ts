import { execFileSync } from 'node:child_process'

const waitTimeoutMs = 60_000
const waitIntervalMs = 1_000

const run = (command: string, args: string[]) => {
  execFileSync(command, args, { stdio: 'inherit' })
}

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const waitFor = async (
  name: string,
  check: () => Promise<boolean> | boolean
) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < waitTimeoutMs) {
    if (await check()) {
      console.log(`${name} is ready`)
      return
    }

    await wait(waitIntervalMs)
  }

  throw new Error(`${name} did not become ready within ${waitTimeoutMs}ms`)
}

const canFetch = async (url: string, requireOk = false) => {
  try {
    const response = await fetch(url)
    return requireOk ? response.ok : true
  } catch (_error) {
    return false
  }
}

async function main() {
  run('docker', [
    'compose',
    'up',
    '--wait',
    '--wait-timeout',
    '60',
    'postgres',
    'azurite',
    'oidc',
  ])

  // `docker compose up --wait` already blocks on the postgres healthcheck, so
  // only azurite/oidc need explicit readiness polling (they have no healthcheck).
  await waitFor('Azurite Blob endpoint', () =>
    canFetch('http://127.0.0.1:11000/devstoreaccount1')
  )
  await waitFor('Local OIDC discovery', () =>
    canFetch(
      'http://localhost:4011/default/.well-known/openid-configuration',
      true
    )
  )

  run('prisma', ['db', 'push'])
  run('ts-node', ['--project', 'tsconfig.tsnode.json', 'prisma/seed-df.ts'])
  run('tsx', ['scripts/setup-azurite.ts'])
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
