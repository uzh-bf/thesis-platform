import { useSessionStorage } from '@uidotdev/usehooks'
import { TabContent, Tabs, UserNotification } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { ProposalDetails } from 'src/types/app'
import AcceptProposalForm from './AcceptProposalForm' // Import AcceptProposalForm and other form components
import DeclineProposalForm from './DeclineProposalForm'
import RejectProposalForm from './RejectProposalForm'
import TentativeAcceptProposalForm from './TentativeAcceptProposalForm'
interface ProposalStatusFormProps {
  proposalDetails: ProposalDetails
}

export default function ProposalStatusForm({
  proposalDetails,
}: ProposalStatusFormProps) {
  const { data: session } = useSession()

  const [providedFeedback, setProvidedFeedback] = useSessionStorage<
    null | string
  >(proposalDetails.id, null)

  if (
    (proposalDetails?.typeKey === 'STUDENT' &&
      proposalDetails?.statusKey === 'MATCHED_TENTATIVE' &&
      proposalDetails.supervisedBy[0].supervisorEmail ===
        session?.user?.email) ||
    providedFeedback === 'ACCEPT_TENTATIVE'
  ) {
    return (
      <>
        <UserNotification type="info" className={{ root: 'rounded-none' }}>
          This proposal is tentatively matched with a student. Please accept or
          reject the proposal.
        </UserNotification>
        <div className="">
          <Tabs defaultValue="accept" tabs={[
            {
              value: 'accept',
              label: 'Accept',
            },
            {
              value: 'reject',
              label: 'Reject',
            },
          ]}>
            <TabContent
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
                setProvidedFeedback={setProvidedFeedback}
              />
            </TabContent>
            <TabContent
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
                setProvidedFeedback={setProvidedFeedback}
              />
            </TabContent>
          </Tabs>
        </div>
      </>
    )
  } else if (
    (proposalDetails?.typeKey === 'STUDENT' &&
      proposalDetails?.statusKey === 'MATCHED') ||
    (proposalDetails?.receivedFeedbacks?.length > 0 &&
      proposalDetails?.receivedFeedbacks?.some(
        (feedback) => feedback.userEmail === session?.user?.email
      )) ||
    providedFeedback
  ) {
    return (
      <div className="p-4 bg-yellow-100">
        {providedFeedback === 'ACCEPT' ||
        proposalDetails?.applications?.[0].statusKey === 'ACCEPTED'
          ? 'You have already accepted this proposal!'
          : 'You have already provided feedback to this proposal!'}
      </div>
    )
  } else if (proposalDetails?.typeKey === 'STUDENT') {
    return (
      <div className="">
        <Tabs defaultValue="accept" tabs={[
          {
            value: 'accept',
            label: 'Accept',
          },
          {
            value: 'acceptTentative',
            label: 'Accept (Tentative)',
          },
          {
            value: 'reject',
            label: 'Reject',
          },
          {
            value: 'decline',
            label: 'Decline',
          },
        ]}>
          <TabContent
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
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
          <TabContent
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
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
          <TabContent
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
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
          <TabContent
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
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
        </Tabs>
      </div>
    )
  }
}
