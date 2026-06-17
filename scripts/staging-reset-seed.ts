import {
  AdminRole,
  Department,
  Prisma,
  PrismaClient,
  Status as AdminStatus,
} from '@prisma/client'

import {
  ApplicationStatus,
  ProposalFeedbackType,
  ProposalStatus,
  ProposalType,
  TopicAreas,
  UserRole,
} from '../src/lib/constants'

const prisma = new PrismaClient()

type DbInfo = {
  database_name: string
  user_name: string
  server_addr: string | null
  server_port: number | bigint | null
}

type CountRow = {
  table: string
  count: bigint | number | string
}

type EmailRecord = {
  source: string
  email: string
}

const mutableTables = [
  'Account',
  'VerificationToken',
  'ApplicationAttachment',
  'ProposalAttachment',
  'UserProposalFeedback',
  'ProposalApplication',
  'UserProposalSupervision',
  'AdminInfo',
  'Proposal',
  'User',
  'Responsible',
]

const countedTables = [
  ...mutableTables,
  'ApplicationStatus',
  'ProposalFeedbackType',
  'ProposalStatus',
  'ProposalType',
  'TopicArea',
  '_prisma_migrations',
]

const dummyEmails = {
  supervisorOne: 'staging.supervisor.one@example.com',
  supervisorTwo: 'staging.supervisor.two@example.com',
  responsibleOne: 'staging.responsible.one@example.com',
  responsibleTwo: 'staging.responsible.two@example.com',
  studentOne: 'staging.student.one@example.com',
  studentTwo: 'staging.student.two@example.com',
  studentThree: 'staging.student.three@example.com',
  studentFour: 'staging.student.four@example.com',
  studentFive: 'staging.student.five@example.com',
  studentSix: 'staging.student.six@example.com',
  studentSeven: 'staging.student.seven@example.com',
  reviewer: 'staging.reviewer@example.com',
}

const isExecute = process.argv.includes('--execute')
const isAuditOnly = process.argv.includes('--audit-only')

const normalizeEnv = (value: string | undefined) =>
  (value ?? '').trim().replace(/^"|"$/g, '')

const parseEmailList = (value: string | undefined) =>
  normalizeEnv(value)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

const hasProductionMarker = (value: string) =>
  value.includes('prod') || value.includes('prd')

const hasStagingMarker = (value: string) =>
  value.includes('stg') ||
  value.includes('stage') ||
  value.includes('qa') ||
  value.includes('dev')

const getDatabaseUrlTarget = () => {
  const value = normalizeEnv(process.env.DATABASE_URL)

  if (!value) {
    return { host: 'unknown-host', database: 'unknown-database' }
  }

  const url = new URL(value)

  return {
    host: url.hostname || 'localhost',
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  }
}

const getDepartment = (): Department => {
  const value = normalizeEnv(process.env.NEXT_PUBLIC_DEPARTMENT_NAME) || 'DF'

  if (value !== Department.DF && value !== Department.IBW) {
    throw new Error(`Unsupported department '${value}'. Expected DF or IBW.`)
  }

  return value
}

const getAllowedRealLoginEmails = () => {
  const explicitEmails = parseEmailList(process.env.STAGING_REAL_LOGIN_EMAILS)

  if (explicitEmails.length > 0) {
    return explicitEmails
  }

  return parseEmailList(process.env.USER_EMAIL)
}

const getCurrentDbInfo = async (client: PrismaClient) => {
  const rows = await client.$queryRaw<DbInfo[]>`
    select
      database() as database_name,
      current_user() as user_name,
      @@hostname as server_addr,
      @@port as server_port
  `

  return rows[0]
}

const assertStagingTarget = async (client: PrismaClient) => {
  const dopplerConfig = normalizeEnv(process.env.DOPPLER_CONFIG).toLowerCase()

  if (dopplerConfig !== 'stg') {
    throw new Error(
      `Refusing to continue: DOPPLER_CONFIG must be stg, got '${dopplerConfig || 'unset'}'.`
    )
  }

  const dbInfo = await getCurrentDbInfo(client)
  const databaseName = dbInfo.database_name.toLowerCase()
  const urlTarget = getDatabaseUrlTarget()
  const targetIdentity = `${urlTarget.host}/${databaseName || urlTarget.database}`
  const normalizedTargetIdentity = targetIdentity.toLowerCase()

  if (hasProductionMarker(normalizedTargetIdentity)) {
    throw new Error(
      'Refusing to continue: production-like staging target.'
    )
  }

  if (!hasStagingMarker(normalizedTargetIdentity)) {
    throw new Error('Refusing to continue: unexpected staging target.')
  }

  console.log('Validated staging database target.')
}

