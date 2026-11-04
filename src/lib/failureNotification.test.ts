import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFailureNotificationEmail,
  createFailureReporter,
  getFailureEnvironmentLabel,
  getFailureNotificationRecipients,
} from './failureNotification'

test('prefers the failure recipients over the management recipients', () => {
  assert.deepEqual(
    getFailureNotificationRecipients({
      FAILURE_NOTIFICATION_RECIPIENTS: 'flow@df.uzh.ch, dev@df.uzh.ch',
      ADMIN_CHANGE_NOTIFICATION_RECIPIENTS: 'theses@df.uzh.ch',
    }),
    ['flow@df.uzh.ch', 'dev@df.uzh.ch']
  )
  assert.deepEqual(
    getFailureNotificationRecipients({
      FAILURE_NOTIFICATION_RECIPIENTS: ' ',
      ADMIN_CHANGE_NOTIFICATION_RECIPIENTS: 'theses@df.uzh.ch',
    }),
    ['theses@df.uzh.ch']
  )
  assert.deepEqual(getFailureNotificationRecipients({}), [])
})

test('builds an escaped failure mail', () => {
  const mail = buildFailureNotificationEmail({
    department: 'DF',
    report: {
      process: 'Student proposal submission',
      reference: 'proposal p1',
      problems: ['Mail to <a@b> failed: status=401'],
    },
    recipients: ['flow@df.uzh.ch'],
  })

  assert.deepEqual(mail.to, ['flow@df.uzh.ch'])
  assert.equal(
    mail.subject,
    'DF Theses - Failure: Student proposal submission (proposal p1)'
  )
  assert.equal(mail.importance, 'High')
  assert.match(
    mail.bodyAsHtml,
    /<li>Mail to &lt;a@b&gt; failed: status=401<\/li>/
  )
})

test('names non-production environments', () => {
  assert.equal(
    getFailureEnvironmentLabel({ THESIS_PLATFORM_ENV: 'stg' }),
    'Staging'
  )
  assert.equal(
    getFailureEnvironmentLabel({ THESIS_PLATFORM_ENV: ' DEV ' }),
    'Dev'
  )
  assert.equal(getFailureEnvironmentLabel({ THESIS_PLATFORM_ENV: 'prd' }), '')
  assert.equal(
    getFailureEnvironmentLabel({ THESIS_PLATFORM_ENV: 'prd_ibw' }),
    ''
  )
  assert.equal(getFailureEnvironmentLabel({}), '')
})

test('marks the subject of a staging failure mail', () => {
  const mail = buildFailureNotificationEmail({
    department: 'DF',
    environment: 'Staging',
    report: { process: 'Posting', problems: ['x'] },
    recipients: ['flow@df.uzh.ch'],
  })

  assert.equal(mail.subject, '[Staging] DF Theses - Failure: Posting')
})

test('mails a report and never throws', async () => {
  const sent: string[] = []
  const report = createFailureReporter({
    department: 'DF',
    recipients: ['flow@df.uzh.ch'],
    send: async (mail) => {
      sent.push(mail.subject)
      return true
    },
  })
  await report({ process: 'Posting', problems: ['x'] })
  assert.deepEqual(sent, ['DF Theses - Failure: Posting'])

  const failing = createFailureReporter({
    department: 'DF',
    recipients: ['flow@df.uzh.ch'],
    send: async () => {
      throw new Error('relay down')
    },
  })
  await assert.doesNotReject(failing({ process: 'Posting', problems: ['x'] }))
})

test('sends nothing without problems or recipients', async () => {
  let calls = 0
  const send = async () => {
    calls++
    return true
  }
  await createFailureReporter({
    department: 'DF',
    recipients: ['a@b.ch'],
    send,
  })({ process: 'Posting', problems: [] })
  await createFailureReporter({ department: 'DF', recipients: [], send })({
    process: 'Posting',
    problems: ['x'],
  })
  assert.equal(calls, 0)
})
