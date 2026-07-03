import * as assert from 'node:assert/strict'

import { createDraftMailing } from '../src/lib/cleverreach/client'
import {
  buildThesisProposalMailingParams,
  buildThesisProposalPreheader,
  createThesisProposalCleverReachDraft,
  parseProposalLanguages,
  type ThesisProposalDraftPayload,
} from '../src/lib/cleverreach/thesisProposal'

const env = {
  CLEVERREACH_CLIENT_ID: 'client-id',
  CLEVERREACH_CLIENT_SECRET: 'client-secret',
  CLEVERREACH_FILTER_THESES: 'filter-theses',
  CLEVERREACH_TEMPLATE_THESIS_PROPOSAL: 'THESIS_PROPOSAL_V0',
  CLEVERREACH_SUBJECT_THESIS_PROPOSAL: 'New Thesis Available: {title}',
}

const payload: ThesisProposalDraftPayload = {
  proposalId: '11111111-1111-4111-8111-111111111111',
  title: 'Asset Pricing With Machine Learning',
  summary: '<b>Risk & return</b>\nSecond line',
  studyLevel: 'Master Thesis (30 ECTS)',
  languages: parseProposalLanguages('["English","German"]'),
  timeFrame: '6 months starting September 2026',
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
assert.match(preheader, /Master Thesis/)
assert.match(preheader, /Corporate Finance/)

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
  'New Thesis Available: Asset Pricing With Machine Learning'
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

async function main() {
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

  console.log('CleverReach thesis proposal builder checks passed.')
}

void main()
