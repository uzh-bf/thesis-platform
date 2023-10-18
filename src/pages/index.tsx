import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { Tabs } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import * as R from 'ramda'
import { useMemo, useRef, useState } from 'react'
import AcceptProposalForm from 'src/components/AcceptProposalForm'
import CreateProposal from 'src/components/CreateProposal'
import DeclineProposalForm from 'src/components/DeclineProposalForm'
import Header from 'src/components/Header'
import NewProposalButton from 'src/components/NewProposalButton'
import ProposalApplication from 'src/components/ProposalApplication'
import ProposalFeedback from 'src/components/ProposalFeedback'
import ProposalMeta from 'src/components/ProposalMeta'
import RejectProposalForm from 'src/components/RejectProposalForm'
import StudentProposals from 'src/components/StudentProposals'
import SupervisorProposals from 'src/components/SupervisorProposals'
import TentativeAcceptProposalForm from 'src/components/TentativeAcceptProposalForm'
import { UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}
function Index() {
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

          {proposalDetails?.typeKey === 'STUDENT' &&
          proposalDetails?.statusKey === 'MATCHED_TENTATIVE' ? (
            <>
              <div className="pl-4 bg-red-100">
                <b>
                  This proposal is tentatively matched with a student. Please
                  accept or reject the proposal.
                </b>
              </div>
              <div className="">
                <Tabs defaultValue="accept">
                  <Tabs.TabList className={{ root: 'md:flex-row border' }}>
                    <Tabs.Tab key="accept" value="accept" label="Accept" />
                    <Tabs.Tab key="reject" value="reject" label="Reject" />
                  </Tabs.TabList>
                  <Tabs.TabContent
                    key="accept"
                    value="accept"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <AcceptProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="reject"
                    value="reject"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <RejectProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                </Tabs>
              </div>
            </>
          ) : (proposalDetails?.typeKey === 'STUDENT' &&
              proposalDetails?.statusKey === 'MATCHED') ||
            proposalDetails?.receivedFeedbacks?.length > 0 ? (
            <div className="p-4 bg-yellow-100">
              {proposalDetails?.applications?.[0].statusKey === 'ACCEPTED'
                ? 'You have already accepted this proposal!'
                : 'You have already provided feedback to this proposal!'}
            </div>
          ) : (
            proposalDetails?.typeKey === 'STUDENT' && (
              <div className="">
                <Tabs defaultValue="accept">
                  <Tabs.TabList className={{ root: 'md:flex-row border' }}>
                    <Tabs.Tab key="accept" value="accept" label="Accept" />
                    <Tabs.Tab
                      key="acceptTentative"
                      value="acceptTentative"
                      label="Accept (Tentative)"
                    />
                    <Tabs.Tab key="reject" value="reject" label="Reject" />
                    <Tabs.Tab key="decline" value="decline" label="Decline" />
                  </Tabs.TabList>
                  <Tabs.TabContent
                    key="accept"
                    value="accept"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <AcceptProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="acceptTentative"
                    value="acceptTentative"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <TentativeAcceptProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="decline"
                    value="decline"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <DeclineProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="reject"
                    value="reject"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <RejectProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                </Tabs>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default Index
