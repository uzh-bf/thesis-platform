import { H2, H3 } from '@uzh-bf/design-system'
import { RefObject } from 'react'
import ProposalCard from './ProposalCard'

interface StudentProposalsProps {
  isSupervisor: boolean
  data: any
  groupedStudentProposals: any
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
  setDisplayMode: (displayMode: string) => void
  buttonRef: RefObject<HTMLButtonElement>
}

export default function StudentProposals({
  isSupervisor,
  data,
  groupedStudentProposals,
  selectedProposal,
  setSelectedProposal,
  setDisplayMode,
  buttonRef,
}: StudentProposalsProps) {
  if (isSupervisor) {
    return (
      <div>
        <H2>Student Proposals</H2>
        <div className="text-base">
          {data?.filter((proposal: any) => proposal.typeKey === 'STUDENT')
            .length === 0 && <div>No student proposals available...</div>}

          {[
            'Banking and Insurance',
            'Corporate Finance',
            'Financial Economics',
            'Quantitative Finance',
            'Sustainable Finance',
          ]
            .filter(
              (topicArea) => groupedStudentProposals?.[topicArea]?.length > 0
            )
            .map((topicArea) => (
              <div key={topicArea}>
                <H3>{topicArea}</H3>
                <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
                  {groupedStudentProposals?.[topicArea].map((proposal: any) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      isActive={selectedProposal === proposal.id}
                      onClick={() => {
                        setSelectedProposal(proposal.id),
                          setDisplayMode('details')
                        buttonRef?.current?.scrollIntoView({
                          behavior: 'smooth',
                        })
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  } else {
    return null
  }
}
