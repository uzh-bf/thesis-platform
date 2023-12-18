import { H2, H3, Select } from '@uzh-bf/design-system'
import * as R from 'ramda'
import { RefObject, useMemo } from 'react'
import { ProposalDetails, ProposalStatusFilter } from 'src/types/app'
import ProposalCard from './ProposalCard'

interface StudentProposalsProps {
  data: ProposalDetails[]
  selectedProposal: string | null
  setSelectedProposal: (proposalId: string | null) => void
  buttonRef: RefObject<HTMLButtonElement>
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
  const groupedStudentProposals = useMemo(() => {
    if (!data) return {}

    return R.groupBy<ProposalDetails>(
      (p) => p.topicArea.name,
      R.sortBy(
        R.prop('title'),
        data.filter(
          (proposal: ProposalDetails) => proposal.typeKey === 'STUDENT'
        )
      )
    )
  }, [data])

  return (
    <div>
      <div className="flex items-center justify-between">
        <H2>Student Proposals</H2>
        <Select
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
            setSelectedProposal('')
          }}
        />
      </div>
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
              <H3 className={{ root: 'mt-2' }}>{topicArea}</H3>
              <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
                {groupedStudentProposals?.[topicArea].map((proposal: any) => (
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
          ))}
      </div>
    </div>
  )
}
