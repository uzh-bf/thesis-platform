import { PrismaClient } from '@prisma/client'
import readline from 'readline'

import {
  ApplicationStatus,
  ProposalFeedbackType,
  ProposalStatus,
  ProposalType,
  TopicAreas,
  UserRole,
} from '../src/lib/constants'

const prismaClient = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function seed(prisma: PrismaClient) {
  console.log('> running prisma seed')

  console.log('Seeding TopicAreas...')
  await Promise.all(
    Object.entries(TopicAreas).map(([slug, name]) =>
      prisma.topicArea.upsert({
        where: { slug },
        create: { slug, name },
        update: {},
      })
    )
  )
  console.log('TopicAreas seeded successfully')

  console.log('Seeding ProposalStatuses...')
  await Promise.all(
    Object.values(ProposalStatus).map((status) =>
      prisma.proposalStatus.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      })
    )
  )
  console.log('ProposalStatuses seeded successfully')

  console.log('Seeding ApplicationStatuses...')
  await Promise.all(
    Object.values(ApplicationStatus).map((status) =>
      prisma.applicationStatus.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      })
    )
  )
  console.log('ApplicationStatuses seeded successfully')

  console.log('Seeding ProposalTypes...')
  await Promise.all(
    Object.values(ProposalType).map((status) =>
      prisma.proposalType.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      })
    )
  )
  console.log('ProposalTypes seeded successfully')

  console.log('Seeding ProposalFeedbackTypes...')
  await Promise.all(
    Object.values(ProposalFeedbackType).map((status) =>
      prisma.proposalFeedbackType.upsert({
        where: { key: status },
        create: { key: status },
        update: {},
      })
    )
  )
  console.log('ProposalFeedbackTypes seeded successfully')

  console.log('Seeding Responsible table...')
  await prisma.responsible.create({
    data: {
      name: 'Service User_DF_DEV',
      email: 'ibf-srv-powplatf@d.uzh.ch',
    },
  })
  console.log('Responsible table seeded successfully')

  // Only prompt for user creation/update if environment variables are set
  if (process.env.USER_EMAIL && process.env.USER_NAME) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    await new Promise((resolve) =>
      rl.question('Please sign-in before continuing...', (ans) => {
        rl.close()
        resolve(ans)
      })
    )

    const user = await prisma.user.upsert({
      where: { email: process.env.USER_EMAIL },
      create: {
        email: process.env.USER_EMAIL,
        name: process.env.USER_NAME,
        role: UserRole.SUPERVISOR,
      },
      update: {
        role: UserRole.SUPERVISOR,
        name: process.env.USER_NAME,
      },
    })
    
    console.log(`User updated/created: ${user.email}`)
  } else {
    console.log('Skipping user creation - USER_EMAIL and USER_NAME environment variables not set')
  }

  console.log('✅ Database seeding completed successfully!')

  // Create sample proposals
  console.log('Creating sample proposals...')
  
  if (process.env.USER_EMAIL) {
    const user = await prisma.user.findUnique({
      where: { email: process.env.USER_EMAIL },
    })
    
    if (user) {
      await prisma.proposal.upsert({
        where: { id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f' },
        create: {
          id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f',
          title: 'Effects of Interest Rate on Happiness',
          description: 'This is a very interesting topic that explores how changes in interest rates affect overall happiness and well-being in society.',
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
              motivation: 'I want to explore this topic because I believe it has significant implications for economic policy.',
              status: {
                connect: { key: ApplicationStatus.OPEN },
              },
            },
          },
          ownedByStudent: 'roland.ferdinand@uzh.ch',
          ownedByUser: {
            connect: { email: user.email },
          },
          receivedFeedbacks: {
            create: {
              comment: 'Rejected because the methodology needs refinement.',
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
        where: { id: '3ef84a3b-cff0-4350-b760-4c5bb3b3cabc' },
        create: {
          id: '3ef84a3b-cff0-4350-b760-4c5bb3b3cabc',
          title: 'TEST STUDENT',
          description: 'TEST DESC',
          language: '["English"]',
          studyLevel: 'Bachelor Thesis (6 ECTS)',
          additionalStudentComment: 'TEST COMMENT',
          topicArea: {
            connect: {
              slug: 'banking_and_insurance',
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
              email: 'roland.ferdinand@df.uzh.ch',
              plannedStartAt: new Date(),
              fullName: 'Roland Ferdinand',
              matriculationNumber: '12-345-678',
              motivation: 'I want to explore this topic because I believe it has significant implications for economic policy.',
              status: {
                connect: { key: ApplicationStatus.OPEN },
              },
              allowPublication: true,
              allowUsage: true,
            },
          },
          ownedByStudent: 'roland.ferdinand@df.uzh.ch',
          ownedByUser: {
            connect: { email: user.email },
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
            'This research examines how consumer expectations about future interest rates influence their mortgage choices, with implications for personal finance and housing markets.',
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
              email: 'roland.ferdinand@df.uzh.ch',
              fullName: 'Roland Ferdinand',
              matriculationNumber: '12-345-678',
              motivation:
                'I want to do this topic as I think it is very interesting and relevant to current economic conditions.',
              status: {
                connect: { key: ApplicationStatus.OPEN },
              },
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
                      href: 'https://example.com/transcript.pdf',
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
            'Diese Forschung untersucht die Hauptfaktoren, die zur Inflation in der Schweiz beitragen, und bewertet die Methoden zur Inflationsmessung.',
          language: '["German", "English"]',
          studyLevel: 'Master Thesis (30 ECTS)',
          timeFrame: '2025',
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
                'Ich möchte dieses Thema erforschen, da es für das Verständnis der aktuellen wirtschaftlichen Situation in der Schweiz von entscheidender Bedeutung ist.',
              status: {
                connect: { key: ApplicationStatus.OPEN },
              },
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
                      href: 'https://example.com/transcript.pdf',
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
      
      console.log('Sample proposals created successfully!')
    } else {
      console.log('Skipping sample proposal creation - User not found')
    }
  } else {
    console.log('Skipping sample proposal creation - USER_EMAIL environment variable not set')
  }
}

seed(prismaClient)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })
