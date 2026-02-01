import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, Select, TabContent, Tabs } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AdminInfoOverview from 'src/components/AdminInfoOverview'
import AdminStatsDashboard from 'src/components/AdminStatsDashboard'
import { ProposalStatus, ProposalType } from 'src/lib/constants'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'

export default function AdminPanel() {
  const router = useRouter()
  const { data: session } = useSession()
  const { isAdmin } = useUserRole()
  const isAdminOnly = session?.user?.adminRole === 'ADMIN'
  const [activeTab, setActiveTab] = useState('proposals')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [typeFilter, setTypeFilter] = useState('STUDENT')
  const [selectedProposal, setSelectedProposal] = useState<any>(null)

  const { data: proposals, isLoading, refetch } = trpc.adminGetAllProposals.useQuery({
    search,
    statusFilter,
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

  useEffect(() => {
    if (!session?.user) {
      router.push('/')
      return
    }
    
    if (!isAdmin) {
      router.push('/')
      alert('Admin access required')
    }
  }, [session, isAdmin, router])

  useEffect(() => {
    if (!router.isReady) return
    if (router.query.tab === 'admininfo') {
      setActiveTab('admininfo')
    }
    if (router.query.tab === 'stats' && isAdminOnly) {
      setActiveTab('stats')
    }
  }, [router.isReady, router.query.tab, isAdminOnly])

  useEffect(() => {
    if (!isAdminOnly && activeTab === 'stats') {
      setActiveTab('proposals')
    }
  }, [isAdminOnly, activeTab])

  if (!session?.user || !isAdmin) {
    return null
  }

  const handleWithdraw = (proposalId: string, title: string) => {
    if (confirm(`Are you sure you want to withdraw the proposal: "${title}"?`)) {
      withdrawProposal.mutate({ proposalId })
    }
  }

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    ...Object.values(ProposalStatus).map(status => ({
      value: status,
      label: status.replace(/_/g, ' '),
    })),
  ]

  const typeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: ProposalType.STUDENT, label: 'Student Proposals' },
    { value: ProposalType.SUPERVISOR, label: 'Supervisor Proposals' },
  ]

  const filteredProposals = proposals?.filter(p => {
    if (typeFilter !== 'ALL' && p.typeKey !== typeFilter) {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={() => router.push('/')}
              className={{ root: 'flex items-center gap-2' }}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Overview
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage proposals and administrative tasks
          </p>
        </div>

        <Tabs
          defaultValue="proposals"
          value={activeTab}
          onValueChange={(newValue) => {
            setActiveTab(newValue)
            if (newValue !== 'proposals') {
              setSelectedProposal(null)
            }
          }}
          tabs={[
            {
              id: 'admin-tabs-proposals',
              value: 'proposals',
              label: 'Proposals',
            },
            {
              id: 'admin-tabs-admininfo',
              value: 'admininfo',
              label: 'AdminInfo',
            },
            ...(isAdminOnly
              ? [
                  {
                    id: 'admin-tabs-stats',
                    value: 'stats',
                    label: 'Statistics',
                  },
                ]
              : []),
          ]}
        >
          <TabContent value="proposals" className={{ root: 'pt-6' }}>
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, email, or student..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposal Type
                  </label>
                  <Select
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(value as string)}
                    items={typeOptions}
                    className={{ root: 'w-full' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Filter
                  </label>
                  <Select
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as string)}
                    items={statusOptions}
                    className={{ root: 'w-full' }}
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">Loading proposals...</p>
              </div>
            ) : !filteredProposals || filteredProposals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">No proposals found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProposals.map((proposal) => (
                        <tr key={proposal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {proposal.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {proposal.topicArea.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                proposal.type.key === 'STUDENT'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {proposal.type.key}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {proposal.type.key === 'STUDENT' &&
                              proposal.applications?.[0]
                                ? proposal.applications[0].email
                                : proposal.ownedByUser?.email ||
                                  proposal.ownedByStudent ||
                                  'N/A'}
                            </div>
                            {proposal.type.key === 'STUDENT' &&
                              proposal.applications?.[0] && (
                                <div className="text-xs text-gray-500">
                                  {proposal.applications[0].fullName}
                                </div>
                              )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      ))}
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
                      <p className="text-sm font-medium text-gray-500">
                        {selectedProposal.type.key === 'STUDENT'
                          ? 'Student Applicant'
                          : 'Owner'}
                      </p>
                      {selectedProposal.type.key === 'STUDENT' &&
                      selectedProposal.applications?.[0] ? (
                        <div className="mt-1">
                          <p className="text-sm text-gray-900">
                            {selectedProposal.applications[0].fullName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedProposal.applications[0].email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Matric:{' '}
                            {selectedProposal.applications[0].matriculationNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedProposal.ownedByUser?.email ||
                            selectedProposal.ownedByStudent ||
                            'N/A'}
                        </p>
                      )}
                    </div>

                    {selectedProposal.supervisedBy?.[0]?.supervisor && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Supervisor</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedProposal.supervisedBy[0].supervisor.email}
                        </p>
                      </div>
                    )}

                    {selectedProposal.type.key === 'STUDENT' &&
                      selectedProposal.applications?.[0] && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Planned Start</p>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(
                              selectedProposal.applications[0].plannedStartAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                    {selectedProposal.type.key === 'STUDENT' &&
                      selectedProposal.applications?.[0]?.motivation && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Motivation</p>
                          <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                            {selectedProposal.applications[0].motivation}
                          </p>
                        </div>
                      )}

                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedProposal.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Language</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedProposal.language}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Study Level</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedProposal.studyLevel}
                        </p>
                      </div>
                    </div>

                    {selectedProposal.timeFrame && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Time Frame</p>
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
                          handleWithdraw(selectedProposal.id, selectedProposal.title)
                          setSelectedProposal(null)
                        }}
                        disabled={withdrawProposal.isPending}
                        className={{ root: 'text-sm bg-red-600 hover:bg-red-700' }}
                      >
                        Withdraw
                      </Button>
                    </div>
                  )}
                </div>
              </Modal>
            )}
          </TabContent>

          <TabContent value="admininfo" className={{ root: 'pt-6' }}>
            <AdminInfoOverview />
          </TabContent>

          {isAdminOnly && (
            <TabContent value="stats" className={{ root: 'pt-6' }}>
              <AdminStatsDashboard />
            </TabContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
