import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ProposalApplicationError,
  buildApplicationConfirmationEmail,
  buildApplicationReceivedEmail,
  isUploadedBlobName,
  submitProposalApplication,
  type AppliedProposal,
  type NewProposalApplication,
  type ProposalApplicationInput,
  type ProposalApplicationStore,
} from './proposalApplication'

const cvBlob = '3dab3164-70d8-45ab-a06b-97975dd6f763-student-uzh.ch-cv.pdf'
const transcriptBlob =
  '5e2f9a10-1b2c-4d3e-8f90-a1b2c3d4e5f6-student-uzh.ch-transcript.pdf'

const input: ProposalApplicationInput = {
  proposalId: 'prop-1',
  uzhemail: 'student@uzh.ch',
  matriculationNumber: '12-345-678',
  fullName: 'Ada <Lovelace>',
  startingDate: '2026-11-02',
  motivation: 'Line one & more\nLine two',
  cvFile: cvBlob,
  transcriptFile: transcriptBlob,
  allowUsage: true,
  allowPublication: false,
}

const proposal: AppliedProposal = {
  title: 'Bonds & <Rates>',
  ownedByUserEmail: 'owner@df.uzh.ch',
  supervisorEmail: 'supervisor@df.uzh.ch',
}

function createStore({
  found = proposal as AppliedProposal | null,
  hasApplied = false,
} = {}) {
  const created: NewProposalApplication[] = []
  const store: ProposalApplicationStore = {
    async findProposal() {
      return found
    },
    async hasApplied() {
      return hasApplied
    },
    async createApplication(application) {
      created.push(application)
    },
  }
  return { store, created }
}

const base = {
  department: 'DF',
  containerName: 'uploads',
  managementRecipients: ['theses@df.uzh.ch'],
  newId: () => 'app-1',
}

const okUpload = async (file: { fileName: string }) => ({
  webUrl: `https://sp/${file.fileName}`,
  mediaType: 'application/pdf',
})

test('uploads both files, saves the application and sends both emails', async () => {
  const { store, created } = createStore()
  const uploads: unknown[] = []
  const mails: { to: string[]; subject: string }[] = []
  const deleted: string[] = []

  const result = await submitProposalApplication({
    ...base,
    input,
    store,
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
    applicationId: 'app-1',
    supervisorEmailSent: true,
    studentEmailSent: true,
  })
  assert.deepEqual(uploads, [
    {
      blobPath: `uploads/${cvBlob}`,
      folder: 'Applications/prop-1',
      fileName: cvBlob,
    },
    {
      blobPath: `uploads/${transcriptBlob}`,
      folder: 'Applications/prop-1',
      fileName: transcriptBlob,
    },
  ])
  assert.equal(created.length, 1)
  assert.equal(created[0].id, 'app-1')
  assert.equal(created[0].email, 'student@uzh.ch')
  assert.equal(created[0].allowPublication, false)
  assert.equal(
    created[0].plannedStartAt.toISOString(),
    '2026-11-02T00:00:00.000Z'
  )
  assert.deepEqual(created[0].attachments, [
    { name: 'CV', href: `https://sp/${cvBlob}`, type: 'application/pdf' },
    {
      name: 'Transcript',
      href: `https://sp/${transcriptBlob}`,
      type: 'application/pdf',
    },
  ])
  assert.deepEqual(
    mails.map((mail) => mail.to),
    [['supervisor@df.uzh.ch'], ['student@uzh.ch']]
  )
  assert.deepEqual(deleted, [cvBlob, transcriptBlob])
})

test('rejects file names that did not come from the upload endpoint', async () => {
  const { store, created } = createStore()

  for (const cvFile of ['../secret.pdf', 'other.pdf', `${cvBlob}.exe`]) {
    await assert.rejects(
      submitProposalApplication({
        ...base,
        input: { ...input, cvFile },
        store,
        upload: async () => assert.fail('must not upload'),
        deleteBlob: async () => assert.fail('must not delete'),
      }),
      (error) =>
        error instanceof ProposalApplicationError &&
        error.code === 'INVALID_FILE'
    )
  }
  assert.equal(created.length, 0)
})

