import { Select } from '@uzh-bf/design-system'
import { useRouter } from 'next/router'
import { useMemo, useRef, useState } from 'react'
import ProposalApplication from 'src/components/ProposalApplication'
import ProposalFeedback from 'src/components/ProposalFeedback'
import ProposalMeta from 'src/components/ProposalMeta'
import ProposalStatusForm from 'src/components/ProposalStatusForm'
import StudentProposals from 'src/components/StudentProposals'
import SupervisorProposals from 'src/components/SupervisorProposals'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'
import { ProposalStatusFilter } from 'src/types/app'

export default function Index() {
  const router = useRouter()
  const buttonRef = useRef<null | HTMLDivElement>(null)

  const [filters, setFilters] = useState<{
    status: ProposalStatusFilter
  }>({
    status: ProposalStatusFilter.ALL_PROPOSALS,
  })

  const { isAdmin, isStudent, isSupervisor } = useUserRole()

  const { data, isLoading, isError, isFetching } = trpc.proposals.useQuery({
    filters,
  })

  const [selectedProposal, setSelectedProposal] = useState<string | null>(
    (router?.query?.proposalId as string) ?? null
  )

  const proposalDetails = useMemo(() => {
    if (!selectedProposal) {
      setSelectedProposal(data?.[0]?.id as string)
      return
    }

    return data?.find((p) => p.id === selectedProposal)
  }, [data, selectedProposal])

  if (isLoading) {
    return <div className="p-2">Loading 🔄🚀</div>
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-2 m-4 md:grid-cols-2">
      <div className="flex-initial pb-4 space-y-4 md:flex-1">
        {isSupervisor && (
          <Select
            value={filters.status}
            items={[
              {
                value: ProposalStatusFilter.ALL_PROPOSALS,
                label: 'All Proposals',
              },
              {
                value: ProposalStatusFilter.OPEN_PROPOSALS,
                label: 'Open Proposals',
              },
              {
                value: ProposalStatusFilter.MY_PROPOSALS,
                label: 'My Proposals',
              },
              {
                value: ProposalStatusFilter.TENTATIVELY_ACCEPTED_PROPOSALS,
                label: 'Tentatively Accepted Proposals',
              },
              {
                value: ProposalStatusFilter.REJECTED_PROPOSALS,
                label: 'Rejected Proposals',
              },
              {
                value: ProposalStatusFilter.DECLINED_PROPOSALS,
                label: 'Declined Proposals',
              },
            ]}
            onChange={(newStatus: string) => {
              setFilters({ status: newStatus as ProposalStatusFilter })
              setSelectedProposal(null)
            }}
          />
        )}

        {isSupervisor && (
          <StudentProposals
            data={data}
            selectedProposal={selectedProposal}
            setSelectedProposal={setSelectedProposal}
            buttonRef={buttonRef}
          />
        )}

        <SupervisorProposals
          isSupervisor={isSupervisor}
          data={data}
          selectedProposal={selectedProposal}
          setSelectedProposal={setSelectedProposal}
          buttonRef={buttonRef}
        />
      </div>

      <div className="mb-4 border shadow" ref={buttonRef}>
        {!selectedProposal && <div className="p-4">No proposal selected</div>}
        {proposalDetails && (
          <>
            <ProposalMeta proposalDetails={proposalDetails} />
            <ProposalApplication
              proposalDetails={proposalDetails}
              isStudent={isStudent}
              isSupervisor={isSupervisor}
            />
            <ProposalFeedback
              proposalDetails={proposalDetails}
              isSupervisor={isSupervisor}
              isAdmin={isAdmin}
            />
            <ProposalStatusForm proposalDetails={proposalDetails} />
          </>
        )}
      </div>
    </div>
  )
}
