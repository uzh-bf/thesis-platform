import { PrismaClient } from '@prisma/client'
import readline from 'readline'

import {
  ApplicationStatus,
  ProposalFeedbackType,
  ProposalStatus,
  ProposalType,
  TopicAreasIBW,
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
    Object.entries(TopicAreasIBW).map(([slug, name]) =>
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
        name: 'Service User_IBW_PROD',
        email: 'ibw-srv-powplatf-prd@d.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Giuffredi-Kähr Andrea',
        email: 'andrea.giuffredi-kaehr@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      // {
      //   name: 'Scherer Andreas Georg',
      //   email: 'andreas.scherer@business.uzh.ch',
      //   department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      // },
      {
        name: 'Schulze Anja',
        email: 'anja.schulze@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Brenøe Anne A.',
        email: 'anne.brenoe@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Segal Carmit',
        email: 'carmit.segal@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Barz Christiane',
        email: 'christiane.barz@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Oesch David',
        email: 'david.oesch@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Seidl David',
        email: 'david.seidl@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      // {
      //   name: 'Pfaff Dieter',
      //   email: 'dieter.pfaff@business.uzh.ch',
      //   department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      // },
      {
        name: 'Franck Egon',
        email: 'egon.franck@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Petrov Evgeny',
        email: 'evgeny.petrov@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Dietl Helmut M.',
        email: 'helmut.dietl@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Chen Hui',
        email: 'hui.chen@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Menges Jochen',
        email: 'jochen.menges@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Luger Johannes',
        email: 'johannes.luger@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Zigova Katarina',
        email: 'katarina.zigova@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Howe Lauren C.',
        email: 'lauren.howe@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Aguiar Luis',
        email: 'luis.aguiar@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Natter Martin',
        email: 'martin.natter@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Prokopyev Oleg',
        email: 'oleg.prokopyev@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Lehnert Patrick',
        email: 'patrick.lehnert@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Flepp Raphael',
        email: 'raphael.flepp@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Algesheimer René',
        email: 'rene.algesheimer@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Eberle Reto',
        email: 'reto.eberle@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      // {
      //   name: 'Göx Robert',
      //   email: 'robert.goex@business.uzh.ch',
      //   department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      // },
      {
        name: 'Tan Tarkan',
        email: 'tarkan.tan@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Keil Thomas',
        email: 'thomas.keil@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      // {
      //   name: 'Backes-Gellner Uschi',
      //   email: 'ubg@business.uzh.ch',
      //   department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      // },
      {
        name: 'Kaiser Ulrich',
        email: 'ulrich.kaiser@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Rauter Thomas',
        email: 'thomas.rauter@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      {
        name: 'Mohring Uta',
        email: 'uta.mohring@business.uzh.ch',
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      }
    ],
  })
  console.log('Responsible table seeded successfully')

  // Pre-create supervisor accounts that will be linked on first OAuth login
  console.log('Seeding pre-defined supervisor accounts...')
  
  // Testing with one user first
  const predefinedSupervisors = [
    {
      email: 'ibw-srv-powplatf-prd@d.uzh.ch',
      name: 'Service User_IBW_PROD',
    },
  ]

  for (const supervisor of predefinedSupervisors) {
    await prisma.user.upsert({
      where: { email: supervisor.email },
      create: {
        email: supervisor.email,
        name: supervisor.name,
        role: UserRole.SUPERVISOR,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      update: {
        role: UserRole.SUPERVISOR,
        name: supervisor.name,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
    })
  }
  
  console.log(`Pre-defined supervisor accounts created/updated: ${predefinedSupervisors.length} users`)

  console.log('✅ Database seeding completed successfully!')

  // // Create sample proposals
  // console.log('Creating sample proposals...')
  
  // if (process.env.USER_EMAIL) {
  //   const user = await prisma.user.findUnique({
  //     where: { email: process.env.USER_EMAIL },
  //   })
    
  //   if (user) {
  //     await prisma.proposal.upsert({
  //       where: { id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f' },
  //       create: {
  //         id: '3ef84a3b-cff0-4350-b760-4c5bb3b3c98f',
  //         title: 'Effects of Interest Rate on Happiness',
  //         description: 'This is a very interesting topic that explores how changes in interest rates affect overall happiness and well-being in society.',
  //         language: '["English"]',
  //         studyLevel: 'Master Thesis (30 ECTS)',
  //         topicArea: {
  //           connect: {
  //             slug: 'sustainable_finance',
  //           },
  //         },
  //         status: {
  //           connect: { key: ProposalStatus.OPEN },
  //         },
  //         type: {
  //           connect: { key: ProposalType.STUDENT },
  //         },
  //         applications: {
  //           create: {
  //             email: 'roland.ferdinand@uzh.ch',
  //             plannedStartAt: new Date(),
  //             fullName: 'Roland Ferdinand',
  //             matriculationNumber: '12-345-678',
  //             motivation: 'I want to explore this topic because I believe it has significant implications for economic policy.',
  //             status: {
  //               connect: { key: ApplicationStatus.OPEN },
  //             },
  //           },
  //         },
  //         ownedByStudent: 'roland.ferdinand@uzh.ch',
  //         ownedByUser: {
  //           connect: { email: user.email },
  //         },
  //         receivedFeedbacks: {
  //           create: {
  //             comment: 'Rejected because the methodology needs refinement.',
  //             type: {
  //               connect: { key: ProposalFeedbackType.REJECTED_NOT_SCIENTIFIC },
  //             },
  //             reason: ProposalFeedbackType.REJECTED_NOT_SCIENTIFIC,
  //             user: {
  //               connect: { email: user.email },
  //             },
  //           },
  //         },
  //       },
  //       update: {},
  //     })

  //     await prisma.proposal.upsert({
  //       where: { id: '3ef84a3b-cff0-4350-b760-4c5bb3b3cabc' },
  //       create: {
  //         id: '3ef84a3b-cff0-4350-b760-4c5bb3b3cabc',
  //         title: 'TEST STUDENT',
  //         description: 'TEST DESC',
  //         language: '["English"]',
  //         studyLevel: 'Bachelor Thesis (6 ECTS)',
  //         additionalStudentComment: 'TEST COMMENT',
  //         topicArea: {
  //           connect: {
  //             slug: 'banking_and_insurance',
  //           },
  //         },
  //         status: {
  //           connect: { key: ProposalStatus.OPEN },
  //         },
  //         type: {
  //           connect: { key: ProposalType.STUDENT },
  //         },
  //         applications: {
  //           create: {
  //             email: 'roland.ferdinand@df.uzh.ch',
  //             plannedStartAt: new Date(),
  //             fullName: 'Roland Ferdinand',
  //             matriculationNumber: '12-345-678',
  //             motivation: 'I want to explore this topic because I believe it has significant implications for economic policy.',
  //             status: {
  //               connect: { key: ApplicationStatus.OPEN },
  //             },
  //             allowPublication: true,
  //             allowUsage: true,
  //           },
  //         },
  //         ownedByStudent: 'roland.ferdinand@df.uzh.ch',
  //         ownedByUser: {
  //           connect: { email: user.email },
  //         },
  //       },
  //       update: {},
  //     })

  //     await prisma.proposal.upsert({
  //       where: { id: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6' },
  //       create: {
  //         id: '33a9a1b7-cad7-46e7-8b72-cfcbdbaa60d6',
  //         title:
  //           'The role of interest rate expectations for the choice between Fixed-Rate Mortgages and Adjustable-Rate Mortgages',
  //         description:
  //           'This research examines how consumer expectations about future interest rates influence their mortgage choices, with implications for personal finance and housing markets.',
  //         language: '["English", "German"]',
  //         studyLevel: 'Master Thesis (30 ECTS)',
  //         timeFrame: 'Sometime next year.',
  //         topicArea: {
  //           connect: {
  //             slug: 'banking_and_insurance',
  //           },
  //         },
  //         status: {
  //           connect: { key: ProposalStatus.OPEN },
  //         },
  //         type: {
  //           connect: { key: ProposalType.SUPERVISOR },
  //         },
  //         supervisedBy: {
  //           create: {
  //             supervisor: {
  //               connect: { email: user.email },
  //             },
  //           },
  //         },
  //         ownedByUser: {
  //           connect: { email: user.email },
  //         },
  //         applications: {
  //           create: {
  //             plannedStartAt: new Date(),
  //             email: 'roland.ferdinand@df.uzh.ch',
  //             fullName: 'Roland Ferdinand',
  //             matriculationNumber: '12-345-678',
  //             motivation:
  //               'I want to do this topic as I think it is very interesting and relevant to current economic conditions.',
  //             status: {
  //               connect: { key: ApplicationStatus.OPEN },
  //             },
  //             attachments: {
  //               createMany: {
  //                 data: [
  //                   {
  //                     name: 'CV.pdf',
  //                     href: 'https://example.com/cv.pdf',
  //                     type: 'application/pdf',
  //                   },
  //                   {
  //                     name: 'Transcript.pdf',
  //                     href: 'https://example.com/transcript.pdf',
  //                     type: 'application/pdf',
  //                   },
  //                 ],
  //               },
  //             },
  //           },
  //         },
  //       },
  //       update: {},
  //     })

  //     await prisma.proposal.upsert({
  //       where: { id: '21140e2e-e630-494a-ab18-374fd11c62c0' },
  //       create: {
  //         id: '21140e2e-e630-494a-ab18-374fd11c62c0',
  //         title:
  //           'Treiber der Inflation in der Schweiz / Inflationsmessung in der Schweiz',
  //         description:
  //           'Diese Forschung untersucht die Hauptfaktoren, die zur Inflation in der Schweiz beitragen, und bewertet die Methoden zur Inflationsmessung.',
  //         language: '["German", "English"]',
  //         studyLevel: 'Master Thesis (30 ECTS)',
  //         timeFrame: '2025',
  //         topicArea: {
  //           connect: {
  //             slug: 'financial_economics',
  //           },
  //         },
  //         status: {
  //           connect: { key: ProposalStatus.OPEN },
  //         },
  //         type: {
  //           connect: { key: ProposalType.SUPERVISOR },
  //         },
  //         supervisedBy: {
  //           create: {
  //             supervisor: {
  //               connect: { email: user.email },
  //             },
  //           },
  //         },
  //         ownedByUser: {
  //           connect: { email: user.email },
  //         },
  //         applications: {
  //           create: {
  //             plannedStartAt: new Date(),
  //             email: 'roland.ferdinand@uzh.ch',
  //             fullName: 'Roland Ferdinand',
  //             matriculationNumber: '12-345-678',
  //             motivation:
  //               'Ich möchte dieses Thema erforschen, da es für das Verständnis der aktuellen wirtschaftlichen Situation in der Schweiz von entscheidender Bedeutung ist.',
  //             status: {
  //               connect: { key: ApplicationStatus.OPEN },
  //             },
  //             attachments: {
  //               createMany: {
  //                 data: [
  //                   {
  //                     name: 'CV.pdf',
  //                     href: 'https://example.com/cv.pdf',
  //                     type: 'application/pdf',
  //                   },
  //                   {
  //                     name: 'Transcript.pdf',
  //                     href: 'https://example.com/transcript.pdf',
  //                     type: 'application/pdf',
  //                   },
  //                 ],
  //               },
  //             },
  //           },
  //         },
  //       },
  //       update: {},
  //     })
      
  //     console.log('Sample proposals created successfully!')
  //   } else {
  //     console.log('Skipping sample proposal creation - User not found')
  //   }
  // } else {
  //   console.log('Skipping sample proposal creation - USER_EMAIL environment variable not set')
  // }
}

seed(prismaClient)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })
