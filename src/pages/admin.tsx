import {
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, TabContent, Tabs } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import AdminInfoOverview from 'src/components/AdminInfoOverview'
import AdminStatsDashboard from 'src/components/AdminStatsDashboard'
import AdminUserRoles from 'src/components/AdminUserRoles'
import { ProposalStatus } from 'src/lib/constants'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'

type SortColumn =
  | 'title'
  | 'type'
  | 'status'
  | 'student'
  | 'supervisor'
  | 'created'
type SortDirection = 'asc' | 'desc'
type PageSizeOption = 20 | 50 | 100 | 'all'

const PAGE_SIZE_OPTIONS: PageSizeOption[] = [20, 50, 100, 'all']

export default function AdminPanel() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { isAdmin } = useUserRole()
  const isAdminOnly = session?.user?.adminRole === 'ADMIN'
  const [activeTab, setActiveTab] = useState('proposals')
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [rowsPerPage, setRowsPerPage] = useState<PageSizeOption>(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProposal, setSelectedProposal] = useState<any>(null)
  const [selectedSupervisorEmail, setSelectedSupervisorEmail] = useState('')
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)
  const [supervisorDropdownSearch, setSupervisorDropdownSearch] = useState('')
  const supervisorDropdownRef = useRef<HTMLDivElement | null>(null)
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('')
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false)
  const [responsibleDropdownSearch, setResponsibleDropdownSearch] = useState('')
  const responsibleDropdownRef = useRef<HTMLDivElement | null>(null)

  const { data: proposals, isLoading, refetch } = trpc.adminGetAllProposals.useQuery(
    {},
    {
      enabled: isAdminOnly,
    }
  )

  const { data: supervisors } = trpc.getAllSupervisors.useQuery(undefined, {
    enabled: isAdminOnly,
  })

  const { data: responsibles } = trpc.getAllPersonsResponsible.useQuery(undefined, {
    enabled: isAdminOnly,
  })

  const withdrawProposal = trpc.adminWithdrawProposal.useMutation({
    onSuccess: () => {
      refetch()
      alert('Proposal withdrawn successfully')
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  const assignSupervisor = trpc.adminAssignSupervisorToStudentProposal.useMutation({
    onSuccess: (_, variables) => {
      void refetch().then((result) => {
        const updatedProposal = result.data?.find((p) => p.id === variables.proposalId)
        if (!updatedProposal) return

        setSelectedProposal(updatedProposal)
        setSelectedSupervisorEmail(
          updatedProposal.supervisedBy?.[0]?.supervisor?.email ?? variables.supervisorEmail
        )
        setSelectedResponsibleId(
          updatedProposal.supervisedBy?.[0]?.responsibleId ?? variables.responsibleId
        )
      })

      alert('Assignment saved successfully')
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/')
      return
    }
    
    if (!isAdmin) {
      router.push('/')
      alert('Admin access required')
    }
  }, [session, isAdmin, router, status])

  useEffect(() => {
    if (!router.isReady) return
    if (router.query.tab === 'admininfo') {
      setActiveTab('admininfo')
    }
    if (router.query.tab === 'users' && isAdminOnly) {
      setActiveTab('users')
    }
    if (router.query.tab === 'stats' && isAdminOnly) setActiveTab('stats')
  }, [router.isReady, router.query.tab, isAdminOnly])

  useEffect(() => {
    if (!isAdminOnly && activeTab !== 'admininfo') {
      setActiveTab('admininfo')
    }
  }, [isAdminOnly, activeTab])

  useEffect(() => {
    setSelectedSupervisorEmail(
      selectedProposal?.supervisedBy?.[0]?.supervisor?.email ?? ''
    )
    setSelectedResponsibleId(selectedProposal?.supervisedBy?.[0]?.responsibleId ?? '')
    setIsSupervisorDropdownOpen(false)
    setIsResponsibleDropdownOpen(false)
    setSupervisorDropdownSearch('')
    setResponsibleDropdownSearch('')
  }, [selectedProposal])

  useEffect(() => {
    if (!isSupervisorDropdownOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!supervisorDropdownRef.current) return
      if (supervisorDropdownRef.current.contains(event.target as Node)) return

      setIsSupervisorDropdownOpen(false)
      setSupervisorDropdownSearch('')
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSupervisorDropdownOpen])

  useEffect(() => {
    if (!isResponsibleDropdownOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!responsibleDropdownRef.current) return
      if (responsibleDropdownRef.current.contains(event.target as Node)) return

      setIsResponsibleDropdownOpen(false)
      setResponsibleDropdownSearch('')
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isResponsibleDropdownOpen])

  if (!session?.user || !isAdmin) {
    return null
  }

  const visibleTabs = isAdminOnly
    ? [
        {
          id: 'admin-tabs-proposals',
          value: 'proposals',
          label: 'Proposals',
        },
        {
          id: 'admin-tabs-admininfo',
          value: 'admininfo',
          label: 'Admin Info',
        },
        {
          id: 'admin-tabs-users',
          value: 'users',
          label: 'Users',
        },
        {
          id: 'admin-tabs-stats',
          value: 'stats',
          label: 'Statistics',
        },
      ]
    : [
        {
          id: 'admin-tabs-admininfo',
          value: 'admininfo',
          label: 'Admin Info',
        },
      ]

  const resolvedActiveTab = visibleTabs.some((t) => t.value === activeTab)
    ? activeTab
    : 'admininfo'

  const handleWithdraw = (proposalId: string, title: string) => {
    if (confirm(`Are you sure you want to withdraw the proposal: "${title}"?`)) {
      withdrawProposal.mutate({ proposalId })
    }
  }

  const handleAssignSupervisor = () => {
    if (!selectedProposal) return

    if (!supervisors?.length) {
      alert('Supervisor list is still loading.')
      return
    }

    if (!responsibles?.length) {
      alert('Responsible list is still loading.')
      return
    }

    const supervisorEmail = selectedSupervisorEmail.trim()
    const responsibleId = selectedResponsibleId.trim()

    if (!responsibleId) {
      alert('Please select a person responsible from the list.')
      return
    }

    const supervisorExists = supervisors.some((supervisor) =>
      supervisor.email.toLowerCase() === supervisorEmail.toLowerCase()
    )
    const responsibleExists = responsibles.some(
      (responsible) => responsible.id === responsibleId
    )

    if (!supervisorExists) {
      alert('Please select a supervisor from the list.')
      return
    }

    if (!responsibleExists) {
      alert('Please select a person responsible from the list.')
      return
    }

    setIsSupervisorDropdownOpen(false)
    setIsResponsibleDropdownOpen(false)
    setSupervisorDropdownSearch('')
    setResponsibleDropdownSearch('')

    assignSupervisor.mutate({
      proposalId: selectedProposal.id,
      supervisorEmail,
      responsibleId,
    })
  }

  const selectedSupervisorOption =
    !selectedSupervisorEmail || !supervisors?.length
      ? null
      : supervisors.find(
          (supervisor) =>
            supervisor.email.toLowerCase() === selectedSupervisorEmail.toLowerCase()
        ) ?? null

  const normalizedSupervisorSearch = supervisorDropdownSearch.trim().toLowerCase()
  const filteredSupervisorOptions = (supervisors ?? []).filter((supervisor) => {
    if (!normalizedSupervisorSearch) return true

    const normalizedName = (supervisor.name ?? '').toLowerCase()

    return (
      normalizedName.includes(normalizedSupervisorSearch) ||
      supervisor.email.toLowerCase().includes(normalizedSupervisorSearch)
    )
  })

  const selectedResponsibleOption =
    !selectedResponsibleId || !responsibles?.length
      ? null
      : responsibles.find((responsible) => responsible.id === selectedResponsibleId) ?? null

  const normalizedResponsibleSearch = responsibleDropdownSearch.trim().toLowerCase()
  const filteredResponsibleOptions = (responsibles ?? []).filter((responsible) => {
    if (!normalizedResponsibleSearch) return true

    const normalizedName = (responsible.name ?? '').toLowerCase()

    return (
      normalizedName.includes(normalizedResponsibleSearch) ||
      responsible.email.toLowerCase().includes(normalizedResponsibleSearch)
    )
  })

  const canSaveAssignment =
    !assignSupervisor.isPending &&
    !!selectedSupervisorOption &&
    !!selectedResponsibleOption

  const getLinkedApplication = (proposal: any) => {
    const isOpenSupervisorProposal =
      proposal.type?.key === 'SUPERVISOR' &&
      proposal.statusKey === ProposalStatus.OPEN

    if (isOpenSupervisorProposal) {
      return null
    }

    const applications = proposal.applications ?? []
    if (!applications.length) return null

    const supervisionId = proposal.supervisedBy?.[0]?.id
    if (!supervisionId) {
      return applications[0]
    }

    return (
      applications.find((app: any) => app.supervisionId === supervisionId) ??
      applications[0]
    )
  }

  const getStudentFullName = (proposal: any) =>
    getLinkedApplication(proposal)?.fullName ?? null

  const getSupervisorFullName = (proposal: any) =>
    proposal.supervisedBy?.[0]?.supervisor?.name ?? null

  const normalizedSearch = search.trim().toLowerCase()

  const filteredProposals = proposals?.filter((p) => {
    const visibleStatuses = [
      ProposalStatus.OPEN,
      ProposalStatus.MATCHED,
      ProposalStatus.MATCHED_TENTATIVE,
    ]

    if (!visibleStatuses.includes(p.statusKey as ProposalStatus)) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const titleMatch = p.title.toLowerCase().includes(normalizedSearch)
    const studentNameMatch = (getStudentFullName(p) ?? '')
      .toLowerCase()
      .includes(normalizedSearch)
    const supervisorNameMatch = (getSupervisorFullName(p) ?? '')
      .toLowerCase()
      .includes(normalizedSearch)

    return titleMatch || studentNameMatch || supervisorNameMatch
  })

  const formatDateShort = (date: string | Date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })

  const sortedProposals = (() => {
    if (!filteredProposals) return []

    return [...filteredProposals].sort((a, b) => {
      let compareValue = 0

      switch (sortColumn) {
        case 'title':
          compareValue = a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
          })
          break
        case 'type':
          compareValue = a.type.key.localeCompare(b.type.key, undefined, {
            sensitivity: 'base',
          })
          break
        case 'status':
          compareValue = a.status.key.localeCompare(b.status.key, undefined, {
            sensitivity: 'base',
          })
          break
        case 'student':
          compareValue = (getStudentFullName(a) ?? '').localeCompare(
            getStudentFullName(b) ?? '',
            undefined,
            {
              sensitivity: 'base',
            }
          )
          break
        case 'supervisor':
          compareValue = (getSupervisorFullName(a) ?? '').localeCompare(
            getSupervisorFullName(b) ?? '',
            undefined,
            {
              sensitivity: 'base',
            }
          )
          break
        case 'created':
          compareValue =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })
  })()

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection(column === 'created' ? 'desc' : 'asc')
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return faSort
    return sortDirection === 'asc' ? faSortUp : faSortDown
  }

  const totalPages =
    rowsPerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(sortedProposals.length / rowsPerPage))

  const effectiveCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProposals =
    rowsPerPage === 'all'
      ? sortedProposals
      : sortedProposals.slice(
          (effectiveCurrentPage - 1) * rowsPerPage,
          effectiveCurrentPage * rowsPerPage
        )

  const visibleStart =
    sortedProposals.length === 0
      ? 0
      : rowsPerPage === 'all'
        ? 1
        : (effectiveCurrentPage - 1) * rowsPerPage + 1

  const visibleEnd =
    rowsPerPage === 'all'
      ? sortedProposals.length
      : Math.min(effectiveCurrentPage * rowsPerPage, sortedProposals.length)

  const selectedApplication = selectedProposal
    ? getLinkedApplication(selectedProposal)
    : null
  const selectedSupervisor = selectedProposal?.supervisedBy?.[0]?.supervisor ?? null
  const selectedProposalType = selectedProposal?.type?.key
  const selectedProposalStatus = selectedProposal?.statusKey as ProposalStatus | undefined

  const canAdjustSupervisor =
    selectedProposalType === 'STUDENT' &&
    [
      ProposalStatus.OPEN,
      ProposalStatus.MATCHED,
      ProposalStatus.MATCHED_TENTATIVE,
    ].includes(selectedProposalStatus as ProposalStatus)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {visibleTabs.length > 1 ? (
          <Tabs
            defaultValue={isAdminOnly ? 'proposals' : 'admininfo'}
            value={resolvedActiveTab}
            onValueChange={(newValue) => {
              setActiveTab(newValue)
              if (newValue !== 'proposals') {
                setSelectedProposal(null)
              }
            }}
            tabs={visibleTabs}
          >
          {isAdminOnly && (
            <TabContent value="proposals" className={{ root: 'pt-3' }}>
              <div className="bg-white rounded-lg shadow mb-4 p-4">
                <div className="grid grid-cols-1">
                  <div>
                    <div className="mb-0.5 flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-700">
                        Search
                      </label>
                      <div className="text-xs text-gray-600">
                        {sortedProposals.length} proposals
                      </div>
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by title, student name, or supervisor name..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <p className="text-gray-600">Loading proposals...</p>
                </div>
              ) : !filteredProposals || filteredProposals.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <p className="text-gray-600">No proposals found</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-4">
                  <div
                    className={`border border-gray-400 overflow-x-auto ${
                      rowsPerPage === 20 ? '' : 'max-h-[65vh] overflow-y-auto'
                    }`}
                  >
                    <table className="w-full table-fixed divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th
                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[20%]"
                            onClick={() => handleSort('title')}
                          >
                            <div className="flex items-center gap-2">
                              Title
                              <FontAwesomeIcon
                                icon={getSortIcon('title')}
                                className="text-gray-400"
                              />
                            </div>
                          </th>
                          <th
                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[8%]"
                            onClick={() => handleSort('type')}
                          >
                            <div className="flex items-center gap-2">
                              Type
                              <FontAwesomeIcon
                                icon={getSortIcon('type')}
                                className="text-gray-400"
                              />
                            </div>
                          </th>
                          <th
                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[12%]"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-2">
                              Status
                              <FontAwesomeIcon
                                icon={getSortIcon('status')}
                                className="text-gray-400"
                              />
                            </div>
                          </th>
                          <th
                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[18%]"
                            onClick={() => handleSort('student')}
                          >
                            <div className="flex items-center gap-2">
                              Student
                              <FontAwesomeIcon
                                icon={getSortIcon('student')}
                                className="text-gray-400"
                              />
                            </div>
                          </th>
                          <th
                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[18%]"
                            onClick={() => handleSort('supervisor')}
                          >
                            <div className="flex items-center gap-2">
                              Supervisor
                              <FontAwesomeIcon
                                icon={getSortIcon('supervisor')}
                                className="text-gray-400"
                              />
                            </div>
                          </th>
                          <th
                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[10%]"
                            onClick={() => handleSort('created')}
                          >
                            <div className="flex items-center gap-2">
                              Created
                              <FontAwesomeIcon
                                icon={getSortIcon('created')}
                                className="text-gray-400"
                              />
                            </div>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedProposals.map((proposal) => {
                          const studentName = getStudentFullName(proposal)
                          const supervisorName = getSupervisorFullName(proposal)

                          return (
                            <tr key={proposal.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1 max-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {proposal.title}
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-1.5 py-0.5 text-[11px] font-semibold rounded-full ${
                                    proposal.type.key === 'STUDENT'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {proposal.type.key}
                                </span>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-1.5 py-0.5 text-[11px] font-semibold rounded-full ${
                                    proposal.statusKey === 'WITHDRAWN'
                                      ? 'bg-red-100 text-red-800'
                                      : proposal.statusKey === 'MATCHED'
                                        ? 'bg-green-100 text-green-800'
                                        : proposal.statusKey === 'OPEN'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {proposal.status.key.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-2 py-1 max-w-0">
                                <div className="text-sm text-gray-900 truncate">
                                  {studentName || '-'}
                                </div>
                              </td>
                              <td className="px-2 py-1 max-w-0">
                                <div className="text-sm text-gray-900 truncate">
                                  {supervisorName || '-'}
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500">
                                {formatDateShort(proposal.createdAt)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => setSelectedProposal(proposal)}
                                    className={{ root: 'text-xs' }}
                                  >
                                    View
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-gray-600">
                      Showing {visibleStart}-{visibleEnd} of {sortedProposals.length}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Rows</span>

                      <div className="inline-flex items-center rounded-md border border-gray-300 bg-white p-0.5">
                        {PAGE_SIZE_OPTIONS.map((option) => {
                          const isActive = rowsPerPage === option

                          return (
                            <button
                              key={String(option)}
                              type="button"
                              onClick={() => {
                                setRowsPerPage(option)
                                setCurrentPage(1)
                              }}
                              className={`h-7 min-w-[34px] rounded px-2 text-xs font-medium ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              aria-label={`Show ${option === 'all' ? 'all' : option} rows`}
                            >
                              {option === 'all' ? 'All' : option}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.max(1, Math.min(prev, totalPages) - 1)
                          )
                        }
                        disabled={rowsPerPage === 'all' || effectiveCurrentPage === 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Previous page"
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>

                      <span className="text-xs text-gray-600 min-w-[48px] text-center">
                        {rowsPerPage === 'all'
                          ? '1 / 1'
                          : `${effectiveCurrentPage} / ${totalPages}`}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, Math.min(prev, totalPages) + 1)
                          )
                        }
                        disabled={rowsPerPage === 'all' || effectiveCurrentPage >= totalPages}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Next page"
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedProposal && (
                <Modal
                  open={true}
                  onClose={() => setSelectedProposal(null)}
                  className={{ content: 'max-w-5xl max-h-[95vh] overflow-auto' }}
                >
                  <div className="relative -m-5 -mt-8 p-5 pt-8">
                    <h2 className="text-lg font-bold text-gray-900">Entry Details</h2>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {selectedProposal.title}
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Type</div>
                        <div className="text-sm text-gray-900">{selectedProposal.type.key}</div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Status</div>
                        <div className="text-sm text-gray-900">
                          {selectedProposal.status.key.replace(/_/g, ' ')}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Topic Area
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedProposal.topicArea.name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Student Name
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedApplication?.fullName || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Student Email
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedApplication?.email || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Matriculation Number
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedApplication?.matriculationNumber || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Supervisor
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedSupervisor?.name || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Supervisor Email
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedSupervisor?.email || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Created</div>
                        <div className="text-sm text-gray-900">
                          {formatDateShort(selectedProposal.createdAt)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Language</div>
                        <div className="text-sm text-gray-900">{selectedProposal.language}</div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Study Level
                        </div>
                        <div className="text-sm text-gray-900">{selectedProposal.studyLevel}</div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Time Frame
                        </div>
                        <div className="text-sm text-gray-900">
                          {selectedProposal.timeFrame || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        Proposal Information
                      </h3>

                      {canAdjustSupervisor && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase">
                              Assign Supervisor
                            </div>
                            <div className="mt-1" ref={supervisorDropdownRef}>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSupervisorDropdownOpen((open) => !open)
                                    setIsResponsibleDropdownOpen(false)
                                    setResponsibleDropdownSearch('')
                                  }}
                                  disabled={assignSupervisor.isPending}
                                  className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-left"
                                  aria-haspopup="listbox"
                                  aria-expanded={isSupervisorDropdownOpen}
                                >
                                  <div className="min-w-0 flex-1">
                                    {selectedSupervisorOption ? (
                                      <>
                                        <div className="truncate text-sm text-gray-900">
                                          {selectedSupervisorOption.name ??
                                            selectedSupervisorOption.email}
                                        </div>
                                        <div className="truncate text-xs text-gray-500">
                                          {selectedSupervisorOption.email}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="truncate text-sm text-gray-500">
                                        Select supervisor...
                                      </div>
                                    )}
                                  </div>

                                  <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`text-xs text-gray-500 transition-transform ${
                                      isSupervisorDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {isSupervisorDropdownOpen && (
                                  <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
                                    <div className="border-b border-gray-200 p-2">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={supervisorDropdownSearch}
                                        onChange={(event) =>
                                          setSupervisorDropdownSearch(event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === 'Escape') {
                                            setIsSupervisorDropdownOpen(false)
                                            setSupervisorDropdownSearch('')
                                          }
                                        }}
                                        placeholder="Search supervisor..."
                                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div className="max-h-56 overflow-y-auto py-1">
                                      {filteredSupervisorOptions.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-gray-500">
                                          No supervisors found
                                        </div>
                                      ) : (
                                        filteredSupervisorOptions.map((supervisor) => {
                                          const isSelected =
                                            selectedSupervisorEmail.toLowerCase() ===
                                            supervisor.email.toLowerCase()

                                          return (
                                            <button
                                              key={supervisor.email}
                                              type="button"
                                              onClick={() => {
                                                setSelectedSupervisorEmail(supervisor.email)
                                                setIsSupervisorDropdownOpen(false)
                                                setSupervisorDropdownSearch('')
                                              }}
                                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                                                isSelected ? 'bg-blue-50' : ''
                                              }`}
                                            >
                                              <div className="truncate text-sm text-gray-900">
                                                {supervisor.name ?? supervisor.email}
                                              </div>
                                              <div className="truncate text-xs text-gray-500">
                                                {supervisor.email}
                                              </div>
                                            </button>
                                          )
                                        })
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase">
                              Assign Responsible Person
                            </div>
                            <div className="mt-1" ref={responsibleDropdownRef}>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsResponsibleDropdownOpen((open) => !open)
                                    setIsSupervisorDropdownOpen(false)
                                    setSupervisorDropdownSearch('')
                                  }}
                                  disabled={assignSupervisor.isPending}
                                  className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-left"
                                  aria-haspopup="listbox"
                                  aria-expanded={isResponsibleDropdownOpen}
                                >
                                  <div className="min-w-0 flex-1">
                                    {selectedResponsibleOption ? (
                                      <>
                                        <div className="truncate text-sm text-gray-900">
                                          {selectedResponsibleOption.name ??
                                            selectedResponsibleOption.email}
                                        </div>
                                        <div className="truncate text-xs text-gray-500">
                                          {selectedResponsibleOption.email}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="truncate text-sm text-gray-500">
                                        Select responsible person...
                                      </div>
                                    )}
                                  </div>

                                  <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`text-xs text-gray-500 transition-transform ${
                                      isResponsibleDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {isResponsibleDropdownOpen && (
                                  <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
                                    <div className="border-b border-gray-200 p-2">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={responsibleDropdownSearch}
                                        onChange={(event) =>
                                          setResponsibleDropdownSearch(event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === 'Escape') {
                                            setIsResponsibleDropdownOpen(false)
                                            setResponsibleDropdownSearch('')
                                          }
                                        }}
                                        placeholder="Search responsible person..."
                                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div className="max-h-56 overflow-y-auto py-1">
                                      {filteredResponsibleOptions.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-gray-500">
                                          No responsible persons found
                                        </div>
                                      ) : (
                                        filteredResponsibleOptions.map((responsible) => {
                                          const isSelected =
                                            selectedResponsibleId === responsible.id

                                          return (
                                            <button
                                              key={responsible.id}
                                              type="button"
                                              onClick={() => {
                                                setSelectedResponsibleId(responsible.id)
                                                setIsResponsibleDropdownOpen(false)
                                                setResponsibleDropdownSearch('')
                                              }}
                                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                                                isSelected ? 'bg-blue-50' : ''
                                              }`}
                                            >
                                              <div className="truncate text-sm text-gray-900">
                                                {responsible.name ?? responsible.email}
                                              </div>
                                              <div className="truncate text-xs text-gray-500">
                                                {responsible.email}
                                              </div>
                                            </button>
                                          )
                                        })
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <Button
                              onClick={handleAssignSupervisor}
                              disabled={!canSaveAssignment}
                              className={{ root: 'text-sm whitespace-nowrap' }}
                            >
                              {assignSupervisor.isPending ? 'Saving...' : 'Save assignment'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {selectedProposal.type.key === 'STUDENT' &&
                        selectedApplication?.plannedStartAt && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-gray-500 uppercase">
                              Planned Start
                            </div>
                            <p className="mt-1 text-sm text-gray-900">
                              {formatDateShort(selectedApplication.plannedStartAt)}
                            </p>
                          </div>
                        )}

                      {selectedProposal.type.key === 'STUDENT' &&
                        selectedApplication?.motivation && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-gray-500 uppercase">
                              Motivation
                            </div>
                            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                              {selectedApplication.motivation}
                            </p>
                          </div>
                        )}

                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Description
                        </div>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedProposal.description}
                        </p>
                      </div>

                      {selectedProposal.attachments?.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-gray-500 uppercase">
                            Attachments
                          </div>
                          <div className="mt-1 space-y-1">
                            {selectedProposal.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={att.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-sm text-blue-600 hover:text-blue-800"
                              >
                                {att.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-2">
                      <div>
                        {selectedProposal.statusKey !== ProposalStatus.WITHDRAWN && (
                          <Button
                            onClick={() => {
                              handleWithdraw(selectedProposal.id, selectedProposal.title)
                              setSelectedProposal(null)
                            }}
                            disabled={withdrawProposal.isPending || assignSupervisor.isPending}
                            className={{
                              root: 'text-sm bg-red-600 hover:bg-red-700 text-white',
                            }}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedProposal(null)}
                          className={{ root: 'text-sm' }}
                          disabled={withdrawProposal.isPending || assignSupervisor.isPending}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                </Modal>
              )}
            </TabContent>
          )}

          <TabContent value="admininfo" className={{ root: 'pt-3' }}>
            <AdminInfoOverview />
          </TabContent>

          {isAdminOnly && (
            <TabContent value="users" className={{ root: 'pt-3' }}>
              <AdminUserRoles />
            </TabContent>
          )}

          {isAdminOnly && (
            <TabContent value="stats" className={{ root: 'pt-3' }}>
              <AdminStatsDashboard />
            </TabContent>
          )}
          </Tabs>
        ) : (
          <div className="pt-3">
            <AdminInfoOverview />
          </div>
        )}
      </div>
    </div>
  )
}
