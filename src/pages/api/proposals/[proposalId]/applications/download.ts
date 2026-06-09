import { ZipArchive } from 'archiver'
import { addMonths } from 'date-fns'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'src/lib/authOptions'
import { Department, ProposalType, UserRole } from 'src/lib/constants'
import prisma from 'src/server/prisma'

export const config = {
  api: {
    responseLimit: false,
  },
}

type ApplicationAttachment = {
  id: string
  name: string
  href: string
  type: string
}

type ApplicationExportFile = {
  zipPath: string
  buffer: Buffer
}

type ExportFailure = {
  applicationId: string
  applicant: string
  attachment: 'CV' | 'Transcript'
  message: string
  href?: string
}

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
  'Applicant Folder',
  'CV Link',
  'Transcript Link',
  'CV ZIP Path',
  'Transcript ZIP Path',
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

function isAsciiLetterOrDigit(char: string) {
  const codePoint = char.codePointAt(0) ?? 0

  return (
    (codePoint >= 0x41 && codePoint <= 0x5a) ||
    (codePoint >= 0x61 && codePoint <= 0x7a) ||
    (codePoint >= 0x30 && codePoint <= 0x39)
  )
}

function isAsciiLowercaseLetterOrDigit(char: string) {
  const codePoint = char.codePointAt(0) ?? 0

  return (
    (codePoint >= 0x61 && codePoint <= 0x7a) ||
    (codePoint >= 0x30 && codePoint <= 0x39)
  )
}

function sanitizeSegment({
  value,
  fallback,
  separator,
  preserveDotAndDash,
  lowercase,
}: {
  value: string
  fallback: string
  separator: '-' | '_'
  preserveDotAndDash: boolean
  lowercase: boolean
}) {
  let segment = ''
  let separatorPending = false
  const normalizedValue = value.normalize('NFKD')
  const source = lowercase ? normalizedValue.toLowerCase() : normalizedValue

  for (const char of source) {
    if (isCombiningMark(char)) continue

    const isAllowed =
      (lowercase
        ? isAsciiLowercaseLetterOrDigit(char)
        : isAsciiLetterOrDigit(char)) ||
      (preserveDotAndDash && (char === '.' || char === '-'))

    if (isAllowed) {
      if (separatorPending && segment.length > 0 && segment.length < 80) {
        segment += separator
      }

      if (segment.length < 80) {
        segment += char
      }

      separatorPending = false
    } else {
      separatorPending = segment.length > 0
    }

    if (segment.length >= 80) break
  }

  return segment || fallback
}

function toSafePathSegment(value: string, fallback: string) {
  return sanitizeSegment({
    value,
    fallback,
    separator: '_',
    preserveDotAndDash: true,
    lowercase: false,
  })
}

function toFilenameSlug(value: string, fallback: string) {
  return sanitizeSegment({
    value,
    fallback,
    separator: '-',
    preserveDotAndDash: false,
    lowercase: true,
  })
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
  const source = String(value ?? '')
  let escaped = ''

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '"') {
      escaped += '""'
    } else if (char === '\r') {
      escaped += '\n'

      if (source[index + 1] === '\n') {
        index += 1
      }
    } else {
      escaped += char
    }
  }

  return `"${escaped}"`
}

function buildCsv(rows: Record<(typeof CSV_HEADERS)[number], unknown>[]) {
  return `\uFEFF${[
    CSV_HEADERS.map(escapeCsvValue).join(';'),
    ...rows.map((row) =>
      CSV_HEADERS.map((header) => escapeCsvValue(row[header])).join(';')
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

function toDownloadUrl(href: string) {
  const url = new URL(href)
  url.searchParams.set('download', '1')

  return url.toString()
}

async function fetchPdfAttachment(
  attachment: ApplicationAttachment,
  timeoutMs = 20000
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(toDownloadUrl(attachment.href), {
      headers: {
        accept: 'application/pdf',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    const buffer = Buffer.from(await response.arrayBuffer())
    const looksLikePdf = buffer.subarray(0, 5).toString('utf8') === '%PDF-'
    const hasPdfContentType = contentType.includes('application/pdf')

    if (!looksLikePdf && !hasPdfContentType) {
      throw new Error(
        contentType
          ? `Unexpected content type: ${contentType}`
          : 'Downloaded file is not a PDF'
      )
    }

    return buffer
  } finally {
    clearTimeout(timeout)
  }
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

  const failures: ExportFailure[] = []
  const files: ApplicationExportFile[] = []
  const rows: Record<(typeof CSV_HEADERS)[number], unknown>[] = []

  for (let index = 0; index < proposal.applications.length; index += 1) {
    const application = proposal.applications[index]
    const applicantFolder = [
      String(index + 1).padStart(2, '0'),
      toSafePathSegment(application.fullName, 'applicant'),
      toSafePathSegment(application.matriculationNumber, application.id),
    ].join('_')
    const cvAttachment = getAttachment(application.attachments, 'CV')
    const transcriptAttachment = getAttachment(
      application.attachments,
      'Transcript'
    )
    const cvZipPath = `${applicantFolder}/cv.pdf`
    const transcriptZipPath = `${applicantFolder}/transcript.pdf`

    rows.push({
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
      'Applicant Folder': applicantFolder,
      'CV Link': cvAttachment?.href ?? '',
      'Transcript Link': transcriptAttachment?.href ?? '',
      'CV ZIP Path': cvAttachment ? cvZipPath : '',
      'Transcript ZIP Path': transcriptAttachment ? transcriptZipPath : '',
    })

    for (const [label, attachment, zipPath] of [
      ['CV', cvAttachment, cvZipPath],
      ['Transcript', transcriptAttachment, transcriptZipPath],
    ] as const) {
      if (!attachment) {
        failures.push({
          applicationId: application.id,
          applicant: application.fullName,
          attachment: label,
          message: `${label} attachment is missing`,
        })
        continue
      }

      try {
        files.push({
          zipPath,
          buffer: await fetchPdfAttachment(attachment),
        })
      } catch (error) {
        failures.push({
          applicationId: application.id,
          applicant: application.fullName,
          attachment: label,
          message: error instanceof Error ? error.message : 'Download failed',
          href: attachment.href,
        })
      }
    }
  }

  if (failures.length > 0) {
    sendJsonError(
      res,
      502,
      'Application export could not be created because one or more PDFs could not be downloaded.',
      failures
    )
    return
  }

  const dateStamp = toIsoDate(new Date())
  const filename = `applications-${toFilenameSlug(
    proposal.title,
    'proposal'
  )}-${dateStamp}.zip`
  const archive = new ZipArchive({ zlib: { level: 9 } })
  const archiveFinished = new Promise<void>((resolve, reject) => {
    const onError = (error: unknown) =>
      reject(error instanceof Error ? error : new Error(String(error)))

    res.on('finish', resolve)
    res.on('close', () => reject(new Error('Client disconnected')))
    res.on('error', onError)
    archive.on('error', onError)
  })

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  archive.pipe(res)
  archive.append(buildCsv(rows), { name: 'overview.csv' })

  for (const file of files) {
    archive.append(file.buffer, { name: file.zipPath })
  }

  await archive.finalize()
  await archiveFinished
}
