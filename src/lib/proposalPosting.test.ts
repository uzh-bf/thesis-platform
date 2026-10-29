import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ProposalPostingError,
  buildProposalPostedEmail,
  postSupervisorProposal,
  type NewSupervisorProposal,
  type ProposalPostingInput,
  type ProposalPostingStore,
} from './proposalPosting'
import { toSharePointName } from './sharePointFileRelay'

const input: ProposalPostingInput = {
  responder: 'prof@df.uzh.ch',
  proposalTitle: 'Bonds & <Rates>',
  proposalSummary: 'Summary',
  fieldOfResearch: 'Banking & Finance, Markets',
  supervisor: 'supervisor@df.uzh.ch',
  personResponsibleEmail: 'responsible@df.uzh.ch',
  bachelorOrMasterLevel: 'Master',
  proposalLanguage: '["English"]',
  timeFrame: 'Spring 2027',
  researchProposalPDF: 'b1-proposal.pdf',
  furtherAttachments: null,
}

function createStore({
  responsibleId = 'r1' as string | null,
  topicAreaExists = true,
} = {}) {
  const created: NewSupervisorProposal[] = []
  const store: ProposalPostingStore = {
    async findResponsibleId() {
      return responsibleId
    },
    async topicAreaExists() {
      return topicAreaExists
    },
    async createProposal(proposal) {
      created.push(proposal)
    },
  }
  return { store, created }
}

const base = {
  department: 'DF',
  appUrl: 'https://theses.df.uzh.ch',
  containerName: 'uploads',
  managementRecipients: ['theses@df.uzh.ch'],
  newId: () => 'p1',
}

test('uploads the files, creates the proposal and confirms it', async () => {
  const { store, created } = createStore()
  const uploads: unknown[] = []
  const deleted: string[] = []

  const result = await postSupervisorProposal({
    ...base,
    input: { ...input, furtherAttachments: 'b2-extra.pdf' },
    store,
    upload: async (file) => {
      uploads.push(file)
      return {
        webUrl: `https://sp/${file.fileName}`,
        mediaType: 'application/pdf',
      }
    },
    send: async (mail) => {
      assert.deepEqual(mail.to, ['prof@df.uzh.ch'])
      assert.equal(mail.replyTo, 'theses@df.uzh.ch')
      return true
    },
    deleteBlob: async (name) => {
      deleted.push(name)
    },
  })

  assert.deepEqual(result, { proposalId: 'p1', emailSent: true })
  assert.deepEqual(uploads, [
    {
      blobPath: 'uploads/b1-proposal.pdf',
      folder: 'Proposals/supervisor@df.uzh.ch',
      fileName: 'p1_b1-proposal.pdf',
    },
    {
      blobPath: 'uploads/b2-extra.pdf',
      folder: 'Proposals/supervisor@df.uzh.ch',
      fileName: 'p1_b2-extra.pdf',
    },
  ])
  assert.equal(created.length, 1)
  assert.equal(created[0].topicAreaSlug, 'banking_and_finance_markets')
  assert.equal(created[0].responsibleId, 'r1')
  assert.deepEqual(created[0].attachments, [
    {
      name: 'Proposal',
      href: 'https://sp/p1_b1-proposal.pdf',
      type: 'application/pdf',
    },
    {
      name: 'Attachment',
      href: 'https://sp/p1_b2-extra.pdf',
      type: 'application/pdf',
    },
  ])
  assert.deepEqual(deleted, ['b1-proposal.pdf', 'b2-extra.pdf'])
})

test('posts a proposal without files', async () => {
  const { store, created } = createStore()

  await postSupervisorProposal({
    ...base,
    input: { ...input, researchProposalPDF: '' },
    store,
    upload: async () => assert.fail('nothing to upload'),
    send: async () => true,
    deleteBlob: async () => assert.fail('nothing to delete'),
  })

  assert.deepEqual(created[0].attachments, [])
})

test('rejects an unknown responsible person before uploading', async () => {
  const { store, created } = createStore({ responsibleId: null })

  await assert.rejects(
    postSupervisorProposal({
      ...base,
      input,
      store,
      upload: async () => assert.fail('must not upload'),
      deleteBlob: async () => {},
    }),
    (error) =>
      error instanceof ProposalPostingError &&
      error.code === 'RESPONSIBLE_NOT_FOUND'
  )
  assert.equal(created.length, 0)
})

test('rejects an unknown field of research', async () => {
  const { store } = createStore({ topicAreaExists: false })

  await assert.rejects(
    postSupervisorProposal({
      ...base,
      input,
      store,
      upload: async () => assert.fail('must not upload'),
      deleteBlob: async () => {},
    }),
    (error) =>
      error instanceof ProposalPostingError &&
      error.code === 'TOPIC_AREA_NOT_FOUND'
  )
})

test('does not create the proposal when an upload fails', async () => {
  const { store, created } = createStore()

  await assert.rejects(
    postSupervisorProposal({
      ...base,
      input,
      store,
      upload: async () => {
        throw new Error('uploadToSharePoint status=502')
      },
      deleteBlob: async () => assert.fail('blobs must stay'),
    }),
    (error) =>
      error instanceof ProposalPostingError && error.code === 'UPLOAD_FAILED'
  )
  assert.equal(created.length, 0)
})

test('keeps the proposal when the email or blob cleanup fails', async () => {
  const { store, created } = createStore()

  const result = await postSupervisorProposal({
    ...base,
    input,
    store,
    upload: async () => ({
      webUrl: 'https://sp/f',
      mediaType: 'application/pdf',
    }),
    send: async () => {
      throw new Error('sendMail status=401')
    },
    deleteBlob: async () => {
      throw new Error('blob gone')
    },
  })

  assert.deepEqual(result, { proposalId: 'p1', emailSent: false })
  assert.equal(created.length, 1)
})

test('builds the posted email like the flow did', () => {
  const mail = buildProposalPostedEmail({
    department: 'DF',
    proposalTitle: 'Bonds & <Rates>',
    proposalUrl: 'https://theses.df.uzh.ch/p1',
    responder: 'prof@df.uzh.ch',
    managementRecipients: ['theses@df.uzh.ch'],
  })

  assert.equal(mail.subject, 'DF Theses - Your Proposal was posted')
  assert.deepEqual(mail.bcc, ['theses@df.uzh.ch'])
  assert.match(mail.bodyAsHtml, /"Bonds &amp; &lt;Rates&gt;"/)
  assert.match(
    mail.bodyAsHtml,
    /visible on https:\/\/theses\.df\.uzh\.ch\/p1\./
  )
})

test('replaces characters SharePoint does not allow', () => {
  assert.equal(
    toSharePointName('a/b\\c:d*e?f"g<h>i|j#k%l'),
    'a_b_c_d_e_f_g_h_i_j_k_l'
  )
})
