import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildStudentReminderMail,
  runStudentProposalReminders,
  type DueStudentProposal,
  type StudentReminderStore,
} from './studentReminder'

const now = new Date('2026-10-28T09:00:00Z')

function createStore(due: DueStudentProposal[], withdrawn: string[] = []) {
  const calls = {
    withdrawBefore: null as Date | null,
    dueBefore: null as Date | null,
    marked: [] as string[],
  }
  const store: StudentReminderStore = {
    async withdrawUnconfirmed(updatedBefore) {
      calls.withdrawBefore = updatedBefore
      return withdrawn
    },
    async findDue(updatedBefore) {
      calls.dueBefore = updatedBefore
      return due
    },
    async markWaitingForStudent(id) {
      calls.marked.push(id)
      return true
    },
  }
  return { store, calls }
}

test('withdraws after one week and reminds after eight weeks', async () => {
  const { store, calls } = createStore(
    [{ id: 'p1', title: 'Title', emails: ['student@uzh.ch'] }],
    ['p0']
  )

  const result = await runStudentProposalReminders({
    store,
    appUrl: 'https://theses.df.uzh.ch',
    now,
    send: async (mail) => {
      assert.equal(mail.timeoutMs, 30_000)
      return true
    },
  })

  assert.deepEqual(result, {
    withdrawnProposalIds: ['p0'],
    remindedProposalIds: ['p1'],
    failedProposalIds: [],
  })
  assert.equal(calls.withdrawBefore?.toISOString(), '2026-10-21T09:00:00.000Z')
  assert.equal(calls.dueBefore?.toISOString(), '2026-09-02T09:00:00.000Z')
  assert.deepEqual(calls.marked, ['p1'])
})

test('keeps a proposal open when its reminder is not sent', async () => {
  const { store, calls } = createStore([
    { id: 'skipped', title: 'A', emails: ['a@uzh.ch'] },
    { id: 'thrown', title: 'B', emails: ['b@uzh.ch'] },
    { id: 'sent', title: 'C', emails: ['c@uzh.ch'] },
  ])

  const result = await runStudentProposalReminders({
    store,
    appUrl: 'https://theses.df.uzh.ch',
    now,
    send: async (mail) => {
      if (mail.to[0] === 'b@uzh.ch') throw new Error('sendMail status=500')
      return mail.to[0] === 'c@uzh.ch'
    },
  })

  assert.deepEqual(result.remindedProposalIds, ['sent'])
  assert.deepEqual(result.failedProposalIds, ['skipped', 'thrown'])
  assert.deepEqual(calls.marked, ['sent'])
})

test('builds the confirmation mail with an escaped title', () => {
  const mail = buildStudentReminderMail({
    proposal: { id: 'p 1', title: '<b>AI</b>', emails: ['s@uzh.ch'] },
    appUrl: 'https://theses.df.uzh.ch',
  })

  assert.deepEqual(mail.to, ['s@uzh.ch'])
  assert.equal(mail.subject, 'Action Required: Proposal bestätigen')
  assert.match(mail.bodyAsHtml, /&lt;b&gt;AI&lt;\/b&gt;/)
  assert.match(
    mail.bodyAsHtml,
    /href="https:\/\/theses\.df\.uzh\.ch\/api\/updateProposalUpdatedAt\/p%201"/
  )
  assert.match(mail.bodyAsHtml, /innerhalb von 7 Tagen/)
})
