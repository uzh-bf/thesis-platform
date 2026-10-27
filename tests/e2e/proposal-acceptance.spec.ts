import { expect, test } from '@playwright/test'
import { prisma } from '../../src/server/prisma'

const proposalId = 'e2e0acce-0000-4000-8000-000000000001'
const supervisorEmail = 'admin@example.com'
const acceptedApplicant = {
  id: 'e2e0acce-0000-4000-8000-000000000011',
  email: 'e2e.accepted.student@uzh.ch',
  fullName: 'E2E Accepted Student',
}
const declinedApplicant = {
  id: 'e2e0acce-0000-4000-8000-000000000012',
  email: 'e2e.declined.student@uzh.ch',
  fullName: 'E2E Declined Student',
}

async function removeTestProposal() {
  await prisma.adminInfo.deleteMany({ where: { proposalId } })
  await prisma.proposalApplication.deleteMany({ where: { proposalId } })
  await prisma.proposal.deleteMany({ where: { id: proposalId } })
}

test.beforeEach(async () => {
  await removeTestProposal()

  const topicArea = await prisma.topicArea.findFirstOrThrow()

  await prisma.proposal.create({
    data: {
      id: proposalId,
      title: 'E2E In-App Acceptance Proposal',
      description: 'Proposal used by the in-app acceptance e2e test.',
      language: 'English',
      studyLevel: 'Master Thesis (30 ECTS)',
      topicAreaSlug: topicArea.slug,
      department: 'DF',
      typeKey: 'SUPERVISOR',
      statusKey: 'OPEN',
      ownedByUserEmail: supervisorEmail,
      supervisedBy: {
        create: {
          supervisorEmail,
          studyLevel: 'Master Thesis (30 ECTS)',
        },
      },
      applications: {
        create: [acceptedApplicant, declinedApplicant].map((applicant) => ({
          ...applicant,
          matriculationNumber: '00-000-000',
          plannedStartAt: new Date(),
          motivation: 'E2E motivation',
          statusKey: 'OPEN',
        })),
      },
    },
  })
})

test.afterAll(async () => {
  await removeTestProposal()
  await prisma.$disconnect()
})

test('accepting an application requires a signed-in user', async ({
  request,
}) => {
  const response = await request.post(
    '/api/trpc/acceptProposalApplication?batch=1',
    {
      data: {
        0: {
          json: {
            proposalId,
            proposalApplicationId: acceptedApplicant.id,
            applicantEmail: acceptedApplicant.email,
          },
        },
      },
    }
  )

  expect(response.status()).toBe(401)

  const application = await prisma.proposalApplication.findUniqueOrThrow({
    where: { id: acceptedApplicant.id },
  })
  expect(application.statusKey).toBe('OPEN')
})

test('supervisor accepts an applicant in-app and closes the proposal', async ({
  page,
}) => {
  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.accept()
  })

  await page.goto('/api/auth/signin')
  await page.getByRole('button', { name: 'Sign in with Local OIDC' }).click()
  await page.waitForURL('**/')
  await page.goto(`/proposals/${proposalId}/applications`)

  // The closest element that holds both the applicant's expand toggle and an
  // Accept button is that applicant's card.
  const acceptedCard = page
    .getByRole('button', {
      name: `Expand details for ${acceptedApplicant.fullName}`,
    })
    .locator('xpath=ancestor::*[.//button[normalize-space()="Accept"]][1]')
  await acceptedCard
    .getByRole('button', { name: 'Accept', exact: true })
    .click()

  await expect(
    page.getByText(`Confirm acceptance for ${acceptedApplicant.fullName}`)
  ).toBeVisible()
  await page.getByText('Also close the proposal.').click()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()

  await expect
    .poll(async () => {
      const proposal = await prisma.proposal.findUniqueOrThrow({
        where: { id: proposalId },
      })
      return proposal.statusKey
    })
    .toBe('MATCHED')

  const [accepted, declined, supervision, adminInfo] = await Promise.all([
    prisma.proposalApplication.findUniqueOrThrow({
      where: { id: acceptedApplicant.id },
    }),
    prisma.proposalApplication.findUniqueOrThrow({
      where: { id: declinedApplicant.id },
    }),
    prisma.userProposalSupervision.findUniqueOrThrow({
      where: { proposalId },
    }),
    prisma.adminInfo.findUnique({ where: { proposalId } }),
  ])

  expect(accepted.statusKey).toBe('ACCEPTED')
  expect(accepted.supervisionId).toBe(supervision.id)
  expect(supervision.studentEmail).toBe(acceptedApplicant.email)
  expect(declined.statusKey).toBe('DECLINED')
  expect(adminInfo).not.toBeNull()

  // The local setup has no mail relay configured, so the dialog reports that
  // neither the acceptance nor the declined email was sent, while the
  // acceptance and the close still stand.
  await expect.poll(() => dialogs).toHaveLength(2)
  expect(dialogs).toContainEqual(
    expect.stringContaining('the acceptance email could not be sent')
  )
  expect(dialogs).toContainEqual(
    expect.stringContaining('1 decline email(s) could not be sent')
  )
})
