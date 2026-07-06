import { H2, H3 } from '@uzh-bf/design-system'
import { useMemo } from 'react'
import { getTopicAreaVisual } from 'src/lib/topicAreaVisuals'
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
  const { groupedProposals, activeTopicAreas, studentProposalsCount } = useMemo(() => {
    const grouped: Record<string, ProposalDetails[]> = {}
    const areas = new Map<string, { id: string; name: string }>()
    let count = 0

    for (const proposal of data) {
      if (proposal.typeKey !== 'STUDENT') continue

      count++
      const topicAreaName = proposal.topicArea.name

      if (!grouped[topicAreaName]) {
        grouped[topicAreaName] = []
      }

      grouped[topicAreaName].push(proposal)

      if (!areas.has(topicAreaName)) {
        areas.set(topicAreaName, {
          id: proposal.topicArea.id,
          name: topicAreaName,
        })
      }
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

    const sortedAreas = Array.from(areas.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return { groupedProposals: grouped, activeTopicAreas: sortedAreas, studentProposalsCount: count }
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
        {studentProposalsCount === 0 && (
          <div className="rounded-lg border border-dashed border-[#C2C2C2] bg-[#FAFAFA] p-6 text-center text-[#4C4C4C]">
            No student proposals available.
          </div>
        )}

        {activeTopicAreas.map((topicArea) => {
          const visual = getTopicAreaVisual(topicArea.name)
          const proposals = groupedProposals[topicArea.name]

          return (
            <div key={topicArea.id} className="mt-6 py-2 first:mt-0">
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
        })}
      </div>
    </div>
  )
}