const quotedTableName = (table: string) => `\`${table.replace(/`/g, '``')}\``

const getCounts = async (client: PrismaClient | Prisma.TransactionClient) => {
  const rows: CountRow[] = []

  for (const table of countedTables) {
    const [row] = await client.$queryRawUnsafe<
      { count: bigint | number | string }[]
    >(
      `select count(*) as count from ${quotedTableName(table)}`
    )
    rows.push({ table, count: row.count })
  }

  return rows.sort((a, b) => a.table.localeCompare(b.table))
}

const printCounts = (label: string, rows: CountRow[]) => {
  console.log(label)
  for (const row of rows) {
    console.log(`  ${row.table}: ${row.count.toString()}`)
  }
}

const wipeMutableData = async (tx: Prisma.TransactionClient) => {
  await tx.$executeRawUnsafe('set foreign_key_checks = 0')

  try {
    for (const table of mutableTables) {
      await tx.$executeRawUnsafe(`delete from ${quotedTableName(table)}`)
    }
  } finally {
    await tx.$executeRawUnsafe('set foreign_key_checks = 1')
  }
}

const seedLookups = async (
  tx: Prisma.TransactionClient,
  department: Department
) => {
  await Promise.all(
    Object.entries(TopicAreas).map(([slug, name]) =>
      tx.topicArea.upsert({
        where: { slug },
        create: { slug, name, department },
        update: { name, department },
      })
    )
  )

  await Promise.all(
    Object.values(ProposalStatus).map((key) =>
      tx.proposalStatus.upsert({
        where: { key },
        create: { key },
        update: {},
      })
    )
  )

  await Promise.all(
    Object.values(ApplicationStatus).map((key) =>
      tx.applicationStatus.upsert({
        where: { key },
        create: { key },
        update: {},
      })
    )
  )

  await Promise.all(
    Object.values(ProposalType).map((key) =>
      tx.proposalType.upsert({
        where: { key },
        create: { key },
        update: {},
      })
    )
  )

  await Promise.all(
    Object.values(ProposalFeedbackType).map((key) =>
      tx.proposalFeedbackType.upsert({
        where: { key },
        create: { key },
        update: {},
      })
    )
  )
}

const seedLoginUsers = async (
  tx: Prisma.TransactionClient,
  department: Department,
  loginEmails: string[]
) => {
  if (loginEmails.length === 0) {
    console.warn(
      'No USER_EMAIL or STAGING_REAL_LOGIN_EMAILS found. Seeded data will be fake-only, but no real admin login user will be pre-created.'
    )
    return
  }

  for (let index = 0; index < loginEmails.length; index += 1) {
    const email = loginEmails[index]

    await tx.user.upsert({
      where: { email },
      create: {
        email,
        name:
          normalizeEnv(process.env.USER_NAME) ||
          `Staging Admin ${index + 1}`,
        role: UserRole.DEVELOPER,
        adminRole: AdminRole.ADMIN,
        department,
      },
      update: {
        role: UserRole.DEVELOPER,
        adminRole: AdminRole.ADMIN,
        department,
      },
    })
  }
}

