import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import * as R from 'ramda'
import { useMemo, useRef, useState } from 'react'
import CreateProposal from 'src/components/CreateProposal'
import Header from 'src/components/Header'
import NewProposalButton from 'src/components/NewProposalButton'
import ProposalApplication from 'src/components/ProposalApplication'
import ProposalFeedback from 'src/components/ProposalFeedback'
import ProposalMeta from 'src/components/ProposalMeta'
import ProposalStatusForm from 'src/components/ProposalStatusForm'
import StudentProposals from 'src/components/StudentProposals'
import SupervisorProposals from 'src/components/SupervisorProposals'
import { UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}
export default function Index() {
  const router = useRouter()
  const buttonRef = useRef<null | HTMLDivElement>(null)

  const { data: session } = useSession()

  const { data, isLoading, isError, isFetching } = trpc.proposals.useQuery()

  const [displayMode, setDisplayMode] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<string | null>(
    (router?.query?.proposalId as string) ?? null
  )

  const groupedStudentProposals = useMemo(() => {
    if (!data) return []
    return R.groupBy(
      (p) => p.topicArea.name,
      R.sortBy(
        R.prop('title'),
        data.filter((proposal) => proposal.typeKey === 'STUDENT')
      )
    )
  }, [data])

  const proposalDetails = useMemo(() => {
    if (
      (!selectedProposal && displayMode === 'createStudent') ||
      displayMode === 'createSupervisor'
    )
      return null
    if (!selectedProposal) return setSelectedProposal(data?.[0]?.id as string)

    return data?.find((p) => p.id === selectedProposal)
  }, [data, selectedProposal])

  if (isLoading) {
    return <div className="p-2">Loading 🔄🚀</div>
  }

  const isAdmin = session?.user?.role === UserRole.ADMIN
  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isStudent = !isAdmin && !isSupervisor

  return (
    <div>
      <Header />

      <div className="grid grid-cols-1 gap-2 m-4 md:grid-cols-2">
        <div className="flex-initial pb-4 space-y-4 md:flex-1">
          <NewProposalButton
            isSupervisor={isSupervisor}
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            setSelectedProposal={setSelectedProposal}
            buttonRef={buttonRef}
          />
          <StudentProposals
            isSupervisor={isSupervisor}
            data={data}
            groupedStudentProposals={groupedStudentProposals}
            selectedProposal={selectedProposal}
            setSelectedProposal={setSelectedProposal}
            setDisplayMode={setDisplayMode}
            buttonRef={buttonRef}
          />
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
          <CreateProposal displayMode={displayMode} ref={buttonRef} />
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
    </div>
  )
}
