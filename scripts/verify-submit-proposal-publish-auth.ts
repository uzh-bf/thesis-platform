import * as assert from 'node:assert/strict'

import { TRPCError } from '@trpc/server'
import { UserRole } from '../src/lib/constants'
import type { Context } from '../src/server/context'
import { appRouter } from '../src/server/routers/_app'

const input = {
  responder: 'publisher@example.test',
  proposalTitle: 'A Valid Supervisor Proposal',
  proposalSummary: 'A'.repeat(100),
  fieldOfResearch: 'Corporate Finance',
  supervisor: 'supervisor@example.test',
  personResponsibleEmail: 'responsible@example.test',
  bachelorOrMasterLevel: 'Master Thesis (30 ECTS)',
  proposalLanguage: '["English"]',
  timeFrame: 'Fall Semester 2026',
  researchProposalPDF: null,
  furtherAttachments: null,
}

function contextForRole(role: UserRole): Context {
  return {
    session: {
      user: {
        sub: `${role.toLowerCase()}-subject`,
        role,
        name: `${role} publisher`,
        email: `${role.toLowerCase()}@example.test`,
      },
    },
  } as Context
}

async function assertRejected(
  role: UserRole | undefined,
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
) {
  const caller = appRouter.createCaller(
    role ? contextForRole(role) : ({ session: null } as Context)
  )

  await assert.rejects(
    () => caller.submitProposalPublish(input),
    (error: unknown) => {
      assert.ok(error instanceof TRPCError)
      assert.equal(error.code, code)
      return true
    }
  )
}

async function main() {
  const originalProposalPublishUrl = process.env.PROPOSAL_PUBLISH_URL
  delete process.env.PROPOSAL_PUBLISH_URL

  try {
    await assertRejected(undefined, 'UNAUTHORIZED')
    await assertRejected(UserRole.STUDENT, 'FORBIDDEN')

    for (const role of [UserRole.SUPERVISOR, UserRole.DEVELOPER]) {
      const caller = appRouter.createCaller(contextForRole(role))
      const result = await caller.submitProposalPublish(input)

      assert.equal(result.success, true)
      assert.equal(
        result.message,
        'Development mode: PROPOSAL_PUBLISH_URL not configured'
      )
    }

    console.log('Supervisor proposal publication authorization checks passed.')
  } finally {
    if (originalProposalPublishUrl === undefined) {
      delete process.env.PROPOSAL_PUBLISH_URL
    } else {
      process.env.PROPOSAL_PUBLISH_URL = originalProposalPublishUrl
    }
  }
}

void main()