const seedDummyData = async (
  tx: Prisma.TransactionClient,
  department: Department,
  loginEmails: string[]
) => {
  await seedLoginUsers(tx, department, loginEmails)

  const supervisors = await Promise.all([
    tx.user.create({
      data: {
        email: dummyEmails.supervisorOne,
        name: 'Staging Supervisor One',
        role: UserRole.SUPERVISOR,
        department,
      },
    }),
    tx.user.create({
      data: {
        email: dummyEmails.supervisorTwo,
        name: 'Staging Supervisor Two',
        role: UserRole.SUPERVISOR,
        department,
      },
    }),
    tx.user.create({
      data: {
        email: dummyEmails.reviewer,
        name: 'Staging Reviewer',
        role: UserRole.SUPERVISOR,
        department,
      },
    }),
  ])

  const [responsibleOne, responsibleTwo] = await Promise.all([
    tx.responsible.create({
      data: {
        email: dummyEmails.responsibleOne,
        name: 'Staging Responsible One',
        department,
      },
    }),
    tx.responsible.create({
      data: {
        email: dummyEmails.responsibleTwo,
        name: 'Staging Responsible Two',
        department,
      },
    }),
  ])

  const topicAreaSlug = 'sustainable_finance'
  const now = new Date()
  const inThirtyDays = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30)
  const tenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10)

  await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000001',
      title: 'Staging: Open Supervisor Proposal',
      description:
        'Dummy supervisor proposal for frontend and workflow testing. Contains no real recipient addresses.',
      language: '["English"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: 'Spring semester',
      department,
      topicAreaSlug,
      typeKey: ProposalType.SUPERVISOR,
      statusKey: ProposalStatus.OPEN,
      ownedByUserEmail: supervisors[0].email,
      attachments: {
        create: [
          {
            name: 'dummy-proposal.pdf',
            href: 'https://example.com/dummy-proposal.pdf',
            type: 'application/pdf',
          },
        ],
      },
      supervisedBy: {
        create: {
          id: '20000000-0000-4000-8000-000000000001',
          supervisorEmail: supervisors[0].email,
          responsibleId: responsibleOne.id,
          studyLevel: 'Master Thesis (30 ECTS)',
        },
      },
    },
  })

  await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000002',
      title: 'Staging: Open Student Proposal - Corporate Finance',
      description:
        'Dummy student proposal with feedback so the proposal review screens have realistic content.',
      language: '["English", "German"]',
      studyLevel: 'Bachelor Thesis (18 ECTS)',
      timeFrame: 'Autumn semester',
      department,
      topicAreaSlug: 'corporate_finance',
      typeKey: ProposalType.STUDENT,
      statusKey: ProposalStatus.OPEN,
      ownedByStudent: dummyEmails.studentOne,
      applications: {
        create: {
          email: dummyEmails.studentOne,
          matriculationNumber: '99-999-001',
          fullName: 'Staging Student One',
          plannedStartAt: inThirtyDays,
          motivation:
            'Dummy motivation text for testing the application detail view.',
          statusKey: ApplicationStatus.OPEN,
          allowPublication: true,
          allowUsage: true,
        },
      },
      receivedFeedbacks: {
        create: {
          userEmail: supervisors[0].email,
          typeKey: ProposalFeedbackType.REJECTED_NOT_CLEAR,
          reason: ProposalFeedbackType.REJECTED_NOT_CLEAR,
          comment:
            'Dummy feedback entry for staging. No real email should be sent for this record.',
        },
      },
    },
  })

  await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000006',
      title: 'Staging: Open Student Proposal - Sustainable Finance',
      description:
        'Dummy open student proposal for testing student-submitted proposal review.',
      language: '["English"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: 'Spring semester',
      department,
      topicAreaSlug,
      typeKey: ProposalType.STUDENT,
      statusKey: ProposalStatus.OPEN,
      ownedByStudent: dummyEmails.studentFive,
      applications: {
        create: {
          email: dummyEmails.studentFive,
          matriculationNumber: '99-999-007',
          fullName: 'Staging Student Five',
          plannedStartAt: inThirtyDays,
          motivation:
            'Dummy motivation for an open student proposal in sustainable finance.',
          statusKey: ApplicationStatus.OPEN,
          allowPublication: true,
          allowUsage: true,
        },
      },
    },
  })

  await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000007',
      title: 'Staging: Open Student Proposal - Quantitative Finance',
      description:
        'Dummy open student proposal for checking proposal cards and admin filters.',
      language: '["German"]',
      studyLevel: 'Bachelor Thesis (18 ECTS)',
      timeFrame: 'Autumn semester',
      department,
      topicAreaSlug: 'quantitative_finance',
      typeKey: ProposalType.STUDENT,
      statusKey: ProposalStatus.OPEN,
      ownedByStudent: dummyEmails.studentSix,
      applications: {
        create: {
          email: dummyEmails.studentSix,
          matriculationNumber: '99-999-008',
          fullName: 'Staging Student Six',
          plannedStartAt: inThirtyDays,
          motivation:
            'Dummy motivation for an open student proposal in quantitative finance.',
          statusKey: ApplicationStatus.OPEN,
          allowPublication: false,
          allowUsage: true,
        },
      },
    },
  })

  await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000008',
      title: 'Staging: Open Student Proposal - Banking',
      description:
        'Dummy open student proposal for workflow testing with another topic area.',
      language: '["English", "German"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: 'Flexible',
      department,
      topicAreaSlug: 'banking_and_insurance',
      typeKey: ProposalType.STUDENT,
      statusKey: ProposalStatus.OPEN,
      ownedByStudent: dummyEmails.studentSeven,
      applications: {
        create: {
          email: dummyEmails.studentSeven,
          matriculationNumber: '99-999-009',
          fullName: 'Staging Student Seven',
          plannedStartAt: inThirtyDays,
          motivation:
            'Dummy motivation for an open student proposal in banking.',
          statusKey: ApplicationStatus.OPEN,
          allowPublication: true,
          allowUsage: false,
        },
      },
    },
  })

  await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000003',
      title: 'Staging: Multi Application Proposal',
      description:
        'Dummy proposal with several applications for acceptance and decline workflow testing.',
      language: '["English"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: 'Flexible',
      department,
      topicAreaSlug: 'financial_economics',
      typeKey: ProposalType.SUPERVISOR,
      statusKey: ProposalStatus.WAITING_FOR_STUDENT,
      ownedByUserEmail: supervisors[1].email,
      supervisedBy: {
        create: {
          id: '20000000-0000-4000-8000-000000000003',
          supervisorEmail: supervisors[1].email,
          responsibleId: responsibleTwo.id,
          studyLevel: 'Master Thesis (30 ECTS)',
        },
      },
      applications: {
        create: [
          {
            email: dummyEmails.studentTwo,
            matriculationNumber: '99-999-002',
            fullName: 'Staging Student Two',
            plannedStartAt: inThirtyDays,
            motivation:
              'Dummy application for acceptance workflow testing.',
            statusKey: ApplicationStatus.OPEN,
            allowPublication: true,
            allowUsage: true,
          },
          {
            email: dummyEmails.studentThree,
            matriculationNumber: '99-999-003',
            fullName: 'Staging Student Three',
            plannedStartAt: inThirtyDays,
            motivation:
              'Second dummy application for decline workflow testing.',
            statusKey: ApplicationStatus.OPEN,
            allowPublication: false,
            allowUsage: true,
          },
        ],
      },
    },
  })

  const matchedProposal = await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000004',
      title: 'Staging: Matched Thesis',
      description:
        'Dummy matched thesis with accepted and declined applications.',
      language: '["English"]',
      studyLevel: 'Master Thesis (30 ECTS)',
      timeFrame: 'Ongoing',
      department,
      topicAreaSlug: 'quantitative_finance',
      typeKey: ProposalType.SUPERVISOR,
      statusKey: ProposalStatus.MATCHED,
      ownedByUserEmail: supervisors[0].email,
    },
  })

  const matchedSupervision = await tx.userProposalSupervision.create({
    data: {
      id: '20000000-0000-4000-8000-000000000004',
      proposalId: matchedProposal.id,
      supervisorEmail: supervisors[0].email,
      responsibleId: responsibleOne.id,
      studentEmail: dummyEmails.studentFour,
      studyLevel: 'Master Thesis (30 ECTS)',
    },
  })

  await tx.proposalApplication.createMany({
    data: [
      {
        proposalId: matchedProposal.id,
        supervisionId: matchedSupervision.id,
        email: dummyEmails.studentFour,
        matriculationNumber: '99-999-004',
        fullName: 'Staging Student Four',
        plannedStartAt: tenDaysAgo,
        motivation: 'Accepted dummy application for admin overview testing.',
        statusKey: ApplicationStatus.ACCEPTED,
        allowPublication: true,
        allowUsage: true,
      },
      {
        proposalId: matchedProposal.id,
        email: 'staging.declined@example.com',
        matriculationNumber: '99-999-005',
        fullName: 'Staging Declined Student',
        plannedStartAt: tenDaysAgo,
        motivation: 'Declined dummy application for history testing.',
        statusKey: ApplicationStatus.DECLINED,
        allowPublication: false,
        allowUsage: true,
      },
    ],
  })

  await tx.adminInfo.create({
    data: {
      proposalId: matchedProposal.id,
      status: AdminStatus.IN_PROGRESS,
      mailReceived: 'yes',
      latestSubmissionDate: inThirtyDays,
      comment: 'Dummy admin record for staging workflow testing.',
      department,
    },
  })

  const submittedProposal = await tx.proposal.create({
    data: {
      id: '10000000-0000-4000-8000-000000000005',
      title: 'Staging: Submitted Thesis',
      description: 'Dummy submitted thesis for grading/admin status testing.',
      language: '["German"]',
      studyLevel: 'Bachelor Thesis (18 ECTS)',
      timeFrame: 'Completed',
      department,
      topicAreaSlug: 'banking_and_insurance',
      typeKey: ProposalType.SUPERVISOR,
      statusKey: ProposalStatus.SUBMITTED,
      ownedByUserEmail: supervisors[1].email,
    },
  })

  const submittedSupervision = await tx.userProposalSupervision.create({
    data: {
      id: '20000000-0000-4000-8000-000000000005',
      proposalId: submittedProposal.id,
      supervisorEmail: supervisors[1].email,
      responsibleId: responsibleTwo.id,
      studentEmail: 'staging.submitted@example.com',
      studyLevel: 'Bachelor Thesis (18 ECTS)',
    },
  })

  await tx.proposalApplication.create({
    data: {
      proposalId: submittedProposal.id,
      supervisionId: submittedSupervision.id,
      email: 'staging.submitted@example.com',
      matriculationNumber: '99-999-006',
      fullName: 'Staging Submitted Student',
      plannedStartAt: tenDaysAgo,
      motivation: 'Dummy accepted application for submitted thesis.',
      statusKey: ApplicationStatus.ACCEPTED,
      allowPublication: true,
      allowUsage: true,
    },
  })

  await tx.adminInfo.create({
    data: {
      proposalId: submittedProposal.id,
      status: AdminStatus.SUBMITTED,
      mailReceived: 'yes',
      olatCapturedDate: tenDaysAgo,
      latestSubmissionDate: tenDaysAgo,
      submissionDate: tenDaysAgo,
      capturedOnZora: false,
      department,
    },
  })
}

