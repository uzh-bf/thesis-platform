import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createDraftMailing } from '../src/lib/cleverreach/client'
import {
  buildThesisProposalCleverReachReminderMail,
  createThesisProposalCleverReachDraftAndNotify,
  sendThesisProposalCleverReachReminder,
} from '../src/lib/cleverreach/reminder'
import {
  buildThesisProposalMailingParams,
  buildThesisProposalPreheader,
  createThesisProposalCleverReachDraft,
  parseProposalLanguages,
  type ThesisProposalDraftPayload,
} from '../src/lib/cleverreach/thesisProposal'
import { sendMail } from '../src/lib/mail/sendMail'

const appRouterSource = readFileSync(
  new URL('../src/server/routers/_app.ts', import.meta.url),
  'utf8'
)
const proposalPublishStart = appRouterSource.indexOf(
  '  submitProposalPublish: authedProcedure'
)
const proposalPublishEnd = appRouterSource.indexOf(
  '  acceptProposalApplication:',
  proposalPublishStart
)
assert.ok(proposalPublishStart >= 0)
assert.ok(proposalPublishEnd > proposalPublishStart)
const proposalPublishSource = appRouterSource.slice(
  proposalPublishStart,
  proposalPublishEnd
)
assert.doesNotMatch(proposalPublishSource, /console\.log\('URL:'/)
assert.doesNotMatch(proposalPublishSource, /console\.log\('Payload:'/)
assert.doesNotMatch(proposalPublishSource, /console\.error\('Response data:'/)
assert.match(proposalPublishSource, /secretkey: process\.env\.FLOW_SECRET/)

const env = {
  CLEVERREACH_CLIENT_ID: 'client-id',
  CLEVERREACH_CLIENT_SECRET: 'client-secret',
  CLEVERREACH_FILTER_THESES: 'filter-theses',
  CLEVERREACH_TEMPLATE_THESIS_PROPOSAL: 'THESIS_PROPOSAL_V0',
  CLEVERREACH_SUBJECT_THESIS_PROPOSAL: 'Neue Abschlussarbeit: {title}',
}

const payload: ThesisProposalDraftPayload = {
  proposalId: '11111111-1111-4111-8111-111111111111',
  title: 'Asset Pricing With Machine Learning',
  summary: '<b>Risk & return</b>\nSecond line',
  studyLevel: 'Master Thesis (30 ECTS)',
  languages: parseProposalLanguages('["English","German"]'),
  timeFrame: 'Fall Semester 2026',
  topicAreaName: 'Corporate Finance',
  supervisorEmail: 'supervisor@example.com',
  supervisorName: 'Prof. Example',
  responsibleEmail: 'responsible@example.com',
  responsibleName: 'Dr. Responsible',
  departmentName: 'Department of Finance',
  proposalUrl: 'https://theses.df.uzh.ch/11111111-1111-4111-8111-111111111111',
}

assert.deepEqual(payload.languages, ['English', 'German'])
assert.deepEqual(parseProposalLanguages('English, German'), [
  'English',
  'German',
])

const preheader = buildThesisProposalPreheader(payload)
assert.ok(preheader.length <= 80)
assert.ok(!preheader.includes(payload.title))
assert.equal(
  preheader,
  'Masterarbeit (30 ECTS), Corporate Finance, Herbstsemester 2026.'
)

const params = buildThesisProposalMailingParams({
  payload,
  env,
  now: new Date('2026-07-02T12:00:00.000Z'),
})

assert.ok(params)
assert.equal(params.config.filterId, 'filter-theses')
assert.equal(params.config.templateName, 'THESIS_PROPOSAL_V0')
assert.equal(
  params.subject,
  'Neue Abschlussarbeit: Asset Pricing With Machine Learning'
)
assert.equal(
  params.name,
  'THESIS_PROPOSAL thesis-proposal-11111111-1111-4111-8111-111111111111 2026-07-02T12:00:00.000Z'
)
assert.ok(params.replacements.some((item) => item.placeholder === 'PREHEADER'))
assert.ok(
  params.replacements.some(
    (item) =>
      item.placeholder === 'PROPOSAL_SUMMARY' &&
      item.replacement ===
        '&lt;b&gt;Risk &amp; return&lt;/b&gt;<br />Second line'
  )
)

async function verifyCleverReachDraftCreation() {
  const createDraftPayloads: {
    html: string
    filterId: string
    text: string
  }[] = []

  const result = await createThesisProposalCleverReachDraft(payload, {
    env,
    now: new Date('2026-07-02T12:00:00.000Z'),
    client: {
      getAccessToken: async () => 'token',
      fetchTemplateHtml: async () =>
        '[[PREHEADER]] [[PROPOSAL_TITLE]] [[PROPOSAL_SUMMARY]] [[PROPOSAL_LINK]]',
      createDraftMailing: async ({ html, filterId, text }) => {
        createDraftPayloads.push({ html, filterId, text })
        return 'mailing-id'
      },
    },
  })

  assert.equal(result.mailingId, 'mailing-id')
  const createDraftPayload = createDraftPayloads[0]
  assert.ok(createDraftPayload)
  assert.equal(createDraftPayload.filterId, 'filter-theses')
  assert.match(createDraftPayload.html, /Asset Pricing With Machine Learning/)
  assert.match(createDraftPayload.html, /&lt;b&gt;Risk &amp; return&lt;\/b&gt;/)
  assert.match(createDraftPayload.html, /https:\/\/theses\.df\.uzh\.ch/)
  assert.match(createDraftPayload.text, /Study level: Master Thesis/)

  const originalFetch = globalThis.fetch
  const requests: { url: string; init?: RequestInit }[] = []

  globalThis.fetch = (async (url, init) => {
    requests.push({ url: String(url), init })
    return new Response(JSON.stringify({ id: 'draft-id' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }) as typeof fetch

  try {
    const mailingId = await createDraftMailing({
      token: 'token',
      name: 'name',
      subject: 'subject',
      senderName: 'sender',
      senderEmail: 'sender@example.com',
      html: '<p>Hello</p>',
      text: 'Hello',
      filterId: 'filter-theses',
    })

    assert.equal(mailingId, 'draft-id')
    assert.equal(requests.length, 1)

    const request = requests[0]
    assert.match(request.url, /\/v3\/mailings\.json\?token=/)
    assert.equal(request.init?.method, 'POST')

    const body = JSON.parse(String(request.init?.body)) as {
      receivers?: unknown
      content?: { type?: string; html?: string; text?: string }
    }

    assert.deepEqual(body.receivers, { filter: 'filter-theses' })
    assert.deepEqual(body.content, {
      type: 'html',
      html: '<p>Hello</p>',
      text: 'Hello',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
}

async function verifyMailRelayContract() {
  const relayEnvironment = {
    MAIL_SENDING_HTTP_URL: '  https://relay.example.test/send  ',
    MAIL_SENDING_FLOW_SECRET: '  verifier-flow-secret  ',
    FLOW_SECRET: '  proposal-flow-secret  ',
    MAIL_SENDING_FROM: '  sender@example.test  ',
  }
  const relayEnvironmentNames = Object.keys(relayEnvironment)
  const requiredRelayEnvironmentNames = [
    'MAIL_SENDING_HTTP_URL',
    'MAIL_SENDING_FLOW_SECRET',
    'MAIL_SENDING_FROM',
  ]
  const originalRelayEnvironment = new Map(
    relayEnvironmentNames.map((name) => [name, process.env[name]] as const)
  )
  const relayRequests: { url: string; init?: RequestInit }[] = []
  let relayResponseStatus = 200
  let relayResponseBody = '{"ok":true}'
  const originalRelayFetch = globalThis.fetch

  try {
    for (const [name, value] of Object.entries(relayEnvironment)) {
      process.env[name] = value
    }

    globalThis.fetch = (async (url, init) => {
      relayRequests.push({ url: String(url), init })
      return new Response(relayResponseBody, { status: relayResponseStatus })
    }) as typeof fetch

    const relayInput = {
      to: ['management@example.test'],
      subject: 'CleverReach mailing ready',
      bodyAsHtml: '<p>Review this mailing.</p>',
      cc: ['copy@example.test'],
      bcc: ['audit@example.test'],
      replyTo: 'no-reply@example.test',
      sensitivity: 'Private' as const,
      importance: 'High' as const,
    }

    await sendMail(relayInput)
    assert.equal(relayRequests.length, 1)

    const relayRequest = relayRequests[0]
    assert.equal(relayRequest.url, 'https://relay.example.test/send')
    assert.equal(relayRequest.init?.method, 'POST')
    assert.deepEqual(relayRequest.init?.headers, {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })

    const relayHeaders = relayRequest.init?.headers as Record<string, string>
    assert.equal(
      Object.keys(relayHeaders).some((name) =>
        name.toLowerCase().includes('secret')
      ),
      false
    )

    const relayBody = JSON.parse(String(relayRequest.init?.body)) as Record<
      string,
      unknown
    >
    assert.deepEqual(relayBody, {
      from: 'sender@example.test',
      to: ['management@example.test'],
      subject: 'CleverReach mailing ready',
      bodyAsHtml: '<p>Review this mailing.</p>',
      secret: 'verifier-flow-secret',
      cc: ['copy@example.test'],
      bcc: ['audit@example.test'],
      replyTo: 'no-reply@example.test',
      sensitivity: 'Private',
      importance: 'High',
    })

    for (const missingName of requiredRelayEnvironmentNames) {
      for (const [name, value] of Object.entries(relayEnvironment)) {
        process.env[name] = value
      }
      if (missingName === 'MAIL_SENDING_FLOW_SECRET') {
        process.env[missingName] = '   '
      } else {
        delete process.env[missingName]
      }

      await sendMail(relayInput)
      assert.equal(relayRequests.length, 1)
    }

    for (const [name, value] of Object.entries(relayEnvironment)) {
      process.env[name] = value
    }
    await sendMail({ ...relayInput, to: [] })
    assert.equal(relayRequests.length, 1)

    relayResponseStatus = 502
    relayResponseBody = 'relay unavailable'
    await assert.rejects(
      () =>
        sendMail({
          ...relayInput,
          from: 'override@example.test',
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(error.message, 'sendMail status=502')
        return true
      }
    )
    assert.equal(relayRequests.length, 2)
    const rejectedBody = JSON.parse(
      String(relayRequests[1].init?.body)
    ) as Record<string, unknown>
    assert.equal(rejectedBody.from, 'override@example.test')
  } finally {
    globalThis.fetch = originalRelayFetch
    for (const name of relayEnvironmentNames) {
      const value = originalRelayEnvironment.get(name)
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  }
}

async function verifyReminderAndOrchestration() {
  const reminderTitle = `O'Hara <Risk & Return> "Model"`
  const reminderMail = buildThesisProposalCleverReachReminderMail({
    title: reminderTitle,
    recipients: ['management@example.test'],
    env: {
      NEXT_PUBLIC_DEPARTMENT_LONG_NAME: 'Department of Finance',
      CLEVERREACH_ADMIN_URL: '  https://cleverreach.example.test/admin  ',
    },
  })

  assert.deepEqual(reminderMail.to, ['management@example.test'])
  assert.equal(
    reminderMail.subject,
    'Department of Finance Theses - CleverReach mailing ready for review'
  )
  assert.equal(reminderMail.importance, 'High')
  assert.match(
    reminderMail.bodyAsHtml,
    /O&#39;Hara &lt;Risk &amp; Return&gt; &quot;Model&quot;/
  )
  assert.match(
    reminderMail.bodyAsHtml,
    /href="https:\/\/cleverreach\.example\.test\/admin"/
  )

  const defaultReminderMail = buildThesisProposalCleverReachReminderMail({
    title: 'Untitled thesis',
    recipients: [],
    env: {},
  })
  assert.equal(
    defaultReminderMail.subject,
    'Thesis Platform Theses - CleverReach mailing ready for review'
  )
  assert.match(
    defaultReminderMail.bodyAsHtml,
    /href="https:\/\/eu2\.cleverreach\.com\/admin"/
  )

  const sentReminders: Array<Parameters<typeof sendMail>[0]> = []
  await sendThesisProposalCleverReachReminder({
    title: reminderTitle,
    recipients: ['management@example.test'],
    send: async (input) => {
      sentReminders.push(input)
    },
  })
  assert.equal(sentReminders.length, 1)
  assert.equal(sentReminders[0].importance, 'High')

  let createdDrafts = 0
  let sentAfterDraft = 0
  await createThesisProposalCleverReachDraftAndNotify(
    payload,
    ['management@example.test'],
    {
      createDraft: async () => {
        createdDrafts += 1
        return { mailingId: 'mailing-id' }
      },
      sendReminder: async () => {
        sentAfterDraft += 1
      },
    }
  )
  assert.equal(createdDrafts, 1)
  assert.equal(sentAfterDraft, 1)

  let reminderCallsAfterDraftFailure = 0
  await assert.rejects(
    () =>
      createThesisProposalCleverReachDraftAndNotify(
        payload,
        ['management@example.test'],
        {
          createDraft: async () => {
            throw new Error('draft failed')
          },
          sendReminder: async () => {
            reminderCallsAfterDraftFailure += 1
          },
        }
      ),
    /draft failed/
  )
  assert.equal(reminderCallsAfterDraftFailure, 0)

  await createThesisProposalCleverReachDraftAndNotify(
    payload,
    ['management@example.test'],
    {
      createDraft: async () => ({ mailingId: 'mailing-id' }),
      sendReminder: async () => {
        throw new Error('relay failed')
      },
    }
  )
}

async function main() {
  await verifyCleverReachDraftCreation()
  await verifyMailRelayContract()
  await verifyReminderAndOrchestration()

  console.log(
    'CleverReach thesis proposal, reminder, and mail relay checks passed.'
  )
}

void main()
