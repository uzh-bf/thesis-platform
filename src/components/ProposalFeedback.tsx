import { faComment } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function ProposalFeedback({
  proposalDetails,
  isSupervisor,
  isAdmin,
}) {
  if (
    proposalDetails?.receivedFeedbacks?.length > 0 &&
    (isSupervisor || isAdmin)
  ) {
    return (
      <div>
        {proposalDetails.receivedFeedbacks.map((feedback) => (
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
