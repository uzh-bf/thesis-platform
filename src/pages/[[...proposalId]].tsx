import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProposalApplication from 'src/components/ProposalApplication'
import ProposalFeedback from 'src/components/ProposalFeedback'
import ProposalMeta from 'src/components/ProposalMeta'
import ProposalStatusForm from 'src/components/ProposalStatusForm'
import StudentProposals from 'src/components/StudentProposals'
import SupervisorProposals from 'src/components/SupervisorProposals'
import LoadingSkeleton from 'src/components/LoadingSkeleton'
import EmptyState from 'src/components/EmptyState'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'
import { ProposalStatusFilter } from 'src/types/app'

export default function Index() {
  const router = useRouter()
  const buttonRef = useRef<null | HTMLDivElement>(null)

  const setSelectedProposal = useCallback(
    (proposalId: string) => {
      router.push(`/${proposalId}`)
    },
    [router]
  )

  const [filters, setFilters] = useState<{
    status: ProposalStatusFilter
  }>({
    status: ProposalStatusFilter.OPEN_PROPOSALS,
  })

  const { isSupervisor, isDeveloper } = useUserRole()

  const { data, isLoading, refetch } = trpc.proposals.useQuery({
    filters,
  })

  useEffect(() => {
    if (!router.query.proposalId && data?.[0]?.id) {
      setSelectedProposal(data[0].id)
    }
  }, [setSelectedProposal, data, router.query.proposalId])

  const { proposalId, proposalDetails } = useMemo(() => {
    if (typeof router.query?.proposalId?.[0] !== 'undefined') {
      return {
        proposalId: router.query.proposalId[0],
        proposalDetails: data
          ? data.find((p) => p.id === router.query.proposalId[0])
          : null,
      }
    }
    return {}
  }, [data, router.query.proposalId])

  useEffect(() => {
    if (router.query.filter) {
      setFilters({
        status: router.query.filter as ProposalStatusFilter,
      })
    }
  }, [router.query.filter])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-6">
            {(isSupervisor || isDeveloper) && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <StudentProposals
                    data={data}
                    selectedProposal={proposalId}
                    setSelectedProposal={setSelectedProposal}
                    buttonRef={buttonRef}
                    filters={filters}
                    setFilters={setFilters}
                  />
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <SupervisorProposals
                  data={data}
                  selectedProposal={proposalId}
                  setSelectedProposal={setSelectedProposal}
                  buttonRef={buttonRef}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow" ref={buttonRef}>
            {!proposalDetails ? (
              <EmptyState
                title="No Proposal Selected"
                description="Select a proposal from the list to get started."
              />
            ) : (
              <div>
                <div>
                  <ProposalMeta proposalDetails={proposalDetails} />
                </div>
                <div>
                  <ProposalApplication
                    proposalDetails={proposalDetails}
                    refetch={refetch}
                    setFilters={setFilters}
                  />
                </div>
                <div>
                  <ProposalFeedback proposalDetails={proposalDetails} />
                </div>
                <div>
                  <ProposalStatusForm proposalDetails={proposalDetails} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
