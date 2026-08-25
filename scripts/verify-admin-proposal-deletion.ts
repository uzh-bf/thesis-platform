import * as assert from 'node:assert/strict'

import { TRPCError } from '@trpc/server'
import { UserRole } from '../src/lib/constants'
import type { Context } from '../src/server/context'
import { appRouter } from '../src/server/routers/_app'

type AdminRole = 'ADMIN' | 'COORDINATOR' | 'UNSET'

function contextFor(role: UserRole, adminRole: AdminRole): Context {
  return {
    session: {
      user: {
        sub: `${role.toLowerCase()}-${adminRole.toLowerCase()}-subject`,
        role,
        adminRole,
        isAdmin: adminRole !== 'UNSET',
        name: `${role} (${adminRole})`,
        email: `${role.toLowerCase()}.${adminRole.toLowerCase()}@example.test`,
      },
    },
  } as Context
}

const anonymousContext = { session: null } as Context

async function assertRejected(
  ctx: Context,
  call: (caller: ReturnType<typeof appRouter.createCaller>) => Promise<unknown>,
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
) {
  await assert.rejects(
    () => call(appRouter.createCaller(ctx)),
    (error: unknown) => {
      assert.ok(error instanceof TRPCError)
      assert.equal(error.code, code)
      return true
    }
  )
}

// The procedure body needs a database, which is not available in every
// environment. Passing the authorization middleware is therefore asserted by
// making sure the call does not fail with an authorization error.
async function assertAuthorized(
  ctx: Context,
  call: (caller: ReturnType<typeof appRouter.createCaller>) => Promise<unknown>
) {
  try {
    await call(appRouter.createCaller(ctx))
  } catch (error) {
    if (error instanceof TRPCError) {
      assert.ok(
        error.code !== 'UNAUTHORIZED' && error.code !== 'FORBIDDEN',
        `Expected the call to pass authorization, got ${error.code}`
      )
    }
  }
}

const deleteInput = { proposalId: 'non-existing-proposal' }

async function main() {
  // Reading all proposals is available to full admins and to developers.
  await assertRejected(
    anonymousContext,
    (caller) => caller.adminGetAllProposals({}),
    'UNAUTHORIZED'
  )
  await assertRejected(
    contextFor(UserRole.STUDENT, 'UNSET'),
    (caller) => caller.adminGetAllProposals({}),
    'FORBIDDEN'
  )
  await assertRejected(
    contextFor(UserRole.SUPERVISOR, 'COORDINATOR'),
    (caller) => caller.adminGetAllProposals({}),
    'FORBIDDEN'
  )
  await assertAuthorized(contextFor(UserRole.SUPERVISOR, 'ADMIN'), (caller) =>
    caller.adminGetAllProposals({})
  )
  await assertAuthorized(contextFor(UserRole.DEVELOPER, 'UNSET'), (caller) =>
    caller.adminGetAllProposals({})
  )

  // Deleting a proposal is restricted to developers, no admin role grants it.
  await assertRejected(
    anonymousContext,
    (caller) => caller.adminDeleteProposal(deleteInput),
    'UNAUTHORIZED'
  )
  await assertRejected(
    contextFor(UserRole.STUDENT, 'UNSET'),
    (caller) => caller.adminDeleteProposal(deleteInput),
    'FORBIDDEN'
  )
  await assertRejected(
    contextFor(UserRole.SUPERVISOR, 'ADMIN'),
    (caller) => caller.adminDeleteProposal(deleteInput),
    'FORBIDDEN'
  )
  await assertAuthorized(contextFor(UserRole.DEVELOPER, 'UNSET'), (caller) =>
    caller.adminDeleteProposal(deleteInput)
  )

  console.log('Admin proposal deletion authorization checks passed.')
}

void main()
