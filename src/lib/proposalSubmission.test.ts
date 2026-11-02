import assert from 'node:assert/strict'
import test from 'node:test'
import type { FailureReport } from './failureNotification'
import {
  ProposalSubmissionError,
  buildSubmissionConfirmationEmail,
  buildSupervisorNotificationEmail,
  createSupervisorMatcher,
  formatLanguages,
  submitStudentProposal,
  type NewStudentProposal,
  type ProposalSubmissionInput,
  type ProposalSubmissionStore,
  type SubmissionTopicArea,
  type SupervisorMatcher,
} from './proposalSubmission'

const proposalBlob = '3dab3164-70d8-45ab-a06b-97975dd6f763-proposal.pdf'
const cvBlob = '5e2f9a10-1b2c-4d3e-8f90-a1b2c3d4e5f6-cv.pdf'
const transcriptBlob = '0b6c7d8e-9f01-4234-8567-89abcdef0123-transcript.pdf'
const attachmentBlob = 'aa11bb22-cc33-4d44-8e55-ff6677889900-data.pdf'

const input: ProposalSubmissionInput = {
  uzhemail: 'student@uzh.ch',
  fullName: 'Ada <Lovelace>',
  matriculationNumber: '12-345-678',
  title: 'Bonds & <Rates>',
  description: 'Line one & more\nLine two',
  language: '["English","German"]',
  studyLevel: 'Master Thesis (30 ECTS)',
  topicAreaSlug: 'banking_and_insurance',
  plannedStartAt: '2026-11-02',
  motivation: 'Because <script>',
  additionalStudentComment: '  ',
  allowUsage: true,
  allowPublication: false,
  proposalFile: proposalBlob,
  cvFile: cvBlob,
  transcriptFile: transcriptBlob,
  furtherAttachments: [attachmentBlob],
}

const topicArea: SubmissionTopicArea = {
  slug: 'banking_and_insurance',
  name: 'Banking & Insurance',
}

function createStore({
  found = topicArea as SubmissionTopicArea | null,
  hasSubmitted = false,
} = {}) {
  const created: NewStudentProposal[] = []
  const store: ProposalSubmissionStore = {
    async findTopicArea() {
      return found
    },
    async hasSubmitted() {
      return hasSubmitted
    },
    async createProposal(proposal) {
      created.push(proposal)
    },
  }
  return { store, created }
}

const matcher = (emails: string[]): SupervisorMatcher => ({
  async findNotifiedSupervisorEmails() {
    return emails
  },
})

const base = {
  department: 'DF',
  appUrl: 'https://theses.df.uzh.ch',
  containerName: 'uploads',
  managementRecipients: ['theses@df.uzh.ch'],
  newId: () => 'prop-1',
  now: () => new Date('2026-11-02T09:30:00'),
}

const okUpload = async (file: { fileName: string }) => ({
  webUrl: `https://sp/${file.fileName}`,
  mediaType: 'application/pdf',
})

