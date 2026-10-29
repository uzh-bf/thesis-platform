import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadToSharePoint } from './sharePointFileRelay'

const file = {
  blobPath: 'uploads/b1.pdf',
  folder: 'Proposals/supervisor@df.uzh.ch',
  fileName: 'p1_b1.pdf',
}

function withRelay(
  respond: (body: Record<string, unknown>) => Response,
  run: () => Promise<void>
) {
  return async () => {
    const originalFetch = globalThis.fetch
    process.env.FILE_RELAY_HTTP_URL = 'https://relay.example/trigger'
    process.env.MAIL_SENDING_FLOW_SECRET = 'relay-secret'
    globalThis.fetch = (async (_url: string, init: RequestInit) =>
      respond(JSON.parse(String(init.body)))) as typeof fetch
    try {
      await run()
    } finally {
      globalThis.fetch = originalFetch
      delete process.env.FILE_RELAY_HTTP_URL
      delete process.env.MAIL_SENDING_FLOW_SECRET
    }
  }
}

test(
  'sends the file and secret and returns the link',
  withRelay(
    (body) => {
      assert.deepEqual(body, { ...file, secret: 'relay-secret' })
      return Response.json({
        webUrl: 'https://sp/link',
        mediaType: 'application/pdf',
      })
    },
    async () => {
      assert.deepEqual(await uploadToSharePoint(file), {
        webUrl: 'https://sp/link',
        mediaType: 'application/pdf',
      })
    }
  )
)

test(
  'fails on a rejected secret',
  withRelay(
    () => Response.json({ status: 'unauthorized' }, { status: 401 }),
    async () => {
      await assert.rejects(uploadToSharePoint(file), /status=401/)
    }
  )
)

test('fails when the relay is not configured', async () => {
  await assert.rejects(uploadToSharePoint(file), /FILE_RELAY_HTTP_URL/)
})
