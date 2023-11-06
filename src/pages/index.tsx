import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import * as R from 'ramda'
import { useMemo, useRef, useState } from 'react'
import ProposalApplication from 'src/components/ProposalApplication'
import ProposalFeedback from 'src/components/ProposalFeedback'
import ProposalMeta from 'src/components/ProposalMeta'
import ProposalStatusForm from 'src/components/ProposalStatusForm'
import StudentProposals from 'src/components/StudentProposals'
import SupervisorProposals from 'src/components/SupervisorProposals'
import { UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'
import { ProposalDetails } from 'src/types/app'

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}
export default function Index() {
  const router = useRouter()
  const buttonRef = useRef<null | HTMLDivElement>(null)

  const { data: session } = useSession()

  const { data, isLoading, isError, isFetching } = trpc.proposals.useQuery()
  const { data: openPropsData } = trpc.openProposals.useQuery()

  const [displayMode, setDisplayMode] = useState('')
  const [show, setShow] = useState('proposals')
  const [selectedProposal, setSelectedProposal] = useState<string | null>(
    (router?.query?.proposalId as string) ?? null
  )

  // Function to toggle the display mode
  const toggleDisplayMode = () => {
    if (show === 'proposals') {
      setShow('openProposals')
    } else {
      setShow('proposals')
    }
  }

  const groupedStudentProposals = (proposals) => {
    if (!proposals) return []
    return R.groupBy<ProposalDetails>(
      (p) => p.topicArea.name,
      R.sortBy(
        R.prop('title'),
        proposals.filter((proposal) => proposal.typeKey === 'STUDENT')
      )
    )
  }

  const proposalDetails = useMemo(() => {
    if (!selectedProposal) return setSelectedProposal(data?.[0]?.id as string)

    return data?.find((p) => p.id === selectedProposal)
  }, [data, selectedProposal, displayMode])

  if (isLoading) {
    return <div className="p-2">Loading 🔄🚀</div>
  }

  const isAdmin = session?.user?.role === UserRole.ADMIN
  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isStudent = !isAdmin && !isSupervisor

  return (
    <div className="grid flex-1 grid-cols-1 gap-2 m-4 md:grid-cols-2">
      <div className="flex-initial pb-4 space-y-4 md:flex-1">
        {isSupervisor && (
          <Button onClick={toggleDisplayMode}>
            {show === 'proposals'
              ? 'Show Open Proposals'
              : 'Show All Proposals'}
          </Button>
        )}
        {show === 'proposals' && isSupervisor && (
          <StudentProposals
            data={data}
            groupedStudentProposals={groupedStudentProposals(data)}
            selectedProposal={selectedProposal}
            setSelectedProposal={setSelectedProposal}
            setDisplayMode={setDisplayMode}
            buttonRef={buttonRef}
          />
        )}
        {show === 'openProposals' && isSupervisor && (
          <StudentProposals
            data={openPropsData}
            groupedStudentProposals={groupedStudentProposals(openPropsData)}
            selectedProposal={selectedProposal}
            setSelectedProposal={setSelectedProposal}
            setDisplayMode={setDisplayMode}
            buttonRef={buttonRef}
          />
        )}
        <SupervisorProposals
          isSupervisor={isSupervisor}
          data={data}
          selectedProposal={selectedProposal}
          setSelectedProposal={setSelectedProposal}
          setDisplayMode={setDisplayMode}
          buttonRef={buttonRef}
        />
      </div>

      <div className="mb-4 border shadow" ref={buttonRef}>
        {!selectedProposal && <div className="p-4">No proposal selected</div>}
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
        <ProposalStatusForm
          proposalDetails={proposalDetails}
          session={session}
        />
      </div>
    </div>
  )
}
