import { PrismaClient } from '@prisma/client'
import {
  ProposalFeedbackType,
  ProposalStatus,
  ProposalType,
} from '../src/lib/constants.js'

const prismaClient = new PrismaClient()

async function seed(prisma: PrismaClient) {
  console.log('> running prisma seed')

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

  const user = await prisma.user.upsert({
    where: { email: 'roland.schlaefli@bf.uzh.ch' },
    create: {
      email: 'roland.schlaefli@bf.uzh.ch',
    },
    update: {},
  })

  await prisma.proposal.upsert({
    where: { id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f' },
    create: {
      title: 'Student Proposal',
      description: 'This is a student proposal',
      status: {
        connect: { key: ProposalStatus.OPEN },
      },
      type: {
        connect: { key: ProposalType.STUDENT },
      },
    },
    update: {},
  })

  await prisma.proposal.upsert({
    where: { id: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6' },
    create: {
      title: 'Supervisor Proposal',
      description: 'This is a supervisor proposal',
      status: {
        connect: { key: ProposalStatus.OPEN },
      },
      type: {
        connect: { key: ProposalType.SUPERVISOR },
      },
      supervisedBy: {
        connectOrCreate: {
          where: {
            proposalId_userId: {
              proposalId: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6',
              userId: user.id,
            },
          },
          create: {
            user: {
              connect: { id: user.id },
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
