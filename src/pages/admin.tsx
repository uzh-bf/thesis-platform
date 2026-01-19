import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Select } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ProposalStatus } from 'src/lib/constants'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'

export default function AdminPanel() {
  const router = useRouter()
  const { data: session } = useSession()
  const { isAdmin } = useUserRole()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

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

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        ) : !proposals || proposals.length === 0 ? (
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
                  {proposals.map((proposal) => (
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
                        <span className="text-sm text-gray-900">
                          {proposal.type.key}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          proposal.statusKey === 'WITHDRAWN'
                            ? 'bg-red-100 text-red-800'
                            : proposal.statusKey === 'MATCHED'
                            ? 'bg-green-100 text-green-800'
                            : proposal.statusKey === 'OPEN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {proposal.status.key.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {proposal.ownedByUser?.email || proposal.ownedByStudent || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => router.push(`/${proposal.id}`)}
                            className={{ root: 'text-xs' }}
                          >
                            View
                          </Button>
                          {proposal.statusKey !== ProposalStatus.WITHDRAWN && (
                            <Button
                              onClick={() => handleWithdraw(proposal.id, proposal.title)}
                              disabled={withdrawProposal.isPending}
                              className={{ root: 'text-xs bg-red-600 hover:bg-red-700' }}
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

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Total Proposals: {proposals?.length || 0}
          </h2>
          <div className="text-sm text-gray-600">
            {proposals && (
              <>
                <p>Open: {proposals.filter(p => p.statusKey === ProposalStatus.OPEN).length}</p>
                <p>Matched: {proposals.filter(p => p.statusKey === ProposalStatus.MATCHED).length}</p>
                <p>Withdrawn: {proposals.filter(p => p.statusKey === ProposalStatus.WITHDRAWN).length}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