test('rejects an unknown proposal before uploading', async () => {
  const { store } = createStore({ found: null })

  await assert.rejects(
    submitProposalApplication({
      ...base,
      input,
      store,
      upload: async () => assert.fail('must not upload'),
      deleteBlob: async () => {},
    }),
    (error) =>
      error instanceof ProposalApplicationError &&
      error.code === 'PROPOSAL_NOT_FOUND'
  )
})

test('rejects a second application before uploading', async () => {
  const { store, created } = createStore({ hasApplied: true })

  await assert.rejects(
    submitProposalApplication({
      ...base,
      input,
      store,
      upload: async () => assert.fail('must not upload'),
      deleteBlob: async () => assert.fail('must not delete'),
    }),
    (error) =>
      error instanceof ProposalApplicationError &&
      error.code === 'ALREADY_APPLIED'
  )
  assert.equal(created.length, 0)
})

test('does not save the application when an upload fails', async () => {
  const { store, created } = createStore()

  await assert.rejects(
    submitProposalApplication({
      ...base,
      input,
      store,
      upload: async () => {
        throw new Error('uploadToSharePoint status=502')
      },
      deleteBlob: async () => assert.fail('blobs must stay'),
    }),
    (error) =>
      error instanceof ProposalApplicationError &&
      error.code === 'UPLOAD_FAILED'
  )
  assert.equal(created.length, 0)
})

test('keeps the application when emails or blob cleanup fail', async () => {
  const { store, created } = createStore()

  const result = await submitProposalApplication({
    ...base,
    input,
    store,
    upload: okUpload,
    send: async () => {
      throw new Error('sendMail status=401')
    },
    deleteBlob: async () => {
      throw new Error('blob gone')
    },
  })

  assert.deepEqual(result, {
    applicationId: 'app-1',
    supervisorEmailSent: false,
    studentEmailSent: false,
  })
  assert.equal(created.length, 1)
})

test('builds the supervisor email like the flow did', () => {
  const mail = buildApplicationReceivedEmail({
    department: 'DF',
    proposal,
    input,
    cvUrl: 'https://sp/cv',
    transcriptUrl: 'https://sp/transcript',
    managementRecipients: ['theses@df.uzh.ch'],
  })

  assert.deepEqual(mail.to, ['supervisor@df.uzh.ch'])
  assert.deepEqual(mail.cc, ['owner@df.uzh.ch'])
  assert.deepEqual(mail.bcc, ['theses@df.uzh.ch'])
  assert.equal(mail.replyTo, 'student@uzh.ch')
  assert.equal(
    mail.subject,
    'DF Theses - New Application for Proposal "Bonds & <Rates>"'
  )
  assert.match(mail.bodyAsHtml, /Fullname: <\/strong>Ada &lt;Lovelace&gt;/)
  assert.match(mail.bodyAsHtml, /Line one &amp; more<br>Line two/)
  assert.match(mail.bodyAsHtml, /https:\/\/sp\/transcript/)
  assert.match(mail.bodyAsHtml, /https:\/\/sp\/cv/)
})

test('falls back to the owner when a proposal has no supervisor', () => {
  const mail = buildApplicationReceivedEmail({
    department: 'DF',
    proposal: { ...proposal, supervisorEmail: null },
    input,
    cvUrl: 'https://sp/cv',
    transcriptUrl: 'https://sp/transcript',
    managementRecipients: [],
  })

  assert.deepEqual(mail.to, ['owner@df.uzh.ch'])
  assert.equal(mail.cc, undefined)
})

test('builds the student confirmation like the flow did', () => {
  const mail = buildApplicationConfirmationEmail({
    department: 'DF',
    proposal,
    input,
    managementRecipients: ['theses@df.uzh.ch'],
  })

  assert.deepEqual(mail.to, ['student@uzh.ch'])
  assert.deepEqual(mail.bcc, ['theses@df.uzh.ch'])
  assert.equal(mail.subject, 'DF Theses - Confirmation Mail')
  assert.match(mail.bodyAsHtml, /^<p>Dear Ada &lt;Lovelace&gt;,/)
  assert.match(mail.bodyAsHtml, /proposal: "Bonds &amp; &lt;Rates&gt;"/)
  assert.match(mail.bodyAsHtml, /DF Thesis Coordinator/)
})

test('recognizes upload blob names', () => {
  assert.equal(isUploadedBlobName(cvBlob), true)
  assert.equal(isUploadedBlobName('not-a-uuid-cv.pdf'), false)
})
