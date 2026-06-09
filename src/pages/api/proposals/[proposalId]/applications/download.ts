import { addMonths } from 'date-fns'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'src/lib/authOptions'
import { Department, ProposalType, UserRole } from 'src/lib/constants'
import prisma from 'src/server/prisma'

type ApplicationAttachment = {
  id: string
  name: string
  href: string
  type: string
}

type CsvDelimiter = ',' | ';'

const CSV_HEADERS = [
  'Proposal ID',
  'Proposal Title',
  'Proposal Topic Area',
  'Proposal Language',
  'Proposal Study Level',
  'Proposal Status',
  'Proposal Created At',
  'Application ID',
  'Application Status',
  'Full Name',
  'Email',
  'Matriculation Number',
  'Planned Start At',
  'Planned End At',
  'Motivation',
  'Allow Usage',
  'Allow Publication',
  'Application Created At',
  'Application Updated At',
  'CV Link',
  'Transcript Link',
  'Attachment Links',
] as const

function sendJsonError(
  res: NextApiResponse,
  statusCode: number,
  message: string,
  details?: unknown
) {
  res.status(statusCode).json({ message, details })
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function isCombiningMark(char: string) {
  const codePoint = char.codePointAt(0) ?? 0

  return codePoint >= 0x0300 && codePoint <= 0x036f
}

function isAsciiLowercaseLetterOrDigit(char: string) {
  const codePoint = char.codePointAt(0) ?? 0

  return (
    (codePoint >= 0x61 && codePoint <= 0x7a) ||
    (codePoint >= 0x30 && codePoint <= 0x39)
  )
}

function toFilenameSlug(value: string, fallback: string) {
  let slug = ''
  let separatorPending = false

  for (const char of value.normalize('NFKD').toLowerCase()) {
    if (isCombiningMark(char)) continue

    if (isAsciiLowercaseLetterOrDigit(char)) {
      if (separatorPending && slug.length > 0 && slug.length < 80) {
        slug += '-'
      }

      if (slug.length < 80) {
        slug += char
      }

      separatorPending = false
    } else {
      separatorPending = slug.length > 0
    }

    if (slug.length >= 80) break
  }

  return slug || fallback
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return ''

  return new Date(value).toISOString().slice(0, 10)
}

function toIsoDateTime(value: Date | string | null | undefined) {
  if (!value) return ''

  return new Date(value).toISOString()
}

function escapeCsvValue(value: unknown) {
  const raw = String(value ?? '')
  // Prevent CSV/Excel formula injection (e.g. values starting with =, +, -, @)
  const source = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw

  return `"${source.replace(/\r\n?/g, '\n').replace(/"/g, '""')}"`
}

function getPreferredLanguage(acceptLanguage: string | string[] | undefined) {
  const header = Array.isArray(acceptLanguage)
    ? acceptLanguage.join(',')
    : acceptLanguage

  if (!header) return ''

  return (
    header
      .split(',')
      .map((entry, index) => {
        const [language = '', ...params] = entry.trim().split(';')
        const qParam = params.find((param) => param.trim().startsWith('q='))
        const qValue = qParam ? Number(qParam.split('=')[1]) : 1

        return {
          index,
          language: language.toLowerCase(),
          q: Number.isFinite(qValue) ? qValue : 0,
        }
      })
      .filter((entry) => entry.language)
      .sort((a, b) => b.q - a.q || a.index - b.index)[0]?.language ?? ''
  )
}

function getCsvDelimiter(
  acceptLanguage: string | string[] | undefined
): CsvDelimiter {
  const preferredLanguage = getPreferredLanguage(acceptLanguage)

  return preferredLanguage === 'de' || preferredLanguage.startsWith('de-')
    ? ';'
    : ','
}

function buildCsv(
  rows: Record<(typeof CSV_HEADERS)[number], unknown>[],
  delimiter: CsvDelimiter
) {
  return `\uFEFF${[
    CSV_HEADERS.map(escapeCsvValue).join(delimiter),
    ...rows.map((row) =>
      CSV_HEADERS.map((header) => escapeCsvValue(row[header])).join(delimiter)
    ),
  ].join('\n')}\n`
}

function getAttachment(
  attachments: ApplicationAttachment[],
  label: 'CV' | 'Transcript'
) {
  const target = label === 'CV' ? 'cv' : 'transcript'

  return (
    attachments.find((attachment) => normalizeName(attachment.name) === target) ??
    attachments.find((attachment) =>
      normalizeName(attachment.name).includes(target)
    )
  )
}

function formatAttachmentLinks(attachments: ApplicationAttachment[]) {
  return attachments
    .map((attachment) => `${attachment.name}: ${attachment.href}`)
    .join('\n')
}

function isSupervisorAuthorized({
  role,
  email,
  ownedByUserEmail,
  supervisedBy,
}: {
  role?: string
  email?: string | null
  ownedByUserEmail?: string | null
  supervisedBy: { supervisorEmail: string | null }[]
}) {
  if (role === UserRole.DEVELOPER) return true
  if (role !== UserRole.SUPERVISOR || !email) return false

  const userEmail = email.toLowerCase()

  return (
    ownedByUserEmail?.toLowerCase() === userEmail ||
    supervisedBy.some(
      (supervision) => supervision.supervisorEmail?.toLowerCase() === userEmail
    )
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    sendJsonError(res, 405, 'Method not allowed')
    return
  }

  const proposalId = req.query.proposalId

  if (typeof proposalId !== 'string' || proposalId.trim() === '') {
    sendJsonError(res, 400, 'Proposal ID is required')
    return
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.sub) {
    sendJsonError(res, 401, 'Authentication required')
    return
  }

  const proposal = await prisma.proposal.findFirst({
    where: {
      id: proposalId,
      typeKey: ProposalType.SUPERVISOR,
      department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
    },
    include: {
      applications: {
        include: {
          attachments: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      supervisedBy: {
        select: {
          supervisorEmail: true,
        },
      },
      topicArea: true,
    },
  })

  if (!proposal) {
    sendJsonError(res, 404, 'Supervisor proposal not found')
    return
  }

  if (
    !isSupervisorAuthorized({
      role: session.user.role,
      email: session.user.email,
      ownedByUserEmail: proposal.ownedByUserEmail,
      supervisedBy: proposal.supervisedBy,
    })
  ) {
    sendJsonError(res, 403, 'Not allowed to export this proposal')
    return
  }

  if (proposal.applications.length === 0) {
    sendJsonError(res, 404, 'No applications available for export')
    return
  }

  const rows = proposal.applications.map((application) => {
    const cvAttachment = getAttachment(application.attachments, 'CV')
    const transcriptAttachment = getAttachment(
      application.attachments,
      'Transcript'
    )

    return {
      'Proposal ID': proposal.id,
      'Proposal Title': proposal.title,
      'Proposal Topic Area': proposal.topicArea.name,
      'Proposal Language': proposal.language,
      'Proposal Study Level': proposal.studyLevel,
      'Proposal Status': proposal.statusKey,
      'Proposal Created At': toIsoDateTime(proposal.createdAt),
      'Application ID': application.id,
      'Application Status': application.statusKey,
      'Full Name': application.fullName,
      Email: application.email,
      'Matriculation Number': application.matriculationNumber,
      'Planned Start At': toIsoDate(application.plannedStartAt),
      'Planned End At': toIsoDate(addMonths(application.plannedStartAt, 6)),
      Motivation: application.motivation,
      'Allow Usage': application.allowUsage,
      'Allow Publication': application.allowPublication,
      'Application Created At': toIsoDateTime(application.createdAt),
      'Application Updated At': toIsoDateTime(application.updatedAt),
      'CV Link': cvAttachment?.href ?? '',
      'Transcript Link': transcriptAttachment?.href ?? '',
      'Attachment Links': formatAttachmentLinks(application.attachments),
    }
  })

  const dateStamp = toIsoDate(new Date())
  const filename = `applications-${toFilenameSlug(
    proposal.title,
    'proposal'
  )}-${dateStamp}.csv`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store')
  res
    .status(200)
    .send(buildCsv(rows, getCsvDelimiter(req.headers['accept-language'])))
}
