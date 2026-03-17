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
  const { data: topicAreas, isLoading: isLoadingTopicAreas } = trpc.getTopicAreas.useQuery()

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
        const createdAtCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

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
      <div className="flex">
        <H2 className={{ root: 'w-1/3' }}>Student Proposals</H2>
        <Select
          className={{
            root: 'w-2/3 justify-end',
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
      <div className="text-base">
        {data?.filter((proposal: any) => proposal.typeKey === 'STUDENT')
          .length === 0 && <div>No student proposals available...</div>}

        {isLoadingTopicAreas ? (
          <div>Loading topic areas...</div>
        ) : (
          (topicAreas || [])
            .filter(
              (topicArea) => groupedStudentProposals?.[topicArea.name]?.length > 0
            )
            .map((topicArea) => (
              <div key={topicArea.id}>
                <H3 className={{ root: 'mt-2' }}>{topicArea.name}</H3>
                <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
                  {groupedStudentProposals?.[topicArea.name]?.map((proposal: any) => (
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
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
