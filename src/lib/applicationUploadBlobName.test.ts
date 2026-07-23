import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationUploadBlobName } from './applicationUploadBlobName'

test('creates unique flat CV blob names associated with the proposal', () => {
  const firstName = createApplicationUploadBlobName('proposal-123', 'cv')
  const secondName = createApplicationUploadBlobName('proposal-123', 'cv')

  assert.match(
    firstName,
    /^proposal-123-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-cv\.pdf$/
  )
  assert.notEqual(firstName, secondName)
  assert.equal(firstName.includes('/'), false)
})

test('creates transcript names without applicant email addresses', () => {
  const name = createApplicationUploadBlobName('proposal-456', 'transcript')

  assert.match(name, /^proposal-456-.*-transcript\.pdf$/)
  assert.equal(name.includes('@'), false)
})
