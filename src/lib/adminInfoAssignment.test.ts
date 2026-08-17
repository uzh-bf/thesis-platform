import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AdminInfoAssignmentPolicyError,
  resolveAdminInfoAssignment,
} from './adminInfoAssignment'

test('returns no assignment when both fields are absent', () => {
  assert.equal(resolveAdminInfoAssignment({ adminRole: 'COORDINATOR' }), null)
})

test('returns a complete assignment for a full admin', () => {
  assert.deepEqual(
    resolveAdminInfoAssignment({
      adminRole: 'ADMIN',
      responsibleId: 'responsible-1',
      supervisorEmail: 'supervisor@df.uzh.ch',
    }),
    {
      responsibleId: 'responsible-1',
      supervisorEmail: 'supervisor@df.uzh.ch',
    }
  )
})

test('rejects assignment fields from a coordinator', () => {
  assert.throws(
    () =>
      resolveAdminInfoAssignment({
        adminRole: 'COORDINATOR',
        responsibleId: 'responsible-1',
        supervisorEmail: 'supervisor@df.uzh.ch',
      }),
    (error) =>
      error instanceof AdminInfoAssignmentPolicyError &&
      error.code === 'FORBIDDEN'
  )
})

test('rejects assignment fields from an unset role', () => {
  assert.throws(
    () =>
      resolveAdminInfoAssignment({
        adminRole: 'UNSET',
        responsibleId: 'responsible-1',
        supervisorEmail: 'supervisor@df.uzh.ch',
      }),
    (error) =>
      error instanceof AdminInfoAssignmentPolicyError &&
      error.code === 'FORBIDDEN'
  )
})

test('rejects a partial assignment', () => {
  assert.throws(
    () =>
      resolveAdminInfoAssignment({
        adminRole: 'ADMIN',
        responsibleId: 'responsible-1',
      }),
    (error) =>
      error instanceof AdminInfoAssignmentPolicyError &&
      error.code === 'BAD_REQUEST'
  )
})
