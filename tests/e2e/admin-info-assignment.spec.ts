import { expect, test } from '@playwright/test'
import { prisma } from '../../src/server/prisma'

const proposalId = '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d'
const targetResponsibleEmail = 'e2e.assignment.professor@uzh.ch'
const targetSupervisorEmail = 'e2e.assignment.supervisor@uzh.ch'

let originalSupervision: {
  id: string
  responsibleId: string | null
  supervisorEmail: string | null
} | null = null

test.beforeAll(async () => {
  originalSupervision = await prisma.userProposalSupervision.findUnique({
    where: { proposalId },
    select: {
      id: true,
      responsibleId: true,
      supervisorEmail: true,
    },
  })

  if (!originalSupervision) {
    throw new Error('Seeded Admin Information supervision was not found.')
  }

  await Promise.all([
    prisma.responsible.upsert({
      where: { email: targetResponsibleEmail },
      create: {
        name: 'E2E Target Professor',
        email: targetResponsibleEmail,
        department: 'DF',
      },
      update: {
        name: 'E2E Target Professor',
        department: 'DF',
      },
    }),
    prisma.user.upsert({
      where: { email: targetSupervisorEmail },
      create: {
        name: 'E2E Target Supervisor',
        email: targetSupervisorEmail,
        role: 'SUPERVISOR',
        department: 'DF',
      },
      update: {
        name: 'E2E Target Supervisor',
        role: 'SUPERVISOR',
        department: 'DF',
      },
    }),
  ])
})

test.afterAll(async () => {
  if (originalSupervision) {
    await prisma.userProposalSupervision.update({
      where: { id: originalSupervision.id },
      data: {
        responsibleId: originalSupervision.responsibleId,
        supervisorEmail: originalSupervision.supervisorEmail,
      },
    })
  }

  await Promise.all([
    prisma.responsible.deleteMany({
      where: { email: targetResponsibleEmail },
    }),
    prisma.user.deleteMany({
      where: { email: targetSupervisorEmail },
    }),
  ])

  await prisma.$disconnect()
})

test('full admin reassigns an Admin Information entry without changing linked records', async ({
  page,
}) => {
  const before = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    select: {
      ownedByUserEmail: true,
      statusKey: true,
      supervisedBy: {
        select: { id: true },
      },
      applications: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          statusKey: true,
          supervisionId: true,
        },
      },
    },
  })

  await page.goto('/api/auth/signin')
  await page.getByRole('button', { name: 'Sign in with Local OIDC' }).click()
  await page.waitForURL('**/')
  await page.goto('/admin?tab=admininfo')

  await expect(
    page.getByText('Admin Panel · Admin Info Overview')
  ).toBeVisible()

  await page
    .getByPlaceholder('Filter by student, thesis, supervisor, or professor…')
    .fill('Machine Learning Applications in Financial Risk Assessment')
  await page
    .getByRole('row', {
      name: /Machine Learning Applications in Financial Risk Assessment/,
    })
    .click()

  await expect(
    page.getByRole('heading', { name: 'Entry Details' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Select Professor' }).click()
  await page
    .getByRole('textbox', { name: 'Search Professor' })
    .fill('E2E Target')
  await page.getByRole('option', { name: /E2E Target Professor/ }).click()

  await page.getByRole('button', { name: 'Select Supervisor' }).click()
  await page
    .getByRole('textbox', { name: 'Search Supervisor' })
    .fill('E2E Target')
  await page.getByRole('option', { name: /E2E Target Supervisor/ }).click()

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Entry Details' })
  ).toBeHidden()

  await expect
    .poll(async () =>
      prisma.userProposalSupervision.findUnique({
        where: { proposalId },
        select: {
          responsible: { select: { email: true } },
          supervisorEmail: true,
        },
      })
    )
    .toEqual({
      responsible: { email: targetResponsibleEmail },
      supervisorEmail: targetSupervisorEmail,
    })

  const after = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    select: {
      ownedByUserEmail: true,
      statusKey: true,
      supervisedBy: {
        select: { id: true },
      },
      applications: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          statusKey: true,
          supervisionId: true,
        },
      },
    },
  })

  expect(after).toEqual(before)

  await expect(
    page.getByRole('row', {
      name: /E2E Target Professor.*E2E Target Supervisor.*Machine Learning Applications in Financial Risk Assessment/,
    })
  ).toBeVisible()
})

test('coordinator view keeps Professor and Supervisor read-only', async ({
  page,
}) => {
  await page.goto('/api/auth/signin')
  await page.getByRole('button', { name: 'Sign in with Local OIDC' }).click()
  await page.waitForURL('**/')

  await page.route('**/api/auth/session', async (route) => {
    const response = await route.fetch()
    const session = await response.json()

    await route.fulfill({
      response,
      json: {
        ...session,
        user: {
          ...session.user,
          adminRole: 'COORDINATOR',
          isAdmin: true,
        },
      },
    })
  })

  await page.goto('/admin?tab=admininfo')
  await page
    .getByPlaceholder('Filter by student, thesis, supervisor, or professor…')
    .fill('Machine Learning Applications in Financial Risk Assessment')
  await page
    .getByRole('row', {
      name: /Machine Learning Applications in Financial Risk Assessment/,
    })
    .click()

  await expect(
    page.getByRole('heading', { name: 'Entry Details' })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Select Professor' })
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Select Supervisor' })
  ).toHaveCount(0)
  await expect(page.getByText(targetResponsibleEmail)).toBeVisible()
  await expect(page.getByText(targetSupervisorEmail)).toBeVisible()
})