const getEmailRecords = async (client: PrismaClient) =>
  client.$queryRaw<EmailRecord[]>`
    select 'User.email' as source, email from \`User\` where email is not null
    union all select 'Responsible.email', email from \`Responsible\` where email is not null
    union all select 'Proposal.ownedByUserEmail', \`ownedByUserEmail\` from \`Proposal\` where \`ownedByUserEmail\` is not null
    union all select 'Proposal.ownedByStudent', \`ownedByStudent\` from \`Proposal\` where \`ownedByStudent\` is not null
    union all select 'ProposalApplication.email', email from \`ProposalApplication\` where email is not null
    union all select 'UserProposalSupervision.supervisorEmail', \`supervisorEmail\` from \`UserProposalSupervision\` where \`supervisorEmail\` is not null
    union all select 'UserProposalSupervision.studentEmail', \`studentEmail\` from \`UserProposalSupervision\` where \`studentEmail\` is not null
    union all select 'UserProposalFeedback.userEmail', \`userEmail\` from \`UserProposalFeedback\` where \`userEmail\` is not null
  `

const isReservedTestEmail = (email: string) =>
  email.endsWith('@example.com') ||
  email.endsWith('@example.invalid') ||
  email.endsWith('@test.invalid')

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  if (!domain) return '[invalid-email]'
  return `${local.slice(0, 2)}***@${domain}`
}

