import { Button, Modal, TabContent, Tabs } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
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

export default function AdminPanel() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { isAdmin } = useUserRole()
  const isAdminOnly = session?.user?.adminRole === 'ADMIN'
  const [activeTab, setActiveTab] = useState('proposals')
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedProposal, setSelectedProposal] = useState<any>(null)

  const { data: proposals, isLoading, refetch } = trpc.adminGetAllProposals.useQuery(
    {},
    {
      enabled: isAdminOnly,
    }
  )

  const withdrawProposal = trpc.adminWithdrawProposal.useMutation({
    onSuccess: () => {
      refetch()
      alert('Proposal withdrawn successfully')
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

  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const selectedApplication = selectedProposal
    ? getLinkedApplication(selectedProposal)
    : null
  const selectedSupervisor = selectedProposal?.supervisedBy?.[0]?.supervisor ?? null

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
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Search
                    </label>
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
                  <div className="text-xs text-gray-600 mb-3">
                    {sortedProposals.length} proposals
                  </div>

                  <div className="border border-gray-400 overflow-x-auto">
                    <table className="w-full table-fixed divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                            <button
                              type="button"
                              onClick={() => handleSort('title')}
                              className="inline-flex items-center gap-1 hover:text-gray-700"
                            >
                              Title <span>{getSortIndicator('title')}</span>
                            </button>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                            <button
                              type="button"
                              onClick={() => handleSort('type')}
                              className="inline-flex items-center gap-1 hover:text-gray-700"
                            >
                              Type <span>{getSortIndicator('type')}</span>
                            </button>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                            <button
                              type="button"
                              onClick={() => handleSort('status')}
                              className="inline-flex items-center gap-1 hover:text-gray-700"
                            >
                              Status <span>{getSortIndicator('status')}</span>
                            </button>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                            <button
                              type="button"
                              onClick={() => handleSort('student')}
                              className="inline-flex items-center gap-1 hover:text-gray-700"
                            >
                              Student <span>{getSortIndicator('student')}</span>
                            </button>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                            <button
                              type="button"
                              onClick={() => handleSort('supervisor')}
                              className="inline-flex items-center gap-1 hover:text-gray-700"
                            >
                              Supervisor <span>{getSortIndicator('supervisor')}</span>
                            </button>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                            <button
                              type="button"
                              onClick={() => handleSort('created')}
                              className="inline-flex items-center gap-1 hover:text-gray-700"
                            >
                              Created <span>{getSortIndicator('created')}</span>
                            </button>
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[14%]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedProposals.map((proposal) => {
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
                                {proposal.statusKey !== ProposalStatus.WITHDRAWN && (
                                  <Button
                                    onClick={() =>
                                      handleWithdraw(proposal.id, proposal.title)
                                    }
                                    disabled={withdrawProposal.isPending}
                                    className={{
                                      root: 'text-xs bg-red-600 hover:bg-red-700',
                                    }}
                                  >
                                    Withdraw
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedProposal && (
                <Modal
                  open={true}
                  onClose={() => setSelectedProposal(null)}
                  className={{ content: 'max-w-4xl' }}
                >
                  <div className="p-6">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedProposal.title}
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Type</p>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedProposal.type.key === 'STUDENT'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {selectedProposal.type.key}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedProposal.statusKey === 'WITHDRAWN'
                                ? 'bg-red-100 text-red-800'
                                : selectedProposal.statusKey === 'MATCHED'
                                  ? 'bg-green-100 text-green-800'
                                  : selectedProposal.statusKey === 'OPEN'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {selectedProposal.status.key.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500">Topic Area</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedProposal.topicArea.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500">Student</p>
                        {selectedApplication ? (
                          <div className="mt-1">
                            <p className="text-sm text-gray-900">
                              {selectedApplication.fullName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedApplication.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              Matric: {selectedApplication.matriculationNumber}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">
                            No student matched yet
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500">Supervisor</p>
                        {selectedSupervisor ? (
                          <div className="mt-1">
                            <p className="text-sm text-gray-900">
                              {selectedSupervisor.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedSupervisor.email}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">
                            No supervisor matched yet
                          </p>
                        )}
                      </div>

                      {selectedProposal.type.key === 'STUDENT' &&
                        selectedApplication && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Planned Start
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(
                                selectedApplication.plannedStartAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                      {selectedProposal.type.key === 'STUDENT' &&
                        selectedApplication?.motivation && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Motivation
                            </p>
                            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                              {selectedApplication.motivation}
                            </p>
                          </div>
                        )}

                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedProposal.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Language
                          </p>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedProposal.language}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Study Level
                          </p>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedProposal.studyLevel}
                          </p>
                        </div>
                      </div>

                      {selectedProposal.timeFrame && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Time Frame
                          </p>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedProposal.timeFrame}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-gray-500">Created</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedProposal.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {selectedProposal.attachments?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">
                            Attachments
                          </p>
                          <div className="space-y-1">
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

                    {selectedProposal.statusKey !== ProposalStatus.WITHDRAWN && (
                      <div className="mt-6 flex justify-end">
                        <Button
                          onClick={() => {
                            handleWithdraw(
                              selectedProposal.id,
                              selectedProposal.title
                            )
                            setSelectedProposal(null)
                          }}
                          disabled={withdrawProposal.isPending}
                          className={{
                            root: 'text-sm bg-red-600 hover:bg-red-700',
                          }}
                        >
                          Withdraw
                        </Button>
                      </div>
                    )}
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