test('uploads all files, saves the proposal and sends every email', async () => {
  const { store, created } = createStore()
  const uploads: unknown[] = []
  const mails: { to: string[]; bcc?: string[]; replyTo?: string }[] = []
  const deleted: string[] = []

  const result = await submitStudentProposal({
    ...base,
    input,
    store,
    matcher: matcher(['a@df.uzh.ch', 'b@df.uzh.ch', 'a@df.uzh.ch']),
    upload: async (file) => {
      uploads.push(file)
      return okUpload(file)
    },
    send: async (mail) => {
      mails.push(mail)
      return true
    },
    deleteBlob: async (name) => {
      deleted.push(name)
    },
  })

  assert.deepEqual(result, {
    proposalId: 'prop-1',
    studentEmailSent: true,
    supervisorEmailsSent: 2,
  })
  assert.deepEqual(uploads, [
    {
      blobPath: `uploads/${proposalBlob}`,
      folder: 'Proposals/student@uzh.ch',
      fileName: `prop-1_proposal_${proposalBlob}`,
    },
    {
      blobPath: `uploads/${cvBlob}`,
      folder: 'Proposals/student@uzh.ch',
      fileName: `prop-1_cv_${cvBlob}`,
    },
    {
      blobPath: `uploads/${transcriptBlob}`,
      folder: 'Proposals/student@uzh.ch',
      fileName: `prop-1_transcript_${transcriptBlob}`,
    },
    {
      blobPath: `uploads/${attachmentBlob}`,
      folder: 'Proposals/student@uzh.ch',
      fileName: `prop-1_attachment_${attachmentBlob}`,
    },
  ])

  assert.equal(created.length, 1)
  const { plannedStartAt, ...saved } = created[0]
  // Parsed like the flow's callback did: dayjs, local midnight.
  assert.equal(plannedStartAt.getTime(), new Date(2026, 10, 2).getTime())
  assert.deepEqual(saved, {
    id: 'prop-1',
    title: input.title,
    description: input.description,
    language: input.language,
    studyLevel: input.studyLevel,
    topicAreaSlug: 'banking_and_insurance',
    additionalStudentComment: undefined,
    email: 'student@uzh.ch',
    matriculationNumber: '12-345-678',
    fullName: input.fullName,
    motivation: input.motivation,
    allowUsage: true,
    allowPublication: false,
    attachments: [
      {
        name: 'Proposal',
        href: `https://sp/prop-1_proposal_${proposalBlob}`,
        type: 'application/pdf',
      },
      {
        name: 'CV',
        href: `https://sp/prop-1_cv_${cvBlob}`,
        type: 'application/pdf',
      },
      {
        name: 'Transcript',
        href: `https://sp/prop-1_transcript_${transcriptBlob}`,
        type: 'application/pdf',
      },
      {
        name: 'Attachment',
        href: `https://sp/prop-1_attachment_${attachmentBlob}`,
        type: 'application/pdf',
      },
    ],
  })

  assert.deepEqual(
    mails.map((mail) => mail.to),
    [['student@uzh.ch'], ['a@df.uzh.ch'], ['b@df.uzh.ch']]
  )
  assert.equal(mails[0].bcc, undefined)
  assert.equal(mails[0].replyTo, 'theses@df.uzh.ch')
  assert.deepEqual(mails[1].bcc, ['theses@df.uzh.ch'])
  assert.equal(mails[1].replyTo, 'student@uzh.ch')
  assert.deepEqual(deleted, [
    proposalBlob,
    cvBlob,
    transcriptBlob,
    attachmentBlob,
  ])
})

test('rejects file names that did not come from the upload endpoint', async () => {
  const { store, created } = createStore()
  const invalid: Partial<ProposalSubmissionInput>[] = [
    { cvFile: '../secret.pdf' },
    { transcriptFile: 'other.pdf' },
    { proposalFile: `${proposalBlob}.exe` },
    { furtherAttachments: ['nope.pdf'] },
    // The same blob twice would be copied twice and deleted early.
    { furtherAttachments: [cvBlob] },
    { furtherAttachments: Array(6).fill(attachmentBlob) },
  ]

  for (const change of invalid) {
    await assert.rejects(
      submitStudentProposal({
        ...base,
        input: { ...input, ...change },
        store,
        matcher: matcher([]),
        upload: async () => assert.fail('must not upload'),
        deleteBlob: async () => assert.fail('must not delete'),
      }),
      (error) =>
        error instanceof ProposalSubmissionError &&
        error.code === 'INVALID_FILE'
    )
  }
  assert.equal(created.length, 0)
})

test('rejects an unknown topic area before uploading', async () => {
  const { store } = createStore({ found: null })

  await assert.rejects(
    submitStudentProposal({
      ...base,
      input,
      store,
      matcher: matcher([]),
      upload: async () => assert.fail('must not upload'),
      deleteBlob: async () => {},
    }),
    (error) =>
      error instanceof ProposalSubmissionError &&
      error.code === 'TOPIC_AREA_NOT_FOUND'
  )
})

