import { PrismaClient } from '@prisma/client'
import readline from 'readline'

import {
  ApplicationStatus,
  ProposalFeedbackType,
  ProposalStatus,
  ProposalType,
  TopicAreas,
  UserRole,
} from '../src/lib/constants.js'

const prismaClient = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function seed(prisma: PrismaClient) {
  console.log('> running prisma seed')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  await Promise.all(
    Object.entries(TopicAreas).map(([slug, name]) =>
      prisma.topicArea.upsert({
        where: { slug },
        create: { slug, name },
        update: {},
      }),
    ),
  )

  await Promise.all(
    Object.values(ProposalStatus).map((status) =>
      prisma.proposalStatus.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      }),
    ),
  )

  await Promise.all(
    Object.values(ApplicationStatus).map((status) =>
      prisma.applicationStatus.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      }),
    ),
  )

  await Promise.all(
    Object.values(ProposalType).map((status) =>
      prisma.proposalType.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      }),
    ),
  )

  await Promise.all(
    Object.values(ProposalFeedbackType).map((status) =>
      prisma.proposalFeedbackType.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      }),
    ),
  )

  await new Promise((resolve) =>
    rl.question('Please sign-in with Github before continuing...', (ans) => {
      rl.close()
      resolve(ans)
    }),
  )

  const user = await prisma.user.update({
    where: { email: process.env.USER_EMAIL },
    data: {
      role: UserRole.SUPERVISOR,
      name: process.env.USER_NAME as string,
    },
  })

  await prisma.proposal.upsert({
    where: { id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f' },
    create: {
      id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f',
      title: 'Effects of Interest Rate on Happiness',
      description: 'This is a very interesting topic',
      language: '["English"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      topicArea: {
        connect: {
          slug: 'sustainable_finance',
        },
      },
      status: {
        connect: { key: ProposalStatus.OPEN },
      },
      type: {
        connect: { key: ProposalType.STUDENT },
      },
      applications: {
        create: {
          email: 'roland.ferdinand@uzh.ch',
          plannedStartAt: new Date(),
          fullName: 'Roland Ferdinand',
          matriculationNumber: '12-345-678',
          motivation: 'I want to',
        },
      },
      ownedByStudent: 'roland.ferdinand@uzh.ch',
      receivedFeedbacks: {
        create: {
          comment: 'Rejected because',
          type: {
            connect: { key: ProposalFeedbackType.REJECTED_NOT_SCIENTIFIC },
          },
          reason: ProposalFeedbackType.REJECTED_NOT_SCIENTIFIC,
          user: {
            connect: { email: user.email },
          },
        },
      },
    },
    update: {},
  })

  await prisma.proposal.upsert({
    where: { id: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6' },
    create: {
      id: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6',
      title:
        'The role of interest rate expectations for the choice between Fixed-Rate Mortgages and Adjustable-Rate Mortgages',
      description:
        'The role of interest rate expectations for the choice between Fixed-Rate Mortgages and Adjustable-Rate Mortgages',
      language: '["English", "German"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: 'Sometime next year.',
      topicArea: {
        connect: {
          slug: 'banking_and_insurance',
        },
      },
      status: {
        connect: { key: ProposalStatus.OPEN },
      },
      type: {
        connect: { key: ProposalType.SUPERVISOR },
      },
      supervisedBy: {
        create: {
          supervisor: {
            connect: { email: user.email },
          },
        },
      },
      ownedByUser: {
        connect: { email: user.email },
      },
      applications: {
        create: {
          plannedStartAt: new Date(),
          email: 'roland.ferdinand@uzh.ch',
          fullName: 'Roland Ferdinand',
          matriculationNumber: '12-345-678',
          motivation:
            'I want to do this topic as I think it is very interesting.',
          attachments: {
            createMany: {
              data: [
                {
                  name: 'CV.pdf',
                  href: 'https://example.com/cv.pdf',
                  type: 'application/pdf',
                },
                {
                  name: 'Transcript.pdf',
                  href: 'https://example.com/cv.pdf',
                  type: 'application/pdf',
                },
              ],
            },
          },
        },
      },
    },
    update: {},
  })

  await prisma.proposal.upsert({
    where: { id: '21140e2e-e630-494a-ab18-374fd11c62c0' },
    create: {
      id: '21140e2e-e630-494a-ab18-374fd11c62c0',
      title:
        'Treiber der Inflation in der Schweiz / Inflationsmessung in der Schweiz',
      description:
        'Treiber der Inflation in der Schweiz / Inflationsmessung in der Schweiz',
      language: '["English"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: '2023',
      topicArea: {
        connect: {
          slug: 'financial_economics',
        },
      },
      status: {
        connect: { key: ProposalStatus.OPEN },
      },
      type: {
        connect: { key: ProposalType.SUPERVISOR },
      },
      supervisedBy: {
        create: {
          supervisor: {
            connect: { email: user.email },
          },
        },
      },
      ownedByUser: {
        connect: { email: user.email },
      },
      applications: {
        create: {
          plannedStartAt: new Date(),
          email: 'roland.ferdinand@uzh.ch',
          fullName: 'Roland Ferdinand',
          matriculationNumber: '12-345-678',
          motivation:
            'I want to do this topic as I think it is very interesting.',
          attachments: {
            createMany: {
              data: [
                {
                  name: 'CV.pdf',
                  href: 'https://example.com/cv.pdf',
                  type: 'application/pdf',
                },
                {
                  name: 'Transcript.pdf',
                  href: 'https://example.com/cv.pdf',
                  type: 'application/pdf',
                },
              ],
            },
          },
        },
      },
    },
    update: {},
  })
}

seed(prismaClient)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })
