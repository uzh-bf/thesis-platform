import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSupervisorCsv, getCsvDelimiter } from './supervisorCsv'

test('builds an escaped supervisor CSV', () => {
  const csv = buildSupervisorCsv(
    [
      {
        name: 'Anne Brenøe',
        email: 'anne.brenoe@business.uzh.ch',
        topicAreas: ['Personnel & Leadership', 'Strategy'],
        submissionNotifications: false,
        notes: '=on "leave"',
      },
    ],
    ';'
  )

  assert.equal(
    csv,
    '﻿"Name";"Email";"Topic Areas";"Notifications";"Notes"\n' +
      '"Anne Brenøe";"anne.brenoe@business.uzh.ch";"Personnel & Leadership, Strategy";"No";"\'=on ""leave"""\n'
  )
})

test('picks the delimiter from the browser language', () => {
  assert.equal(getCsvDelimiter('de-CH'), ';')
  assert.equal(getCsvDelimiter('en-US'), ',')
  assert.equal(getCsvDelimiter(undefined), ',')
})
