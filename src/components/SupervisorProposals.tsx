import { H2 } from '@uzh-bf/design-system'
import * as R from 'ramda'
import { RefObject, useMemo } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { ProposalDetails } from 'src/types/app'
import ProposalCard from './ProposalCard'

interface SupervisorProposalsProps {
  data: ProposalDetails[]
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
  buttonRef: RefObject<HTMLButtonElement>
}

export default function SupervisorProposals({
  data,
  selectedProposal,
  setSelectedProposal,
  buttonRef,
}: SupervisorProposalsProps) {
  const { isSupervisor, isDeveloper } = useUserRole()

  const sortedSupervisorProposals = useMemo(() => {
    if (!data) return []

    return R.sortWith([
      R.ascend(R.prop('createdAt')),  // Sort by creation date (oldest first)
      R.ascend(R.prop('title'))       // Then sort by title alphabetically
    ],
    data.filter((proposal: ProposalDetails) => proposal.typeKey === 'SUPERVISOR'))
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
