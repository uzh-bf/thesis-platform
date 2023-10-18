import { H2, H3 } from '@uzh-bf/design-system'
import ProposalCard from './ProposalCard'

export default function StudentProposals({
  isSupervisor,
  data,
  groupedStudentProposals,
  selectedProposal,
  setSelectedProposal,
  setDisplayMode,
  buttonRef,
}) {
  if (isSupervisor) {
    return (
      <div>
        <H2>Student Proposals</H2>
        <div className="text-base">
          {data?.filter((proposal) => proposal.typeKey === 'STUDENT').length ===
            0 && <div>No student proposals available...</div>}

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
                  {groupedStudentProposals?.[topicArea].map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      isActive={selectedProposal === proposal.id}
                      onClick={() => {
                        setSelectedProposal(proposal.id),
                          setDisplayMode('details')
                        buttonRef.current?.scrollIntoView({
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
