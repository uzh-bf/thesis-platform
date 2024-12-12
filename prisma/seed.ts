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

  const applicationStatus = await prisma.applicationStatus.createMany({
    data: Object.values(ApplicationStatus).map((status) => ({
      key: status,
    })),
  })

  const proposalStatus = await prisma.proposalStatus.createMany({
    data: Object.values(ProposalStatus).map((status) => ({
      key: status,
    })),
  })

  const proposalType = await prisma.proposalType.createMany({
    data: Object.values(ProposalType).map((status) => ({
      key: status,
    })),
  })  

  const topicArea = await prisma.topicArea.createMany({
    data: Object.entries(TopicAreas).map(([slug, name]) => ({
      slug,
      name,
    })),
  })

  const proposalFeedbackType = await prisma.proposalFeedbackType.createMany({
    data: Object.values(ProposalFeedbackType).map((status) => ({
      key: status,
    })),
  })

  const responsible = await prisma.responsible.createMany({
    data: [
      {
        name: 'Schlaefli Roland',
        email: 'roland.schlaefli@df.uzh.ch',
      },
      {
        name: 'Weber Maximilian',
        email: 'maximilian.weber@df.uzh.ch',
      }
    ]
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
