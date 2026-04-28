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
    return [
      ...data.filter((proposal) => proposal.typeKey === 'SUPERVISOR'),
    ].sort((a, b) => {
      const createdAtCompare =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

      if (createdAtCompare !== 0) {
        return createdAtCompare
      }

      return a.title.localeCompare(b.title)
    })
  }, [data])

  return (
    <div>
      <div className="border-b border-[#E9E9E9] pb-5">
        <H2
          className={{
            root: 'mb-1 text-[26px] font-semibold leading-tight text-[#121212]',
          }}
        >
          Supervisor Proposals
        </H2>
        <p className="text-sm text-[#4C4C4C]">
          Topics published by supervisors for student applications.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-3">
        {sortedSupervisorProposals.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#C2C2C2] bg-[#FAFAFA] p-6 text-center text-[#4C4C4C] sm:col-span-2 xl:col-span-3">
            No supervisor proposals available.
          </div>
        )}
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
