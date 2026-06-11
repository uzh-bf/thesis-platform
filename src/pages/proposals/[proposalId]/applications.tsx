import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import {
  faArrowLeft,
  faChevronDown,
  faChevronUp,
  faDownload,
  faMagnifyingGlass,
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { add, format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import ConfirmationModal from 'src/components/ConfirmationModal'
import EmptyState from 'src/components/EmptyState'
import { trpc } from 'src/lib/trpc'
import {
  ProposalApplicationsOverviewEntry,
  ProposalStatusFilter,
} from 'src/types/app'

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}

const statusClassNames: Record<string, string> = {
  ACCEPTED: 'bg-[#ECF6D6] text-[#536B18]',
  ACCEPTED_TENTATIVE: 'bg-[#ECF6D6] text-[#536B18]',
  DECLINED: 'bg-[#FAFAFA] text-[#666666]',
  WITHDRAWN: 'bg-[#FAFAFA] text-[#666666]',
  OPEN: 'bg-[#F5F5FB] text-[#0028A5]',
}

const STATUS_ORDER = [
  'OPEN',
  'ACCEPTED_TENTATIVE',
  'ACCEPTED',
  'DECLINED',
  'WITHDRAWN',
]

type SortKey = 'name' | 'status' | 'submitted' | 'start'
type SortDirection = 'asc' | 'desc'

const headerCellClass =
  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]'

// The shared ConfirmationModal resets the homepage proposal filter after an
// acceptance; on this standalone page there is no filter state to update.
const noopSetFilters: Dispatch<
  SetStateAction<{ status: ProposalStatusFilter }>
> = () => {}

function formatDate(date: Date | string) {
  return format(new Date(date), 'dd.MM.yyyy')
}

function formatWorkingPeriod(plannedStartAt: Date | string) {
  const startDate = new Date(plannedStartAt)
  const endDate = add(startDate, { months: 6 })

  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function formatStatusLabel(statusKey: string) {
  return statusKey.toLowerCase().replace(/_/g, ' ')
}

function statusSortIndex(statusKey: string) {
  const index = STATUS_ORDER.indexOf(statusKey)

  return index === -1 ? STATUS_ORDER.length : index
}

function formatConsent(value: boolean | null | undefined) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'

  return '-'
}