const auditEmailSafety = async (
  client: PrismaClient,
  allowedRealLoginEmails: string[]
) => {
  const records = await getEmailRecords(client)
  const allowedLoginSet = new Set(allowedRealLoginEmails)
  const unsafeRecords = records.filter((record) => {
    const email = record.email.toLowerCase()

    if (isReservedTestEmail(email)) {
      return false
    }

    return !(
      record.source === 'User.email' &&
      allowedLoginSet.has(email)
    )
  })

  if (unsafeRecords.length > 0) {
    console.error('Unsafe email records found:')
    for (const record of unsafeRecords) {
      console.error(`  ${record.source}: ${maskEmail(record.email)}`)
    }
    throw new Error('Email safety audit failed.')
  }

  console.log(`Email safety audit passed (${records.length} records checked).`)
}

const main = async () => {
  const department = getDepartment()
  const allowedRealLoginEmails = getAllowedRealLoginEmails()

  await assertStagingTarget(prisma)
  printCounts('Current row counts:', await getCounts(prisma))

  if (isAuditOnly) {
    await auditEmailSafety(prisma, allowedRealLoginEmails)
    return
  }

  if (!isExecute) {
    console.log('')
    console.log('Dry run only. Planned actions:')
    console.log('  1. Preserve lookup tables and _prisma_migrations.')
    console.log(`  2. Delete mutable table rows: ${mutableTables.join(', ')}.`)
    console.log('  3. Seed 8 proposals, 9 applications, 2 admin rows, fake supervisors, fake responsibles.')
    console.log('  4. Pre-create real staging login users only from STAGING_REAL_LOGIN_EMAILS or USER_EMAIL.')
    console.log('  5. Fail if workflow recipient fields contain non-test emails.')
    console.log('')
    console.log('Run again with --execute to wipe and seed staging.')
    return
  }

  await prisma.$transaction(
    async (tx) => {
      await wipeMutableData(tx)
      await seedLookups(tx, department)
      await seedDummyData(tx, department, allowedRealLoginEmails)
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    }
  )

  printCounts('Row counts after reset/seed:', await getCounts(prisma))
  await auditEmailSafety(prisma, allowedRealLoginEmails)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
