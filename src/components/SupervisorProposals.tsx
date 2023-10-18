import { H2 } from '@uzh-bf/design-system'
import ProposalCard from './ProposalCard'

export default function SupervisorProposals({
  isSupervisor,
  data,
  selectedProposal,
  setSelectedProposal,
  setDisplayMode,
  buttonRef,
}) {
  return (
    <div>
      {isSupervisor && <H2>Supervisor Proposals</H2>}
      <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
        {data?.filter((proposal) => proposal.typeKey === 'SUPERVISOR')
          .length === 0 && <div>No supervisor proposals available...</div>}
        {data
          ?.filter((proposal) => proposal.typeKey === 'SUPERVISOR')
          .map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isActive={selectedProposal === proposal.id}
              onClick={() => {
                setSelectedProposal(proposal.id), setDisplayMode('details')
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
