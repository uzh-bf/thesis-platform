import { PrismaClient } from '@prisma/client'

const prismaClient = new PrismaClient()

async function seed(prisma: PrismaClient) {
  console.log('> running prisma seed')

  const user = await prisma.user.findUnique({
    where: { email: 'roland.schlaefli@bf.uzh.ch' },
  })

  if (!user) return

  await prisma.proposal.create({
    data: {
      title: 'Student Proposal',
      description: 'This is a student proposal',
      type: 'STUDENT',
    },
  })

  await prisma.proposal.create({
    data: {
      title: 'Supervisor Proposal',
      description: 'This is a supervisor proposal',
      type: 'SUPERVISOR',
      supervisedBy: {
        connect: { id: user.id },
      },
    },
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
