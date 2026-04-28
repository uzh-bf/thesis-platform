import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from 'src/components/EmptyState'
import LoadingSkeleton from 'src/components/LoadingSkeleton'
import ProposalApplication from 'src/components/ProposalApplication'
import ProposalFeedback from 'src/components/ProposalFeedback'
import ProposalMeta from 'src/components/ProposalMeta'
import ProposalStatusForm from 'src/components/ProposalStatusForm'
import StudentProposals from 'src/components/StudentProposals'
import SupervisorProposals from 'src/components/SupervisorProposals'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'
import { ProposalStatusFilter } from 'src/types/app'

export default function Index() {
  const router = useRouter()

  const setSelectedProposal = useCallback(
    (proposalId: string | null) => {
      if (!proposalId) return
      router.push(`/${proposalId}`, undefined, { scroll: false })
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
  const proposals = data ?? []

  useEffect(() => {
    if (!router.query.proposalId && data?.[0]?.id) {
      setSelectedProposal(data[0].id)
    }
  }, [setSelectedProposal, data, router.query.proposalId])

  const { proposalId, proposalDetails } = useMemo(() => {
    const currentProposalId = router.query.proposalId?.[0]

    if (typeof currentProposalId === 'string') {
      return {
        proposalId: currentProposalId,
        proposalDetails: data
          ? (data.find((proposal) => proposal.id === currentProposalId) ?? null)
          : null,
      }
    }

    return {
      proposalId: null,
      proposalDetails: null,
    }
  }, [data, router.query.proposalId])

  useEffect(() => {
    if (router.query.filter) {
      setFilters({
        status: router.query.filter as ProposalStatusFilter,
      })
    }
  }, [router.query.filter])

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section
        id="proposals"
        className="mx-auto w-full max-w-[1240px] px-4 py-10 md:px-10 xl:px-[100px]"
      >
        <div className="mb-6">
          <h2 className="text-[30px] font-semibold leading-tight text-[#121212]">
            Proposals
          </h2>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-6">
              {(isSupervisor || isDeveloper) && (
                <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm">
                  <div className="p-6">
                    <StudentProposals
                      data={proposals}
                      selectedProposal={proposalId}
                      setSelectedProposal={setSelectedProposal}
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm">
                <div className="p-6">
                  <SupervisorProposals
                    data={proposals}
                    selectedProposal={proposalId}
                    setSelectedProposal={setSelectedProposal}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm lg:sticky lg:top-[10rem] lg:max-h-[calc(100vh-11.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
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
        )}
      </section>
    </main>
  )
}
