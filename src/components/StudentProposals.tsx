import { H2, H3, Select } from '@uzh-bf/design-system'
import { RefObject, useMemo } from 'react'
import { ProposalDetails, ProposalStatusFilter } from 'src/types/app'
import ProposalCard from './ProposalCard'
import { trpc } from 'src/lib/trpc'

interface StudentProposalsProps {
  data: ProposalDetails[]
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
  buttonRef: RefObject<HTMLDivElement>
  filters: {
    status: ProposalStatusFilter
  }
  setFilters: (filters: { status: ProposalStatusFilter }) => void
}

export default function StudentProposals({
  data,
  selectedProposal,
  setSelectedProposal,
  buttonRef,
  filters,
  setFilters,
}: StudentProposalsProps) {
  // Fetch topic areas from the database
  const { data: topicAreas, isLoading: isLoadingTopicAreas } =
    trpc.getTopicAreas.useQuery()

  const groupedStudentProposals = useMemo(() => {
    const grouped: Record<string, ProposalDetails[]> = {}

    for (const proposal of data.filter((item) => item.typeKey === 'STUDENT')) {
      const topicAreaName = proposal.topicArea.name

      if (!grouped[topicAreaName]) {
        grouped[topicAreaName] = []
      }

      grouped[topicAreaName].push(proposal)
    }

    for (const proposals of Object.values(grouped)) {
      proposals.sort((a, b) => {
        const createdAtCompare =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

        if (createdAtCompare !== 0) {
          return createdAtCompare
        }

        return a.title.localeCompare(b.title)
      })
    }

    return grouped
  }, [data])

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[#E9E9E9] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <H2
            className={{
              root: 'mb-1 text-[26px] font-semibold leading-tight text-[#121212]',
            }}
          >
            Student Proposals
          </H2>
          <p className="text-sm text-[#4C4C4C]">
            Submissions from students grouped by field of research.
          </p>
        </div>
        <Select
          className={{
            root: 'w-full justify-end md:w-auto',
            trigger:
              'h-10 w-full rounded-[4px] border-[#E9E9E9] text-sm md:w-72',
          }}
          value={filters.status}
          items={[
            {
              value: ProposalStatusFilter.OPEN_PROPOSALS,
              label: 'Open Proposals',
            },
            {
              value: ProposalStatusFilter.MY_PROPOSALS,
              label: 'My Proposals',
            },
            {
              value: ProposalStatusFilter.ACTIVE_PROPOSALS,
              label: 'My Active Proposals',
            },
            {
              value: ProposalStatusFilter.REJECTED_AND_DECLINED_PROPOSALS,
              label: 'Rejected / Declined Proposals',
            },
            {
              value: ProposalStatusFilter.ALL_PROPOSALS,
              label: 'All Proposals',
            },
          ]}
          onChange={(newStatus: string) => {
            setFilters({ status: newStatus as ProposalStatusFilter })
            setSelectedProposal(null)
          }}
        />
      </div>
      <div className="pt-5 text-base">
        {data?.filter((proposal: any) => proposal.typeKey === 'STUDENT')
          .length === 0 && (
          <div className="rounded-lg border border-dashed border-[#C2C2C2] bg-[#FAFAFA] p-6 text-center text-[#4C4C4C]">
            No student proposals available.
          </div>
        )}

        {isLoadingTopicAreas ? (
          <div className="text-[#4C4C4C]">Loading topic areas...</div>
        ) : (
          (topicAreas || [])
            .filter(
              (topicArea) =>
                groupedStudentProposals?.[topicArea.name]?.length > 0
            )
            .map((topicArea) => (
              <div key={topicArea.id} className="mt-6 first:mt-0">
                <H3
                  className={{
                    root: 'mb-3 text-lg font-semibold leading-7 text-[#121212]',
                  }}
                >
                  {topicArea.name}
                </H3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {groupedStudentProposals?.[topicArea.name]?.map(
                    (proposal: any) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        isActive={selectedProposal === proposal.id}
                        onClick={() => {
                          setSelectedProposal(proposal.id)
                          buttonRef?.current?.scrollIntoView({
                            behavior: 'smooth',
                          })
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