function StatusBadge({ statusKey }: { statusKey: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] ${
        statusClassNames[statusKey] ?? 'bg-[#FAFAFA] text-[#4C4C4C]'
      }`}
    >
      {formatStatusLabel(statusKey)}
    </span>
  )
}

function AttachmentLinks({
  attachments,
}: {
  attachments: ProposalApplicationsOverviewEntry['attachments']
}) {
  if (attachments.length === 0) {
    return <span className="text-sm text-[#666666]">-</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#365DD5] hover:text-[#0028A5]"
        >
          <FontAwesomeIcon
            icon={FileTypeIconMap[attachment.type] ?? faFilePdf}
          />
          {attachment.name}
        </a>
      ))}
    </div>
  )
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; direction: SortDirection }
  onSort: (key: SortKey) => void
}) {
  const isActive = sort.key === sortKey
  const icon = isActive
    ? sort.direction === 'asc'
      ? faSortUp
      : faSortDown
    : faSort

  return (
    <th className={headerCellClass}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 uppercase tracking-[0.04em] hover:text-[#0028A5]"
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <FontAwesomeIcon
          icon={icon}
          className={isActive ? 'text-[#0028A5]' : 'text-[#C2C2C2]'}
        />
      </button>
    </th>
  )
}

export default function ProposalApplicationsOverviewPage() {
  const router = useRouter()
  const proposalId =
    typeof router.query.proposalId === 'string'
      ? router.query.proposalId
      : undefined

  const {
    data: proposal,
    error,
    refetch,
  } = trpc.proposalApplications.useQuery(
    { proposalId: proposalId ?? '' },
    { enabled: !!proposalId, retry: false }
  )

  const acceptApplication = trpc.acceptProposalApplication.useMutation()
  const declineIndividualApplication =
    trpc.declineProposalApplication.useMutation()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'submitted',
    direction: 'asc',
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const applications = useMemo(
    () => proposal?.applications ?? [],
    [proposal?.applications]
  )

  const statusChips = useMemo(() => {
    const counts = new Map<string, number>()

    for (const application of applications) {
      counts.set(
        application.statusKey,
        (counts.get(application.statusKey) ?? 0) + 1
      )
    }

    const orderedKeys = [
      ...STATUS_ORDER.filter((key) => counts.has(key)),
      ...Array.from(counts.keys()).filter(
        (key) => !STATUS_ORDER.includes(key)
      ),
    ]

    return [
      { key: 'ALL', label: 'all', count: applications.length },
      ...orderedKeys.map((key) => ({
        key,
        label: formatStatusLabel(key),
        count: counts.get(key) ?? 0,
      })),
    ]
  }, [applications])

  const visibleApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filtered = applications.filter((application) => {
      if (statusFilter !== 'ALL' && application.statusKey !== statusFilter) {
        return false
      }

      if (normalizedSearch) {
        const haystack =
          `${application.fullName} ${application.email} ${application.matriculationNumber}`.toLowerCase()

        if (!haystack.includes(normalizedSearch)) return false
      }

      return true
    })

    const direction = sort.direction === 'asc' ? 1 : -1

    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return a.fullName.localeCompare(b.fullName) * direction
        case 'status':
          return (
            (statusSortIndex(a.statusKey) - statusSortIndex(b.statusKey)) *
            direction
          )
        case 'start':
          return (
            (new Date(a.plannedStartAt).getTime() -
              new Date(b.plannedStartAt).getTime()) *
            direction
          )
        case 'submitted':
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            direction
          )
      }
    })
  }, [applications, statusFilter, searchTerm, sort])

  const allExpanded =
    visibleApplications.length > 0 &&
    visibleApplications.every((application) => expandedIds.has(application.id))

  const handleSort = (key: SortKey) => {
    setSort((currentSort) =>
      currentSort.key === key
        ? {
            key,
            direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
          }
        : { key, direction: 'asc' }
    )
  }

  const toggleExpanded = (applicationId: string) => {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(applicationId)) {
        nextIds.delete(applicationId)
      } else {
        nextIds.add(applicationId)
      }

      return nextIds
    })
  }

  const toggleAllExpanded = () => {
    setExpandedIds(
      allExpanded
        ? new Set()
        : new Set(visibleApplications.map((application) => application.id))
    )
  }

  if (error) {
    const errorContent =
      error.data?.code === 'UNAUTHORIZED'
        ? {
            title: 'Sign in required',
            description:
              'Please sign in with your supervisor account to view the applications for this proposal.',
          }
        : error.data?.code === 'FORBIDDEN'
          ? {
              title: 'No access',
              description:
                'You are not allowed to see the applications for this proposal.',
            }
          : error.data?.code === 'NOT_FOUND'
            ? {
                title: 'Proposal not found',
                description:
                  'This proposal does not exist or has no application overview.',
              }
            : {
                title: 'Something went wrong',
                description:
                  'The applications could not be loaded. Please try again later.',
              }

    return (
      <main id="main-content" className="flex-1 bg-[#FAFAFA]">
        <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-10 xl:px-10">
          <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm">
            <EmptyState {...errorContent} />
          </div>
        </section>
      </main>
    )
  }

  if (!proposal) {
    return (
      <main id="main-content" className="flex-1 bg-[#FAFAFA]">
        <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-10 xl:px-10">
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-lg border border-[#E9E9E9] bg-white p-6">
              <div className="h-8 w-1/3 rounded bg-[#E9E9E9]"></div>
            </div>
            <div className="h-96 rounded-lg border border-[#E9E9E9] bg-white p-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="h-14 rounded bg-[#F5F5FB]"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-10 xl:px-10">
        <div className="space-y-4">
          <div>
            <Link
              href={`/${proposal.id}`}
              className="inline-flex items-center gap-2 rounded-[4px] border border-[#0028A5] bg-white px-3 py-2 text-sm font-semibold text-[#0028A5] hover:bg-[#F5F5FB]"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to proposal
            </Link>
          </div>

          <div className="rounded-lg border border-[#E9E9E9] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex rounded-full bg-[#F5F5FB] px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-[#0028A5]">
                  Applicant Overview
                </div>
                <h1 className="break-words text-[26px] font-semibold leading-tight text-[#121212]">
                  {proposal.title}
                </h1>
                <p className="mt-2 text-sm text-[#4C4C4C]">
                  {proposal.topicArea.name} &middot;{' '}
                  {applications.length === 1
                    ? '1 application'
                    : `${applications.length} applications`}
                </p>
              </div>
              {applications.length > 0 && (
                <a
                  href={`/api/proposals/${encodeURIComponent(
                    proposal.id
                  )}/applications/download`}
                  className="shrink-0"
                >
                  <Button size="sm" title="Download application data as CSV">
                    <Button.Icon icon={faDownload} />
                    <Button.Label>Download CSV</Button.Label>
                  </Button>
                </a>
              )}
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm">
              <EmptyState
                title="No Applications"
                description="There are no applications for this proposal yet."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#E9E9E9] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666666]"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name, email or matriculation..."
                    aria-label="Search applications"
                    className="h-9 w-full rounded-[4px] border border-[#E9E9E9] bg-white pl-9 pr-3 text-sm text-[#121212] placeholder:text-[#999999] focus:border-[#0028A5] focus:outline-none lg:w-80"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {statusChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setStatusFilter(chip.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        statusFilter === chip.key
                          ? 'bg-[#0028A5] text-white'
                          : 'border border-[#E9E9E9] bg-white text-[#4C4C4C] hover:border-[#0028A5] hover:text-[#0028A5]'
                      }`}
                    >
                      {chip.label} ({chip.count})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={toggleAllExpanded}
                    disabled={visibleApplications.length === 0}
                    className="ml-1 inline-flex items-center gap-2 rounded-[4px] border border-[#E9E9E9] bg-white px-3 py-1.5 text-xs font-semibold text-[#4C4C4C] hover:border-[#0028A5] hover:text-[#0028A5] disabled:opacity-50"
                  >
                    <FontAwesomeIcon
                      icon={allExpanded ? faChevronUp : faChevronDown}
                    />
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[68rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E9E9E9] bg-[#FAFAFA]">
                      <th className={`${headerCellClass} w-10`}>
                        <span className="sr-only">Expand</span>
                      </th>
                      <SortableHeader
                        label="Applicant"
                        sortKey="name"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Status"
                        sortKey="status"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Submitted"
                        sortKey="submitted"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Working Period"
                        sortKey="start"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <th className={headerCellClass}>Motivation</th>
                      <th className={headerCellClass}>Documents</th>
                      <th className={headerCellClass}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleApplications.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-[#4C4C4C]"
                        >
                          No applications match your filters.
                        </td>
                      </tr>
                    )}
                    {visibleApplications.map((application) => {
                      const isExpanded = expandedIds.has(application.id)

                      return (
                        <ApplicationRow
                          key={application.id}
                          application={application}
                          isExpanded={isExpanded}
                          toggleExpanded={toggleExpanded}
                          acceptApplication={acceptApplication}
                          declineIndividualApplication={
                            declineIndividualApplication
                          }
                          proposal={proposal}
                          refetch={refetch}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function ApplicationRow({
  application,
  isExpanded,
  toggleExpanded,
  acceptApplication,
  declineIndividualApplication,
  proposal,
  refetch,
}: {
  application: ProposalApplicationsOverviewEntry
  isExpanded: boolean
  toggleExpanded: (applicationId: string) => void
  acceptApplication: ReturnType<
    typeof trpc.acceptProposalApplication.useMutation
  >
  declineIndividualApplication: ReturnType<
    typeof trpc.declineProposalApplication.useMutation
  >
  proposal: { id: string }
  refetch: () => void
}) {
  return (
    <>
      <tr className="border-t border-[#E9E9E9] align-top">
        <td className="px-4 py-4">
          <button
            type="button"
            onClick={() => toggleExpanded(application.id)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? `Collapse details for ${application.fullName}`
                : `Expand details for ${application.fullName}`
            }
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[#E9E9E9] text-[#4C4C4C] hover:border-[#0028A5] hover:text-[#0028A5]"
          >
            <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
          </button>
        </td>
        <td className="max-w-[16rem] px-4 py-4">
          <div className="break-words text-sm font-semibold text-[#121212] [overflow-wrap:anywhere]">
            {application.fullName}
          </div>
          <div className="break-all text-sm text-[#4C4C4C]">
            {application.email}
          </div>
          <div className="mt-1 text-xs text-[#666666]">
            {application.matriculationNumber || '-'}
          </div>
        </td>
        <td className="px-4 py-4">
          <StatusBadge statusKey={application.statusKey} />
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-sm text-[#121212]">
          {formatDate(application.createdAt)}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-sm text-[#121212]">
          {formatWorkingPeriod(application.plannedStartAt)}
        </td>
        <td className="max-w-[20rem] px-4 py-4">
          <p className="line-clamp-2 text-sm leading-6 text-[#4C4C4C]">
            {application.motivation}
          </p>
          <button
            type="button"
            onClick={() => toggleExpanded(application.id)}
            className="mt-1 text-xs font-semibold text-[#365DD5] hover:text-[#0028A5]"
          >
            {isExpanded ? 'Hide full motivation' : 'Show full motivation'}
          </button>
        </td>
        <td className="px-4 py-4">
          <AttachmentLinks attachments={application.attachments} />
        </td>
        <td className="px-4 py-4">
          <ConfirmationModal
            row={application}
            acceptApplication={acceptApplication}
            declineIndividualApplication={declineIndividualApplication}
            proposalDetails={proposal}
            refetch={refetch}
            setFilters={noopSetFilters}
          />
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-[#E9E9E9] bg-[#FAFAFA]">
          <td colSpan={8} className="px-4 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                  Motivation
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#121212]">
                  {application.motivation}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                    Documents
                  </div>
                  <div className="mt-2">
                    <AttachmentLinks attachments={application.attachments} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                      Allow Usage
                    </div>
                    <div className="mt-1 text-sm text-[#121212]">
                      {formatConsent(application.allowUsage)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                      Allow Publication
                    </div>
                    <div className="mt-1 text-sm text-[#121212]">
                      {formatConsent(application.allowPublication)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