test('rejects a repeated submission before uploading', async () => {
  const { store, created } = createStore({ hasSubmitted: true })

  await assert.rejects(
    submitStudentProposal({
      ...base,
      input,
      store,
      matcher: matcher([]),
      upload: async () => assert.fail('must not upload'),
      deleteBlob: async () => assert.fail('must not delete'),
    }),
    (error) =>
      error instanceof ProposalSubmissionError &&
      error.code === 'ALREADY_SUBMITTED'
  )
  assert.equal(created.length, 0)
})

test('does not save the proposal when an upload fails', async () => {
  const { store, created } = createStore()

  await assert.rejects(
    submitStudentProposal({
      ...base,
      input,
      store,
      matcher: matcher([]),
      upload: async () => {
        throw new Error('uploadToSharePoint status=502')
      },
      send: async () => assert.fail('must not send'),
      deleteBlob: async () => assert.fail('blobs must stay'),
    }),
    (error) =>
      error instanceof ProposalSubmissionError && error.code === 'UPLOAD_FAILED'
  )
  assert.equal(created.length, 0)
})

test('keeps the proposal when emails, matching or cleanup fail', async () => {
  const { store, created } = createStore()

  const result = await submitStudentProposal({
    ...base,
    input: { ...input, furtherAttachments: [] },
    store,
    matcher: {
      async findNotifiedSupervisorEmails() {
        throw new Error('database down')
      },
    },
    upload: okUpload,
    send: async () => {
      throw new Error('sendMail status=500')
    },
    deleteBlob: async () => {
      throw new Error('blob gone')
    },
  })

  assert.deepEqual(result, {
    proposalId: 'prop-1',
    studentEmailSent: false,
    supervisorEmailsSent: 0,
  })
  assert.equal(created.length, 1)
  assert.equal(created[0].attachments.length, 3)
})

test('counts only supervisor emails that were sent', async () => {
  const { store } = createStore()

  const result = await submitStudentProposal({
    ...base,
    input,
    store,
    matcher: matcher(['a@df.uzh.ch', 'b@df.uzh.ch']),
    upload: okUpload,
    send: async (mail) => mail.to[0] !== 'b@df.uzh.ch',
    deleteBlob: async () => {},
  })

  assert.equal(result.supervisorEmailsSent, 1)
})

test('keeps a non-empty comment, trimmed', async () => {
  const { store, created } = createStore()

  await submitStudentProposal({
    ...base,
    input: { ...input, additionalStudentComment: '  Please hurry  ' },
    store,
    matcher: matcher([]),
    upload: okUpload,
    send: async () => true,
    deleteBlob: async () => {},
  })

  assert.equal(created[0].additionalStudentComment, 'Please hurry')
})

const attachments = [
  { name: 'Proposal', href: 'https://sp/a?x=1&y=2', type: 'application/pdf' },
]

test('escapes student input in the confirmation email', () => {
  const mail = buildSubmissionConfirmationEmail({
    department: 'DF',
    input,
    topicArea,
    attachments,
    submittedAt: new Date('2026-11-02T09:30:00'),
    managementRecipients: ['theses@df.uzh.ch'],
  })

  assert.equal(
    mail.subject,
    'DF Theses - Your Proposal has been received (Bonds & <Rates>)'
  )
  assert.match(mail.bodyAsHtml, /Dear Ada &lt;Lovelace&gt;,/)
  assert.match(mail.bodyAsHtml, /Bonds &amp; &lt;Rates&gt;/)
  assert.match(mail.bodyAsHtml, /Line one &amp; more<br>Line two/)
  assert.match(mail.bodyAsHtml, /Because &lt;script&gt;/)
  assert.match(mail.bodyAsHtml, /English, German/)
  assert.match(mail.bodyAsHtml, /Banking &amp; Insurance/)
  assert.match(mail.bodyAsHtml, /2026-11-02 09:30 \(student@uzh\.ch\)/)
  assert.match(mail.bodyAsHtml, /href="https:\/\/sp\/a\?x=1&amp;y=2"/)
  assert.doesNotMatch(mail.bodyAsHtml, /<script>/)
  assert.doesNotMatch(mail.bodyAsHtml, /Additional Comment/)
})

