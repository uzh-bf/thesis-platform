import { PrismaClient, Status as AdminStatus } from '@prisma/client'
import readline from 'readline'

import {
  ApplicationStatus,
  ProposalFeedbackType,
  ProposalStatus,
  ProposalType,
  TopicAreas,
  UserRole,
  Department,
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
        create: { slug, name, department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department },
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
  await prisma.responsible.createMany({
    skipDuplicates: true,
    data: [
      {
        name: process.env.USER_NAME as string,
        email: process.env.USER_EMAIL as string,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      }
    ],
  })
  
  console.log(`\x1b[1m\x1b[93m⚠️  RESPONSIBLE with Name: ${process.env.USER_NAME} and Email: ${process.env.USER_EMAIL} created from (Doppler) .env file\x1b[0m`)

  // Pre-create supervisor accounts that will be linked on first OAuth login
  console.log('Seeding pre-defined supervisor accounts...')
  
  // Testing with one user first
  const predefinedSupervisors = [
    {
      email: process.env.USER_EMAIL as string,
      name: process.env.USER_NAME as string,
      role: UserRole.SUPERVISOR,
    }
  ]

  for (const supervisor of predefinedSupervisors) {
    await prisma.user.upsert({
      where: { email: supervisor.email },
      create: {
        email: supervisor.email,
        name: supervisor.name,
        role: supervisor.role,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      update: {
        role: supervisor.role,
        name: supervisor.name,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
    })
  }
  
  console.log(`\x1b[1m\x1b[93m⚠️  SUPERVISOR with Name: ${process.env.USER_NAME} and Email: ${process.env.USER_EMAIL} created from (Doppler) .env file\x1b[0m`)

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
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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

      console.log('Creating dummy supervised theses (Responsible + AdminInfo)...')

      const department = process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department

      await prisma.responsible.createMany({
        skipDuplicates: true,
        data: [
          {
            name: 'Alice Responsible',
            email: 'alice.responsible@uzh.ch',
            department,
          },
          {
            name: 'Bob Responsible',
            email: 'bob.responsible@uzh.ch',
            department,
          },
        ],
      })

      const responsibles = await prisma.responsible.findMany({
        where: {
          email: {
            in: [
              'alice.responsible@uzh.ch',
              'bob.responsible@uzh.ch',
              process.env.USER_EMAIL as string,
            ],
          },
          department,
        },
        select: {
          id: true,
          email: true,
        },
      })

      const responsibleByEmail = new Map(
        responsibles.map((r) => [r.email, r.id])
      )

      const aliceResponsibleId = responsibleByEmail.get('alice.responsible@uzh.ch')
      const bobResponsibleId = responsibleByEmail.get('bob.responsible@uzh.ch')
      const fallbackResponsibleId =
        responsibleByEmail.get(process.env.USER_EMAIL as string) ||
        aliceResponsibleId ||
        bobResponsibleId

      const supervisedTheses = [
        {
          proposalId: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f',
          responsibleId: aliceResponsibleId || fallbackResponsibleId,
          studentEmail: 'student.one@uzh.ch',
          studyLevel: 'Master Thesis (30 ECTS)',
          adminStatus: AdminStatus.IN_PROGRESS,
          latestSubmissionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          grade: null as number | null,
        },
        {
          proposalId: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6',
          responsibleId: bobResponsibleId || fallbackResponsibleId,
          studentEmail: 'student.two@uzh.ch',
          studyLevel: 'Master Thesis (30 ECTS)',
          adminStatus: AdminStatus.GRADING,
          latestSubmissionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
          grade: 5.5,
        },
      ].filter((t) => Boolean(t.responsibleId)) as Array<{
        proposalId: string
        responsibleId: string
        studentEmail: string
        studyLevel: string
        adminStatus: AdminStatus
        latestSubmissionDate: Date
        grade: number | null
      }>

      for (const thesis of supervisedTheses) {
        await prisma.userProposalSupervision.upsert({
          where: { proposalId: thesis.proposalId },
          create: {
            id: thesis.proposalId,
            proposalId: thesis.proposalId,
            supervisorEmail: user.email,
            responsibleId: thesis.responsibleId,
            studentEmail: thesis.studentEmail,
            studyLevel: thesis.studyLevel,
          },
          update: {
            supervisorEmail: user.email,
            responsibleId: thesis.responsibleId,
            studentEmail: thesis.studentEmail,
            studyLevel: thesis.studyLevel,
            updatedAt: new Date(),
          },
        })

        await prisma.adminInfo.upsert({
          where: { proposalId: thesis.proposalId },
          create: {
            id: thesis.proposalId,
            proposalId: thesis.proposalId,
            status: thesis.adminStatus,
            latestSubmissionDate: thesis.latestSubmissionDate,
            grade: thesis.grade,
            department,
          },
          update: {
            status: thesis.adminStatus,
            latestSubmissionDate: thesis.latestSubmissionDate,
            grade: thesis.grade,
            department,
            updatedAt: new Date(),
          },
        })
      }

      console.log('✅ dummy supervised theses created successfully!')
      
      console.log('✅ 4 sample proposals created successfully!')
    } else {
      console.log('⚠️  Skipping sample proposal creation - User not found')
    }
  } else {
    console.log('⚠️  Skipping sample proposal creation - USER_EMAIL environment variable not set')
  }
  
  console.log('\n✅ Database seeding completed successfully!')
}

seed(prismaClient)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })
