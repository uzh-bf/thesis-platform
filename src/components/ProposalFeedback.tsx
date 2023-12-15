import { faComment } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import useUserRole from 'src/lib/hooks/useUserRole'
import { ProposalDetails } from 'src/types/app'

interface ProposalFeedbackProps {
  proposalDetails: ProposalDetails
}

export default function ProposalFeedback({
  proposalDetails,
}: ProposalFeedbackProps) {
  const { isSupervisor, isAdmin, isDeveloper } = useUserRole()

  if (
    proposalDetails?.receivedFeedbacks?.length > 0 &&
    (isSupervisor || isAdmin || isDeveloper)
  ) {
    return (
      <div>
        {proposalDetails.receivedFeedbacks.map((feedback: any) => (
          <div key={feedback.id} className="border-t">
            <div className="flex flex-row items-center gap-2 p-4 text-sm">
              <FontAwesomeIcon icon={faComment} />
              <div>
                <div>{feedback.typeKey}</div>
                <div className="prose-sm prose">{feedback.comment}</div>
                <div className="prose-sm prose">{feedback.userEmail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  } else {
    return null
  }
}
