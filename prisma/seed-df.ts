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

      console.log('Creating supervisor proposals with multiple applications (one accepted, others declined)...')

      const department = process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department

      // Create responsible persons first
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

      // Supervisor proposal 1: Multiple applications with one accepted
      const multiAppProposal1Id = '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d'
      await prisma.proposal.upsert({
        where: { id: multiAppProposal1Id },
        create: {
          id: multiAppProposal1Id,
          title: 'Machine Learning Applications in Financial Risk Assessment',
          description: 'This research explores how machine learning algorithms can improve credit risk assessment and fraud detection in banking.',
          language: '["English"]',
          studyLevel: 'Master Thesis (30 ECTS)',
          timeFrame: 'Spring 2025',
          department,
          topicArea: {
            connect: { slug: 'banking_and_insurance' },
          },
          status: {
            connect: { key: ProposalStatus.MATCHED },
          },
          type: {
            connect: { key: ProposalType.SUPERVISOR },
          },
          ownedByUser: {
            connect: { email: user.email },
          },
        },
        update: {},
      })

      // Create multiple applications for the proposal
      await prisma.proposalApplication.createMany({
        skipDuplicates: true,
        data: [
          {
            id: 'app-accepted-001',
            proposalId: multiAppProposal1Id,
            email: 'accepted.student@uzh.ch',
            fullName: 'Emma Accepted',
            matriculationNumber: '20-111-111',
            plannedStartAt: new Date('2025-02-01'),
            motivation: 'I have a strong background in machine learning and finance, with relevant coursework in both areas.',
            statusKey: ApplicationStatus.ACCEPTED,
            allowPublication: true,
            allowUsage: true,
          },
          {
            id: 'app-declined-001',
            proposalId: multiAppProposal1Id,
            email: 'declined.one@uzh.ch',
            fullName: 'John Declined',
            matriculationNumber: '20-222-222',
            plannedStartAt: new Date('2025-02-01'),
            motivation: 'I am interested in exploring machine learning applications.',
            statusKey: ApplicationStatus.DECLINED,
            allowPublication: true,
            allowUsage: true,
          },
          {
            id: 'app-declined-002',
            proposalId: multiAppProposal1Id,
            email: 'declined.two@uzh.ch',
            fullName: 'Sarah Declined',
            matriculationNumber: '20-333-333',
            plannedStartAt: new Date('2025-02-01'),
            motivation: 'This topic aligns with my career goals in financial technology.',
            statusKey: ApplicationStatus.DECLINED,
            allowPublication: true,
            allowUsage: true,
          },
        ],
      })

      // Supervisor proposal 2: Another one with multiple applications
      const multiAppProposal2Id = '8b7a6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d'
      await prisma.proposal.upsert({
        where: { id: multiAppProposal2Id },
        create: {
          id: multiAppProposal2Id,
          title: 'Sustainable Investment Strategies and ESG Performance',
          description: 'Analyzing the relationship between ESG criteria and long-term financial performance of investment portfolios.',
          language: '["English", "German"]',
          studyLevel: 'Master Thesis (30 ECTS)',
          timeFrame: 'Fall 2024',
          department,
          topicArea: {
            connect: { slug: 'financial_economics' },
          },
          status: {
            connect: { key: ProposalStatus.MATCHED },
          },
          type: {
            connect: { key: ProposalType.SUPERVISOR },
          },
          ownedByUser: {
            connect: { email: user.email },
          },
        },
        update: {},
      })

      // Create multiple applications for the second proposal
      await prisma.proposalApplication.createMany({
        skipDuplicates: true,
        data: [
          {
            id: 'app-accepted-002',
            proposalId: multiAppProposal2Id,
            email: 'lisa.winner@uzh.ch',
            fullName: 'Lisa Winner',
            matriculationNumber: '19-444-444',
            plannedStartAt: new Date('2024-09-01'),
            motivation: 'My passion for sustainable finance and previous research on ESG metrics make me ideal for this project.',
            statusKey: ApplicationStatus.ACCEPTED,
            allowPublication: true,
            allowUsage: true,
          },
          {
            id: 'app-declined-003',
            proposalId: multiAppProposal2Id,
            email: 'mark.other@uzh.ch',
            fullName: 'Mark Other',
            matriculationNumber: '19-555-555',
            plannedStartAt: new Date('2024-09-01'),
            motivation: 'I want to learn more about sustainable investing.',
            statusKey: ApplicationStatus.DECLINED,
            allowPublication: true,
            allowUsage: true,
          },
          {
            id: 'app-declined-004',
            proposalId: multiAppProposal2Id,
            email: 'anna.third@uzh.ch',
            fullName: 'Anna Third',
            matriculationNumber: '19-666-666',
            plannedStartAt: new Date('2024-09-01'),
            motivation: 'ESG is an important topic for the future of finance.',
            statusKey: ApplicationStatus.DECLINED,
            allowPublication: true,
            allowUsage: true,
          },
          {
            id: 'app-declined-005',
            proposalId: multiAppProposal2Id,
            email: 'peter.fourth@uzh.ch',
            fullName: 'Peter Fourth',
            matriculationNumber: '19-777-777',
            plannedStartAt: new Date('2024-09-01'),
            motivation: 'I have experience in portfolio management.',
            statusKey: ApplicationStatus.DECLINED,
            allowPublication: true,
            allowUsage: true,
          },
        ],
      })

      console.log('✅ Supervisor proposals with multiple applications created!')

      // Fetch responsible persons to link supervisions
      const responsiblesForMultiApp = await prisma.responsible.findMany({
        where: {
          email: {
            in: ['alice.responsible@uzh.ch', 'bob.responsible@uzh.ch'],
          },
          department,
        },
        select: {
          id: true,
          email: true,
        },
      })

      const aliceId = responsiblesForMultiApp.find(r => r.email === 'alice.responsible@uzh.ch')?.id
      const bobId = responsiblesForMultiApp.find(r => r.email === 'bob.responsible@uzh.ch')?.id

      // Create UserProposalSupervision for proposal 1 (linking accepted student)
      if (aliceId) {
        await prisma.userProposalSupervision.upsert({
          where: { proposalId: multiAppProposal1Id },
          create: {
            id: multiAppProposal1Id,
            proposalId: multiAppProposal1Id,
            supervisorEmail: user.email,
            responsibleId: aliceId,
            studentEmail: 'accepted.student@uzh.ch',
            studyLevel: 'Master Thesis (30 ECTS)',
          },
          update: {
            supervisorEmail: user.email,
            responsibleId: aliceId,
            studentEmail: 'accepted.student@uzh.ch',
            studyLevel: 'Master Thesis (30 ECTS)',
          },
        })

        // Create AdminInfo for proposal 1
        await prisma.adminInfo.upsert({
          where: { proposalId: multiAppProposal1Id },
          create: {
            id: multiAppProposal1Id,
            proposalId: multiAppProposal1Id,
            status: AdminStatus.IN_PROGRESS,
            latestSubmissionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
            grade: null,
            department,
          },
          update: {
            status: AdminStatus.IN_PROGRESS,
            latestSubmissionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
            grade: null,
            department,
          },
        })
      }

      // Create UserProposalSupervision for proposal 2 (linking accepted student)
      if (bobId) {
        await prisma.userProposalSupervision.upsert({
          where: { proposalId: multiAppProposal2Id },
          create: {
            id: multiAppProposal2Id,
            proposalId: multiAppProposal2Id,
            supervisorEmail: user.email,
            responsibleId: bobId,
            studentEmail: 'lisa.winner@uzh.ch',
            studyLevel: 'Master Thesis (30 ECTS)',
          },
          update: {
            supervisorEmail: user.email,
            responsibleId: bobId,
            studentEmail: 'lisa.winner@uzh.ch',
            studyLevel: 'Master Thesis (30 ECTS)',
          },
        })

        // Create AdminInfo for proposal 2
        await prisma.adminInfo.upsert({
          where: { proposalId: multiAppProposal2Id },
          create: {
            id: multiAppProposal2Id,
            proposalId: multiAppProposal2Id,
            status: AdminStatus.GRADING,
            latestSubmissionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
            grade: 5.75,
            department,
          },
          update: {
            status: AdminStatus.GRADING,
            latestSubmissionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
            grade: 5.75,
            department,
          },
        })
      }

      console.log('✅ UserProposalSupervision and AdminInfo created for multi-application proposals!')

      console.log('Creating dummy supervised theses (Responsible + AdminInfo)...')

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
