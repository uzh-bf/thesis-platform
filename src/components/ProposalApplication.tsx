import {
  faDownload,
  faSpinner,
  faTableList,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@uzh-bf/design-system'
import { add, format } from 'date-fns'
import Link from 'next/link'
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
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)
  const currentUserEmail = session?.user?.email
  const canManageApplications =
    isDeveloper ||
    (isSupervisor &&
      (isSameEmail(currentUserEmail, proposalDetails?.ownedByUserEmail) ||
        proposalDetails?.supervisedBy?.some((supervision) =>
          isSameEmail(currentUserEmail, supervision.supervisorEmail)
        )))

  const handleDownloadApplicationsCsv = async () => {
    if (isDownloadingCsv) return

    try {
      setIsDownloadingCsv(true)

      const fallbackFilename = `applications-${toFilenameSlug(
        proposalDetails.title
      )}-${format(new Date(), 'yyyy-MM-dd')}.csv`
      const response = await fetch(
        `/api/proposals/${encodeURIComponent(
          proposalDetails.id
        )}/applications/download`
      )

      if (!response.ok) {
        let message = 'Application CSV export failed. Please try again.'

        try {
          const errorBody = await response.json()
          if (typeof errorBody?.message === 'string') {
            message = errorBody.message
          }
        } catch (_error) {
          // Keep the generic error if the server did not return JSON.
        }

        throw new Error(message)
      }

      const blob = await response.blob()
      const filename =
        getFilenameFromContentDisposition(
          response.headers.get('Content-Disposition')
        ) ?? fallbackFilename
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
          : 'Application CSV export failed. Please try again.'
      )
    } finally {
      setIsDownloadingCsv(false)
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
                <div className="flex flex-wrap gap-2">
                  <Link href={`/proposals/${proposalDetails.id}/applications`}>
                    <Button
                      size="sm"
                      title="Compare all applicants side by side in a table"
                    >
                      <Button.Icon icon={faTableList} />
                      <Button.Label>Applicant Overview</Button.Label>
                    </Button>
                  </Link>
                  <Button
                    disabled={isDownloadingCsv}
                    onClick={handleDownloadApplicationsCsv}
                    size="sm"
                    title="Download application data as CSV"
                  >
                    <Button.Icon
                      icon={isDownloadingCsv ? faSpinner : faDownload}
                    />
                    <Button.Label>
                      {isDownloadingCsv ? 'Downloading...' : 'Download CSV'}
                    </Button.Label>
                  </Button>
                </div>
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
