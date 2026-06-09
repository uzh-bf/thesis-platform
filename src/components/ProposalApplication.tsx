import { faDownload, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@uzh-bf/design-system'
import { add, format } from 'date-fns'
import { useSession } from 'next-auth/react'
import { Dispatch, SetStateAction, useState } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'
import {
  ApplicationDetails,
  ProposalDetails,
  ProposalStatusFilter,
} from 'src/types/app'
import ApplicationDetailsModal from './ApplicationDetailsModal'
import ApplicationForm from './ApplicationForm'
import ConfirmationModal from './ConfirmationModal'

interface ProposalApplicationProps {
  proposalDetails: ProposalDetails
  refetch: () => void
  setFilters: Dispatch<SetStateAction<{ status: ProposalStatusFilter }>>
}

const statusClassNames: Record<string, string> = {
  ACCEPTED: 'bg-[#ECF6D6] text-[#536B18]',
  DECLINED: 'bg-[#FAFAFA] text-[#666666]',
  OPEN: 'bg-[#F5F5FB] text-[#0028A5]',
}

function formatDate(date: Date | string) {
  return format(new Date(date), 'dd.MM.yyyy')
}

function formatWorkingPeriod(plannedStartAt: Date | string) {
  const startDate = new Date(plannedStartAt)
  const endDate = add(startDate, { months: 6 })

  return `${formatDate(startDate)} - ${formatDate(endDate)}`
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

function toFilenameSlug(value: string) {
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

  return slug || 'proposal'
}

function getFilenameFromContentDisposition(header: string | null) {
  if (!header) return null

  const filenameMarker = 'filename="'
  const filenameStart = header.indexOf(filenameMarker)

  if (filenameStart === -1) return null

  const valueStart = filenameStart + filenameMarker.length
  const valueEnd = header.indexOf('"', valueStart)

  if (valueEnd === -1) return null

  return header.slice(valueStart, valueEnd) || null
}

function toSafePathSegment(value: string, fallback: string) {
  let segment = ''
  let separatorPending = false

  for (const char of value.normalize('NFKD')) {
    if (isCombiningMark(char)) continue

    const codePoint = char.codePointAt(0) ?? 0
    const isAllowed =
      (codePoint >= 0x41 && codePoint <= 0x5a) ||
      (codePoint >= 0x61 && codePoint <= 0x7a) ||
      (codePoint >= 0x30 && codePoint <= 0x39) ||
      char === '.' ||
      char === '-'

    if (isAllowed) {
      if (separatorPending && segment.length > 0 && segment.length < 80) {
        segment += '_'
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

function getAttachment(
  attachments: ApplicationDetails['attachments'],
  label: 'CV' | 'Transcript'
) {
  const target = label === 'CV' ? 'cv' : 'transcript'

  return (
    attachments?.find(
      (attachment) => attachment.name.trim().toLowerCase() === target
    ) ??
    attachments?.find((attachment) =>
      attachment.name.trim().toLowerCase().includes(target)
    )
  )
}

function toDownloadUrl(href: string) {
  const url = new URL(href)
  url.searchParams.set('download', '1')

  return url.toString()
}

async function fetchPdfFromBrowser(
  attachment: NonNullable<ApplicationDetails['attachments']>[number]
) {
  const response = await fetch(toDownloadUrl(attachment.href), {
    credentials: 'include',
    headers: {
      accept: 'application/pdf',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const data = new Uint8Array(await response.arrayBuffer())
  const looksLikePdf =
    data.length >= 5 && new TextDecoder().decode(data.subarray(0, 5)) === '%PDF-'

  if (!looksLikePdf && !contentType.includes('application/pdf')) {
    throw new Error(
      contentType
        ? `Unexpected content type: ${contentType}`
        : 'Downloaded file is not a PDF'
    )
  }

  return data
}

function escapeCsvValue(value: unknown) {
  const raw = String(value ?? '')
  const source = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw

  return `"${source.replace(/\r\n?/g, '\n').replace(/"/g, '""')}"`
}

function getCsvDelimiter() {
  const locale = navigator.languages?.[0] ?? navigator.language ?? ''
  const normalizedLocale = locale.toLowerCase()

  return normalizedLocale === 'de' || normalizedLocale.startsWith('de-')
    ? ';'
    : ','
}

function buildApplicationsCsv({
  proposalDetails,
  rows,
}: {
  proposalDetails: ProposalDetails
  rows: {
    application: ApplicationDetails
    applicantFolder: string
    cvZipPath: string
    transcriptZipPath: string
    cvHref: string
    transcriptHref: string
  }[]
}) {
  const delimiter = getCsvDelimiter()
  const headers = [
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

  const csvRows = rows.map(
    ({
      application,
      applicantFolder,
      cvZipPath,
      transcriptZipPath,
      cvHref,
      transcriptHref,
    }) => ({
      'Proposal ID': proposalDetails.id,
      'Proposal Title': proposalDetails.title,
      'Proposal Topic Area': proposalDetails.topicArea.name,
      'Proposal Language': proposalDetails.language,
      'Proposal Study Level': proposalDetails.studyLevel,
      'Proposal Status': proposalDetails.statusKey,
      'Proposal Created At': new Date(proposalDetails.createdAt).toISOString(),
      'Application ID': application.id,
      'Application Status': application.statusKey,
      'Full Name': application.fullName,
      Email: application.email,
      'Matriculation Number': application.matriculationNumber,
      'Planned Start At': new Date(application.plannedStartAt)
        .toISOString()
        .slice(0, 10),
      'Planned End At': add(new Date(application.plannedStartAt), {
        months: 6,
      })
        .toISOString()
        .slice(0, 10),
      Motivation: application.motivation,
      'Allow Usage': application.allowUsage,
      'Allow Publication': application.allowPublication,
      'Application Created At': new Date(application.createdAt).toISOString(),
      'Application Updated At': new Date(application.updatedAt).toISOString(),
      'Applicant Folder': applicantFolder,
      'CV Link': cvHref,
      'Transcript Link': transcriptHref,
      'CV ZIP Path': cvZipPath,
      'Transcript ZIP Path': transcriptZipPath,
    })
  )

  return `\uFEFF${[
    headers.map(escapeCsvValue).join(delimiter),
    ...csvRows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(delimiter)
    ),
  ].join('\n')}\n`
}

const crcTable = (() => {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
})()

function crc32(data: Uint8Array) {
  let value = 0xffffffff

  for (let index = 0; index < data.length; index += 1) {
    value = crcTable[(value ^ data[index]) & 0xff] ^ (value >>> 8)
  }

  return (value ^ 0xffffffff) >>> 0
}

function toBlobPart(data: Uint8Array) {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear())
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()

  return { dosDate, dosTime }
}

function createZipBlob(entries: { name: string; data: Uint8Array }[]) {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  const { dosDate, dosTime } = getDosDateTime()
  let offset = 0

  const writeHeader = (size: number, write: (view: DataView) => void) => {
    const bytes = new Uint8Array(size)
    write(new DataView(bytes.buffer))

    return bytes
  }

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const checksum = crc32(entry.data)
    const localOffset = offset
    const localHeader = writeHeader(30, (view) => {
      view.setUint32(0, 0x04034b50, true)
      view.setUint16(4, 20, true)
      view.setUint16(6, 0x0800, true)
      view.setUint16(8, 0, true)
      view.setUint16(10, dosTime, true)
      view.setUint16(12, dosDate, true)
      view.setUint32(14, checksum, true)
      view.setUint32(18, entry.data.length, true)
      view.setUint32(22, entry.data.length, true)
      view.setUint16(26, name.length, true)
      view.setUint16(28, 0, true)
    })

    localParts.push(localHeader, name, entry.data)
    offset += localHeader.length + name.length + entry.data.length

    const centralHeader = writeHeader(46, (view) => {
      view.setUint32(0, 0x02014b50, true)
      view.setUint16(4, 20, true)
      view.setUint16(6, 20, true)
      view.setUint16(8, 0x0800, true)
      view.setUint16(10, 0, true)
      view.setUint16(12, dosTime, true)
      view.setUint16(14, dosDate, true)
      view.setUint32(16, checksum, true)
      view.setUint32(20, entry.data.length, true)
      view.setUint32(24, entry.data.length, true)
      view.setUint16(28, name.length, true)
      view.setUint16(30, 0, true)
      view.setUint16(32, 0, true)
      view.setUint16(34, 0, true)
      view.setUint16(36, 0, true)
      view.setUint32(38, 0, true)
      view.setUint32(42, localOffset, true)
    })

    centralParts.push(centralHeader, name)
  }

  const centralDirectoryOffset = offset
  const centralDirectorySize = centralParts.reduce(
    (sum, part) => sum + part.length,
    0
  )
  const endRecord = writeHeader(22, (view) => {
    view.setUint32(0, 0x06054b50, true)
    view.setUint16(4, 0, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, entries.length, true)
    view.setUint16(10, entries.length, true)
    view.setUint32(12, centralDirectorySize, true)
    view.setUint32(16, centralDirectoryOffset, true)
    view.setUint16(20, 0, true)
  })

  return new Blob([...localParts, ...centralParts, endRecord].map(toBlobPart), {
    type: 'application/zip',
  })
}

async function buildApplicationsZipInBrowser(proposalDetails: ProposalDetails) {
  const encoder = new TextEncoder()
  const files: { name: string; data: Uint8Array }[] = []
  const csvRows: Parameters<typeof buildApplicationsCsv>[0]['rows'] = []

  for (let index = 0; index < proposalDetails.applications.length; index += 1) {
    const application = proposalDetails.applications[index]
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

    if (!cvAttachment || !transcriptAttachment) {
      throw new Error(
        `${application.fullName} is missing a CV or Transcript attachment.`
      )
    }

    const cvZipPath = `${applicantFolder}/cv.pdf`
    const transcriptZipPath = `${applicantFolder}/transcript.pdf`

    try {
      const [cv, transcript] = await Promise.all([
        fetchPdfFromBrowser(cvAttachment),
        fetchPdfFromBrowser(transcriptAttachment),
      ])

      files.push(
        { name: cvZipPath, data: cv },
        { name: transcriptZipPath, data: transcript }
      )
      csvRows.push({
        application,
        applicantFolder,
        cvZipPath,
        transcriptZipPath,
        cvHref: cvAttachment.href,
        transcriptHref: transcriptAttachment.href,
      })
    } catch (error) {
      throw new Error(
        `${application.fullName}: ${
          error instanceof Error ? error.message : 'PDF download failed'
        }`
      )
    }
  }

  files.unshift({
    name: 'overview.csv',
    data: encoder.encode(buildApplicationsCsv({ proposalDetails, rows: csvRows })),
  })

  return createZipBlob(files)
}

function isSameEmail(firstEmail?: string | null, secondEmail?: string | null) {
  if (!firstEmail || !secondEmail) return false

  return firstEmail.toLowerCase() === secondEmail.toLowerCase()
}

export default function ProposalApplication({
  proposalDetails,
  refetch,
  setFilters,
}: ProposalApplicationProps) {
  const { data: session } = useSession()
  const { isStudent, isSupervisor, isDeveloper } = useUserRole()
  const acceptApplication = trpc.acceptProposalApplication.useMutation()
  const declineIndividualApplication =
    trpc.declineProposalApplication.useMutation()
  const applications = proposalDetails.applications ?? []
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const currentUserEmail = session?.user?.email
  const canManageApplications =
    isDeveloper ||
    (isSupervisor &&
      (isSameEmail(currentUserEmail, proposalDetails?.ownedByUserEmail) ||
        proposalDetails?.supervisedBy?.some((supervision) =>
          isSameEmail(currentUserEmail, supervision.supervisorEmail)
        )))

  const handleDownloadApplicationsZip = async () => {
    if (isDownloadingZip) return

    try {
      setIsDownloadingZip(true)

      const fallbackFilename = `applications-${toFilenameSlug(
        proposalDetails.title
      )}-${format(new Date(), 'yyyy-MM-dd')}.zip`
      let blob: Blob
      let filename = fallbackFilename

      try {
        blob = await buildApplicationsZipInBrowser(proposalDetails)
      } catch (browserError) {
        const response = await fetch(
          `/api/proposals/${encodeURIComponent(
            proposalDetails.id
          )}/applications/download`
        )

        if (!response.ok) {
          let message = 'Application ZIP export failed. Please try again.'

          try {
            const errorBody = await response.json()
            if (typeof errorBody?.message === 'string') {
              message = errorBody.message
            }
          } catch (_error) {
            // Keep the generic error if the server did not return JSON.
          }

          throw new Error(
            `Browser download failed (${browserError instanceof Error ? browserError.message : 'PDF download failed'}). Server fallback failed: ${message}`
          )
        }

        blob = await response.blob()
        filename =
          getFilenameFromContentDisposition(
            response.headers.get('Content-Disposition')
          ) ?? fallbackFilename
      }

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Application ZIP export failed. Please try again.'
      )
    } finally {
      setIsDownloadingZip(false)
    }
  }

  if (proposalDetails?.typeKey === 'SUPERVISOR') {
    return (
      <div className="p-4">
        {isStudent && (
          <ApplicationForm
            key={proposalDetails.id}
            proposalName={proposalDetails.title}
            proposalId={proposalDetails.id}
          />
        )}
        {canManageApplications ? (
          <div className="pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[26px] font-semibold leading-tight text-[#121212]">
                Applications
              </h2>
              {applications.length > 0 && (
                <Button
                  disabled={isDownloadingZip}
                  onClick={handleDownloadApplicationsZip}
                  size="sm"
                  title="Download all application files as ZIP"
                >
                  <Button.Icon
                    icon={isDownloadingZip ? faSpinner : faDownload}
                  />
                  <Button.Label>
                    {isDownloadingZip ? 'Downloading...' : 'Download ZIP'}
                  </Button.Label>
                </Button>
              )}
            </div>
            {applications.length === 0 && (
              <p className="mt-2 text-base text-[#4C4C4C]">
                No applications for this proposal...
              </p>
            )}
            {applications.length > 0 && (
              <div className="mt-4 grid gap-3">
                {applications.map((application: ApplicationDetails) => (
                  <article
                    key={application.id}
                    className="rounded-[8px] border border-[#E9E9E9] bg-white p-4"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] ${
                              statusClassNames[application.statusKey] ??
                              'bg-[#FAFAFA] text-[#4C4C4C]'
                            }`}
                          >
                            {application.statusKey.toLowerCase()}
                          </span>
                          <span className="text-sm text-[#666666]">
                            Submitted {formatDate(application.createdAt)}
                          </span>
                        </div>
                        <h3 className="break-words text-base font-semibold text-[#121212] [overflow-wrap:anywhere]">
                          {application.fullName}
                        </h3>
                        <p className="break-all text-sm text-[#4C4C4C]">
                          {application.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ApplicationDetailsModal row={application} />
                        <ConfirmationModal
                          row={application}
                          acceptApplication={acceptApplication}
                          declineIndividualApplication={
                            declineIndividualApplication
                          }
                          proposalDetails={proposalDetails}
                          refetch={refetch}
                          setFilters={setFilters}
                        />
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 border-t border-[#E9E9E9] pt-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                          Working Period
                        </dt>
                        <dd className="mt-1 text-sm text-[#121212]">
                          {formatWorkingPeriod(application.plannedStartAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                          Matriculation
                        </dt>
                        <dd className="mt-1 text-sm text-[#121212]">
                          {application.matriculationNumber || '-'}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          isSupervisor && (
            <div className="bg-yellow-100">
              You are not allowed to see any applications to this proposal.
            </div>
          )
        )}
      </div>
    )
  } else {
    return null
  }
}
