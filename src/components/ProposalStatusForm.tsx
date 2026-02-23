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
        <Tabs defaultValue="accept" tabs={[
            {
              id: 'tentative-tabs-accept',
              value: 'accept',
              label: 'Accept',
            },
            {
              id: 'tentative-tabs-reject',
              value: 'reject',
              label: 'Reject',
            },
          ]}>
            <TabContent
              value="accept"
              className={{
                root: 'border border-t-0 rounded-none px-4',
              }}
            >
              <AcceptProposalForm
                proposalName={proposalDetails?.title}
                proposalId={proposalDetails?.id}
                supervisorEmail={session?.user?.email as string}
                setProvidedFeedback={setProvidedFeedback}
              />
            </TabContent>
            <TabContent
              value="reject"
              className={{
                root: 'border border-t-0 rounded-none px-4',
              }}
            >
              <RejectProposalForm
                proposalName={proposalDetails?.title}
                proposalId={proposalDetails?.id}
                supervisorEmail={session?.user?.email as string}
                setProvidedFeedback={setProvidedFeedback}
              />
            </TabContent>
          </Tabs>
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
        <Tabs defaultValue="accept" tabs={[
          {
            id: 'student-tabs-accept',
            value: 'accept',
            label: 'Accept',
          },
          {
            id: 'student-tabs-accept-tentative',
            value: 'acceptTentative',
            label: 'Accept (Tentative)',
          },
          {
            id: 'student-tabs-reject',
            value: 'reject',
            label: 'Reject',
          },
          {
            id: 'student-tabs-decline',
            value: 'decline',
            label: 'Decline',
          },
        ]}>
          <TabContent
            value="accept"
            className={{
              root: 'border border-t-0 rounded-none px-4',
            }}
          >
            <AcceptProposalForm
              proposalName={proposalDetails?.title}
              proposalId={proposalDetails?.id}
              supervisorEmail={session?.user?.email as string}
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
          <TabContent
            value="acceptTentative"
            className={{
              root: 'border border-t-0 rounded-none px-4',
            }}
          >
            <TentativeAcceptProposalForm
              proposalName={proposalDetails?.title}
              proposalId={proposalDetails?.id}
              supervisorEmail={session?.user?.email as string}
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
          <TabContent
            value="decline"
            className={{
              root: 'border border-t-0 rounded-none px-4',
            }}
          >
            <DeclineProposalForm
              proposalName={proposalDetails?.title}
              proposalId={proposalDetails?.id}
              supervisorEmail={session?.user?.email as string}
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
          <TabContent
            value="reject"
            className={{
              root: 'border border-t-0 rounded-none px-4',
            }}
          >
            <RejectProposalForm
              proposalName={proposalDetails?.title}
              proposalId={proposalDetails?.id}
              supervisorEmail={session?.user?.email as string}
              setProvidedFeedback={setProvidedFeedback}
            />
          </TabContent>
        </Tabs>
    )
  }
}