test('links the proposal in the supervisor email', () => {
  const mail = buildSupervisorNotificationEmail({
    department: 'DF',
    supervisorEmail: 'a@df.uzh.ch',
    input,
    topicArea,
    proposalUrl: 'https://theses.df.uzh.ch/prop-1',
    attachments,
    managementRecipients: ['theses@df.uzh.ch'],
  })

  assert.deepEqual(mail.to, ['a@df.uzh.ch'])
  assert.equal(mail.importance, 'High')
  assert.equal(
    mail.subject,
    'DF Theses - New Proposal for Review (Bonds & <Rates>)'
  )
  assert.match(mail.bodyAsHtml, /Area of interest - Banking &amp; Insurance/)
  assert.match(mail.bodyAsHtml, /https:\/\/theses\.df\.uzh\.ch\/prop-1/)
})

test('formats stored languages for emails', () => {
  assert.equal(formatLanguages('["English","German"]'), 'English, German')
  assert.equal(formatLanguages('English'), 'English')
})

test('matches supervisors through the supervisor store', async () => {
  const slugs: string[] = []
  const supervisorMatcher = createSupervisorMatcher({
    async findSupervisorsToNotify(slug) {
      slugs.push(slug)
      return [{ name: 'A', email: 'a@df.uzh.ch' }]
    },
  })

  assert.deepEqual(
    await supervisorMatcher.findNotifiedSupervisorEmails(
      'banking_and_insurance'
    ),
    ['a@df.uzh.ch']
  )
  assert.deepEqual(slugs, ['banking_and_insurance'])
})

test('reports nothing when every email goes out', async () => {
  const { store } = createStore()
  const reports: FailureReport[] = []

  await submitStudentProposal({
    ...base,
    input,
    store,
    matcher: matcher(['a@df.uzh.ch']),
    upload: okUpload,
    send: async () => true,
    deleteBlob: async () => {},
    reportFailure: async (report) => {
      reports.push(report)
    },
  })

  assert.deepEqual(
    reports.flatMap((report) => report.problems),
    []
  )
})

test('reports a topic area that no supervisor follows', async () => {
  const { store, created } = createStore()
  const reports: FailureReport[] = []

  await submitStudentProposal({
    ...base,
    input,
    store,
    matcher: matcher([]),
    upload: okUpload,
    send: async () => true,
    deleteBlob: async () => {},
    reportFailure: async (report) => {
      reports.push(report)
    },
  })

  assert.equal(created.length, 1)
  assert.equal(reports.length, 1)
  assert.equal(reports[0].process, 'Student proposal submission')
  assert.equal(reports[0].reference, 'proposal prop-1')
  assert.deepEqual(reports[0].problems, [
    'No supervisor has email notifications on for "Banking & Insurance", so none were informed',
  ])
})

test('reports failed emails and a failed matching in one report', async () => {
  const { store } = createStore()
  const reports: FailureReport[] = []

  await submitStudentProposal({
    ...base,
    input,
    store,
    matcher: {
      async findNotifiedSupervisorEmails() {
        throw new Error('db down')
      },
    },
    upload: okUpload,
    send: async () => {
      throw new Error('sendMail status=401')
    },
    deleteBlob: async () => {},
    reportFailure: async (report) => {
      reports.push(report)
    },
  })

  assert.equal(reports.length, 1)
  assert.deepEqual(reports[0].problems, [
    'The confirmation email to student@uzh.ch failed: sendMail status=401',
    'Finding the supervisors to inform failed, so none were emailed: db down',
  ])
})

test('reports supervisor emails the relay skipped', async () => {
  const { store } = createStore()
  const reports: FailureReport[] = []

  const result = await submitStudentProposal({
    ...base,
    input,
    store,
    matcher: matcher(['a@df.uzh.ch', 'b@df.uzh.ch']),
    upload: okUpload,
    send: async (mail) => !mail.to.includes('b@df.uzh.ch'),
    deleteBlob: async () => {},
    reportFailure: async (report) => {
      reports.push(report)
    },
  })

  assert.equal(result.supervisorEmailsSent, 1)
  assert.deepEqual(reports[0].problems, [
    'The supervisor email to b@df.uzh.ch was not sent',
  ])
})
