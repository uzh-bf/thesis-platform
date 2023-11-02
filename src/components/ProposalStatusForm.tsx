import { useSessionStorage } from '@uidotdev/usehooks'
import { Tabs } from '@uzh-bf/design-system'
import type { Session } from 'next-auth'
import { ProposalDetails } from 'src/types/app'
import AcceptProposalForm from './AcceptProposalForm' // Import AcceptProposalForm and other form components
import DeclineProposalForm from './DeclineProposalForm'
import RejectProposalForm from './RejectProposalForm'
import TentativeAcceptProposalForm from './TentativeAcceptProposalForm'
interface ProposalStatusFormProps {
  proposalDetails: ProposalDetails
  session: Session | null
}

export default function ProposalStatusForm({
  proposalDetails,
  session,
}: ProposalStatusFormProps) {
  const [providedFeedback, setProvidedFeedback] = useSessionStorage<
    null | string
  >(proposalDetails.id, null)
  if (
    (proposalDetails?.typeKey === 'STUDENT' &&
      proposalDetails?.statusKey === 'MATCHED_TENTATIVE') ||
    providedFeedback === 'ACCEPT_TENTATIVE'
  ) {
    return (
      <>
        <div className="pl-4 bg-red-100">
          <b>
            This proposal is tentatively matched with a student. Please accept
            or reject the proposal.
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
                supervisorEmail={session?.user?.email as string}
                setValue={setProvidedFeedback}
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
                supervisorEmail={session?.user?.email as string}
                setValue={setProvidedFeedback}
              />
            </Tabs.TabContent>
          </Tabs>
        </div>
      </>
    )
  } else if (
    (proposalDetails?.typeKey === 'STUDENT' &&
      proposalDetails?.statusKey === 'MATCHED') ||
    proposalDetails?.receivedFeedbacks?.length > 0 ||
    providedFeedback
  ) {
    return (
      <div className="p-4 bg-yellow-100">
        {proposalDetails?.applications?.[0].statusKey === 'ACCEPTED'
          ? 'You have already accepted this proposal!'
          : 'You have already provided feedback to this proposal!'}
      </div>
    )
  } else if (proposalDetails?.typeKey === 'STUDENT') {
    return (
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
              supervisorEmail={session?.user?.email as string}
              setValue={setProvidedFeedback}
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
              supervisorEmail={session?.user?.email as string}
              setValue={setProvidedFeedback}
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
              supervisorEmail={session?.user?.email as string}
              setValue={setProvidedFeedback}
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
              supervisorEmail={session?.user?.email as string}
              setValue={setProvidedFeedback}
            />
          </Tabs.TabContent>
        </Tabs>
      </div>
    )
  } else {
    return null
  }
}
