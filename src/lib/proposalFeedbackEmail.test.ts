import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProposalFeedbackEmail } from './proposalFeedbackEmail'

const baseInput = {
  department: 'DF',
  proposalTitle: 'Risk & Return',
  studentEmail: 'student@uzh.ch',
  studentFullName: 'Ada Student',
  supervisorEmail: 'supervisor@df.uzh.ch',
  comment: 'Looks good.\nLet us talk.',
  managementRecipients: ['theses@df.uzh.ch'],
}

test('accept goes to student and supervisor, BCC management', () => {
  const email = buildProposalFeedbackEmail({
    ...baseInput,
    actionType: 'ACCEPT',
  })

  assert.deepEqual(email.to, ['student@uzh.ch', 'supervisor@df.uzh.ch'])
  assert.deepEqual(email.bcc, ['theses@df.uzh.ch'])
  assert.equal(email.replyTo, 'supervisor@df.uzh.ch')
  assert.equal(email.subject, 'DF Theses - Your Proposal has been accepted')
  assert.match(email.bodyAsHtml, /Dear Ada Student,/)
  assert.match(email.bodyAsHtml, /"Risk &amp; Return" has been accepted/)
  assert.match(
    email.bodyAsHtml,
    /Message of your supervisor: Looks good\.<br>Let us talk\./
  )
  assert.match(email.bodyAsHtml, /DF Thesis Coordinator/)
})

test('tentative accept asks the student to improve the proposal', () => {
  const email = buildProposalFeedbackEmail({
    ...baseInput,
    actionType: 'ACCEPT_TENTATIVE',
  })

  assert.deepEqual(email.to, ['student@uzh.ch', 'supervisor@df.uzh.ch'])
  assert.deepEqual(email.bcc, ['theses@df.uzh.ch'])
  assert.equal(email.replyTo, 'supervisor@df.uzh.ch')
  assert.equal(
    email.subject,
    'DF Theses - Your Proposal has attracted interest'
  )
  assert.match(email.bodyAsHtml, /Feedback of your potential supervisor:/)
})

test('decline and reject notify only the management inbox', () => {
  for (const [actionType, verb] of [
    ['DECLINE', 'declined'],
    ['REJECT', 'rejected'],
  ] as const) {
    const email = buildProposalFeedbackEmail({
      ...baseInput,
      actionType,
      reason: 'TOO_BROAD',
    })

    assert.deepEqual(email.to, ['theses@df.uzh.ch'])
    assert.equal(email.bcc, undefined)
    assert.equal(email.replyTo, undefined)
    assert.equal(email.subject, `DF Theses - Proposal ${verb} (Risk & Return)`)
    assert.match(
      email.bodyAsHtml,
      new RegExp(`has been ${verb} by "supervisor@df.uzh.ch"`)
    )
    assert.match(email.bodyAsHtml, /<strong>Reason:<\/strong> TOO_BROAD/)
  }
})

test('escapes user content', () => {
  const email = buildProposalFeedbackEmail({
    ...baseInput,
    actionType: 'ACCEPT',
    studentFullName: '<b>Ada</b>',
    comment: '<script>alert(1)</script>',
  })

  assert.doesNotMatch(email.bodyAsHtml, /<script>|<b>Ada/)
  assert.match(email.bodyAsHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(email.bodyAsHtml, /Dear &lt;b&gt;Ada&lt;\/b&gt;,/)
})
