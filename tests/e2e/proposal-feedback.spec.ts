import { expect, test, type APIRequestContext } from '@playwright/test'
import { prisma } from '../../src/server/prisma'

const proposalId = 'e2e0feed-0000-4000-8000-000000000001'
const supervisorEmail = 'admin@example.com'

async function removeTestProposal() {
  await prisma.adminInfo.deleteMany({ where: { proposalId } })
  await prisma.userProposalFeedback.deleteMany({ where: { proposalId } })
  await prisma.proposalApplication.deleteMany({ where: { proposalId } })
  await prisma.userProposalSupervision.deleteMany({ where: { proposalId } })
  await prisma.proposal.deleteMany({ where: { id: proposalId } })
}

async function submitFeedback(
  request: APIRequestContext,
  input: {
    actionType: 'ACCEPT' | 'ACCEPT_TENTATIVE' | 'DECLINE' | 'REJECT'
    personResponsible?: string
    reason?: string
  }
) {
  return request.post('/api/trpc/submitProposalFeedback?batch=1', {
    data: {
      0: {
        proposalName: 'E2E Feedback Proposal',
        comment: 'E2E feedback comment',
        proposalId,
        supervisorEmail,
        ...input,
      },
    },
  })
}

test.beforeEach(async () => {
  await removeTestProposal()

  const topicArea = await prisma.topicArea.findFirstOrThrow()

  // Student proposals have one application that shares the proposal's id.
  await prisma.proposal.create({
    data: {
      id: proposalId,
      title: 'E2E Feedback Proposal',
      description: 'Proposal used by the in-app feedback e2e test.',
      language: 'English',
      studyLevel: 'Master Thesis (30 ECTS)',
      topicAreaSlug: topicArea.slug,
      department: 'DF',
      typeKey: 'STUDENT',
      statusKey: 'OPEN',
      applications: {
        create: {
          id: proposalId,
          email: 'e2e.feedback.student@uzh.ch',
          fullName: 'E2E Feedback Student',
          matriculationNumber: '00-000-000',
          plannedStartAt: new Date(),
          motivation: 'E2E motivation',
          statusKey: 'OPEN',
        },
      },
    },
  })
})

test.afterAll(async () => {
  await removeTestProposal()
  await prisma.$disconnect()
})

test('giving feedback requires a signed-in user', async ({ request }) => {
  const response = await submitFeedback(request, {
    actionType: 'ACCEPT_TENTATIVE',
  })

  expect(response.status()).toBe(401)

  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
  })
  expect(proposal.statusKey).toBe('OPEN')
})

test('supervisor tentatively accepts, rejects, then accepts a proposal', async ({
  page,
}) => {
  await page.goto('/api/auth/signin')
  await page.getByRole('button', { name: 'Sign in with Local OIDC' }).click()
  await page.waitForURL('**/')

  // The local setup has no mail relay configured, so every response reports
  // that no email was sent while the feedback itself is stored.
  const expectNoEmail = async (
    response: Awaited<ReturnType<typeof submitFeedback>>
  ) => {
    expect(response.status(), await response.text()).toBe(200)
    const [result] = await response.json()
    expect(result.result.data).toEqual({ emailSent: false })
  }

  await expectNoEmail(
    await submitFeedback(page.request, { actionType: 'ACCEPT_TENTATIVE' })
  )
  let proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: { applications: true, supervisedBy: true },
  })
  expect(proposal.statusKey).toBe('MATCHED_TENTATIVE')
  expect(proposal.applications[0].statusKey).toBe('ACCEPTED_TENTATIVE')
  expect(proposal.supervisedBy[0].supervisorEmail).toBe(supervisorEmail)

  // A second tentative accept conflicts with the existing match.
  const repeated = await submitFeedback(page.request, {
    actionType: 'ACCEPT_TENTATIVE',
  })
  expect(repeated.status()).toBe(409)

  await expectNoEmail(
    await submitFeedback(page.request, {
      actionType: 'REJECT',
      reason: 'TOO_BROAD',
    })
  )
  const reopened = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      applications: true,
      supervisedBy: true,
      receivedFeedbacks: true,
    },
  })
  expect(reopened.statusKey).toBe('OPEN')
  expect(reopened.applications[0].statusKey).toBe('OPEN')
  expect(reopened.supervisedBy).toHaveLength(0)
  expect(reopened.receivedFeedbacks).toMatchObject([
    {
      userEmail: supervisorEmail,
      typeKey: 'REJECTED_TOO_BROAD',
      reason: 'REJECTED_TOO_BROAD',
    },
  ])

  const responsible = await prisma.responsible.findFirstOrThrow()
  await expectNoEmail(
    await submitFeedback(page.request, {
      actionType: 'ACCEPT',
      personResponsible: responsible.name,
    })
  )
  proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: { applications: true, supervisedBy: true },
  })
  expect(proposal.statusKey).toBe('MATCHED')
  expect(proposal.applications[0].statusKey).toBe('ACCEPTED')
  expect(proposal.supervisedBy[0]).toMatchObject({
    supervisorEmail,
    responsibleId: responsible.id,
  })
  expect(
    await prisma.adminInfo.findUnique({ where: { proposalId } })
  ).not.toBeNull()
})
