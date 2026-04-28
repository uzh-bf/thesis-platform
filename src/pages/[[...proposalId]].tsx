import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter } from 'next/router'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
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
import { ProposalDetails, ProposalStatusFilter } from 'src/types/app'

interface SelectedProposalDetailsProps {
  proposalDetails: ProposalDetails | null
  refetch: () => void
  setFilters: Dispatch<SetStateAction<{ status: ProposalStatusFilter }>>
}

function SelectedProposalDetails({
  proposalDetails,
  refetch,
  setFilters,
}: SelectedProposalDetailsProps) {
  if (!proposalDetails) {
    return (
      <EmptyState
        title="No Proposal Selected"
        description="Select a proposal from the list to get started."
      />
    )
  }

  return (
    <div>
      <ProposalMeta proposalDetails={proposalDetails} />
      <ProposalApplication
        proposalDetails={proposalDetails}
        refetch={refetch}
        setFilters={setFilters}
      />
      <ProposalFeedback proposalDetails={proposalDetails} />
      <ProposalStatusForm proposalDetails={proposalDetails} />
    </div>
  )
}

export default function Index() {
  const router = useRouter()
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(true)

  const setSelectedProposal = useCallback(
    (proposalId: string | null) => {
      if (!proposalId) return
      setIsMobileDetailsOpen(true)
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
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  useEffect(() => {
    if (isDesktopViewport && !router.query.proposalId && data?.[0]?.id) {
      setSelectedProposal(data[0].id)
    }
  }, [isDesktopViewport, setSelectedProposal, data, router.query.proposalId])

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

            <div className="hidden rounded-lg border border-[#E9E9E9] bg-white shadow-sm lg:sticky lg:top-[10rem] lg:block lg:max-h-[calc(100vh-11.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
              <SelectedProposalDetails
                proposalDetails={proposalDetails}
                refetch={refetch}
                setFilters={setFilters}
              />
            </div>
          </div>
        )}
      </section>

      {proposalDetails && isMobileDetailsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FAFAFA] lg:hidden">
          <div className="sticky top-0 z-10 border-b border-[#E9E9E9] bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setIsMobileDetailsOpen(false)}
              className="inline-flex items-center gap-2 rounded-[4px] border border-[#0028A5] bg-white px-3 py-2 text-sm font-semibold text-[#0028A5]"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to proposals
            </button>
          </div>
          <div className="p-4">
            <div className="rounded-lg border border-[#E9E9E9] bg-white shadow-sm">
              <SelectedProposalDetails
                proposalDetails={proposalDetails}
                refetch={refetch}
                setFilters={setFilters}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
