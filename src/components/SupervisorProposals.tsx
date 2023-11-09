import { H2 } from '@uzh-bf/design-system'
import { RefObject } from 'react'
import { ProposalDetails } from 'src/types/app'
import ProposalCard from './ProposalCard'

interface SupervisorProposalsProps {
  isSupervisor: boolean
  data: ProposalDetails[]
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
  buttonRef: RefObject<HTMLButtonElement>
}

export default function SupervisorProposals({
  isSupervisor,
  data,
  selectedProposal,
  setSelectedProposal,
  buttonRef,
}: SupervisorProposalsProps) {
  return (
    <div>
      {isSupervisor && (
        <H2 className={{ root: 'mt-2' }}>Supervisor Proposals</H2>
      )}
      <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
        {data?.filter((proposal: any) => proposal.typeKey === 'SUPERVISOR')
          .length === 0 && <div>No supervisor proposals available...</div>}
        {data
          ?.filter((proposal: any) => proposal.typeKey === 'SUPERVISOR')
          .map((proposal: any) => (
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
