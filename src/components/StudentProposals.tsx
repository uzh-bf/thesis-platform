import { H2, H3 } from '@uzh-bf/design-system'
import { useMemo } from 'react'
import { getTopicAreaVisual } from 'src/lib/topicAreaVisuals'
import { trpc } from 'src/lib/trpc'
import { ProposalDetails } from 'src/types/app'
import { twMerge } from 'tailwind-merge'
import ProposalCard from './ProposalCard'

interface StudentProposalsProps {
  data: ProposalDetails[]
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
}

export default function StudentProposals({
  data,
  selectedProposal,
  setSelectedProposal,
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
      <div className="border-b border-[#E9E9E9] pb-5">
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
            .map((topicArea) => {
              const visual = getTopicAreaVisual(topicArea.name)
              const proposals = groupedStudentProposals?.[topicArea.name] ?? []

              return (
                <div
                  key={topicArea.id}
                  className={twMerge(
                    'mt-6 border-l-4 py-2 pl-3 first:mt-0',
                    visual.sectionBorder
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={twMerge(
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1',
                        visual.badge
                      )}
                    >
                      {visual.label}
                    </span>
                    <H3
                      className={{
                        root: 'm-0 min-w-0 flex-1 text-lg font-semibold leading-7 text-[#121212]',
                      }}
                    >
                      {topicArea.name}
                    </H3>
                    <span className="ml-auto shrink-0 text-xs font-semibold text-[#4C4C4C]">
                      {proposals.length}{' '}
                      {proposals.length === 1 ? 'proposal' : 'proposals'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {proposals.map((proposal: any) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        isActive={selectedProposal === proposal.id}
                        onClick={() => setSelectedProposal(proposal.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
        )}
      </div>
    </div>
  )
}
