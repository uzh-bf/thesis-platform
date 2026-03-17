import { H2 } from '@uzh-bf/design-system'
import { RefObject, useMemo } from 'react'
import { ProposalDetails } from 'src/types/app'
import ProposalCard from './ProposalCard'

interface SupervisorProposalsProps {
  data: ProposalDetails[]
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
  buttonRef: RefObject<HTMLDivElement>
}

export default function SupervisorProposals({
  data,
  selectedProposal,
  setSelectedProposal,
  buttonRef,
}: SupervisorProposalsProps) {
  const sortedSupervisorProposals = useMemo(() => {
    return [...data.filter((proposal) => proposal.typeKey === 'SUPERVISOR')].sort(
      (a, b) => {
        const createdAtCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

        if (createdAtCompare !== 0) {
          return createdAtCompare
        }

        return a.title.localeCompare(b.title)
      }
    )
  }, [data])

  return (
    <div>
      <H2 className={{ root: 'mt-2 mb-4' }}>Supervisor Proposals</H2>
      <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
        {sortedSupervisorProposals.length === 0 && <div>No supervisor proposals available...</div>}
        {sortedSupervisorProposals.map((proposal: ProposalDetails) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            isActive={selectedProposal === proposal.id}
            onClick={() => {
              setSelectedProposal(proposal.id)
              buttonRef.current?.scrollIntoView({
                behavior: 'smooth',
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}
