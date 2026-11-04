import assert from 'node:assert/strict'
import test from 'node:test'
import { canViewSupervisorList } from './supervisorListAccess'

test('developers always see the supervisor list', () => {
  assert.equal(
    canViewSupervisorList({
      role: 'DEVELOPER',
      adminRole: 'UNSET',
      supervisorListAccess: false,
    }),
    true
  )
})

test('admins see the supervisor list only when granted', () => {
  for (const adminRole of ['ADMIN', 'COORDINATOR']) {
    assert.equal(
      canViewSupervisorList({
        role: 'UNSET',
        adminRole,
        supervisorListAccess: false,
      }),
      false
    )
    assert.equal(
      canViewSupervisorList({
        role: 'SUPERVISOR',
        adminRole,
        supervisorListAccess: true,
      }),
      true
    )
  }
})

test('a grant without an admin role gives no access', () => {
  assert.equal(
    canViewSupervisorList({
      role: 'SUPERVISOR',
      adminRole: 'UNSET',
      supervisorListAccess: true,
    }),
    false
  )
})
