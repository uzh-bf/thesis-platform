import { faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, TextareaField } from '@uzh-bf/design-system'
import { useState } from 'react'
import { ApplicationStatus, ProposalStatus } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'

type ApplicationSummary = { statusKey: string }

// A proposal can accept several applicants. Once the supervisor is done
// accepting, this closes it for new applications and declines the rest.
export function canCloseProposal(
  proposalStatusKey: string,
  applications: ApplicationSummary[]
) {
  return (
    proposalStatusKey !== ProposalStatus.MATCHED &&
    applications.some(
      (application) => application.statusKey === ApplicationStatus.ACCEPTED
    )
  )
}

export default function CloseProposalButton({
  proposal,
  applications,
  onClosed,
}: {
  proposal: { id: string; statusKey: string }
  applications: ApplicationSummary[]
  onClosed: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [comment, setComment] = useState('')
  const closeProposal = trpc.closeProposalApplications.useMutation()

  if (!canCloseProposal(proposal.statusKey, applications)) {
    return null
  }

  const openApplicationCount = applications.filter(
    (application) => application.statusKey === ApplicationStatus.OPEN
  ).length

  const closeModal = () => {
    if (closeProposal.isPending) return
    setIsOpen(false)
    setComment('')
  }

  const handleConfirm = async () => {
    try {
      const result = await closeProposal.mutateAsync({
        proposalId: proposal.id,
        comment,
      })
      if (result.failedNotificationCount > 0) {
        alert(
          `The proposal was closed, but ${result.failedNotificationCount} decline email(s) could not be sent.`
        )
      }
      setIsOpen(false)
      setComment('')
      onClosed()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'The proposal could not be closed. Please try again.'
      )
    }
  }

  return (
    <Modal
      title="Close Proposal"
      open={isOpen}
      trigger={
        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          disabled={closeProposal.isPending}
          title="Stop accepting applications and decline all open applicants"
        >
          <Button.Icon icon={faLock} />
          <Button.Label>Close proposal and decline remaining</Button.Label>
        </Button>
      }
      onClose={closeModal}
      className={{
        content:
          'w-[calc(100vw-2rem)] max-w-xl md:w-[36rem] lg:w-[36rem] xl:w-[36rem]',
        title: 'text-2xl font-semibold text-[#121212]',
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F5FB] text-[#0028A5]">
            <FontAwesomeIcon className="h-6 w-6" icon={faLock} />
          </div>
          <div>
            <p className="text-base font-semibold text-[#121212]">
              Close this proposal for new applications
            </p>
            <p className="mt-1 text-sm leading-6 text-[#4C4C4C]">
              This cannot be undone. The proposal is no longer shown to
              students.{' '}
              {openApplicationCount === 0
                ? 'There are no open applications left to decline.'
                : openApplicationCount === 1
                  ? 'The 1 remaining open applicant receives a declined email.'
                  : `The ${openApplicationCount} remaining open applicants receive a declined email.`}
            </p>
          </div>
        </div>

        {openApplicationCount > 0 && (
          <>
            <TextareaField
              value={comment}
              onChange={(value) => setComment(value)}
              label="Feedback to declined applicants (optional)"
              placeholder="Explain why these applications were declined."
              maxLength={2000}
              className={{
                label: 'text-sm font-semibold text-[#121212]',
                input: 'min-h-32 bg-white',
              }}
            />
            <p className="text-sm leading-6 text-[#4C4C4C]">
              If provided, this text is included in every declined email.
            </p>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button onClick={closeModal} disabled={closeProposal.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            primary
            disabled={closeProposal.isPending}
          >
            {closeProposal.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
