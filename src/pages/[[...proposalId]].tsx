import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
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
    status: ProposalStatusFilter.OPEN_PROPOSALS,
  })

  const { isAdmin, isStudent, isSupervisor } = useUserRole()

  const { data, isLoading, isError, isFetching } = trpc.proposals.useQuery({
    filters,
  })

  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)

  useEffect(() => {
    if (router.query.proposalId) {
      setSelectedProposal(router.query.proposalId[0] as string)
    } else {
      setSelectedProposal(data?.[0]?.id as string)
    }
  }, [data, router.query.proposalId])

  useEffect(() => {
    if (selectedProposal) {
      router.push(`/${selectedProposal}`)
    } else {
      setSelectedProposal(data?.[0]?.id as string)
    }
  }, [selectedProposal])

  const proposalDetails = data?.find((p) => p.id === selectedProposal) || null

  if (isLoading) {
    return <div className="p-2">Loading 🔄🚀</div>
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-2 m-4 md:grid-cols-2">
      <div className="flex-initial pb-4 space-y-4 md:flex-1">
        {isSupervisor && (
          <StudentProposals
            data={data}
            selectedProposal={selectedProposal}
            setSelectedProposal={setSelectedProposal}
            buttonRef={buttonRef}
            filters={filters}
            setFilters={setFilters}
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
        {!proposalDetails && <div className="p-4">No Proposal Selected</div>}
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
