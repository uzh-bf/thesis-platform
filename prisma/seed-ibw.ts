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
}

seed(prismaClient)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })
