import {
  faCheckCircle,
  faCircleXmark,
} from '@fortawesome/free-regular-svg-icons'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, TextareaField } from '@uzh-bf/design-system'
import { Dispatch, SetStateAction, useState } from 'react'
import { ApplicationStatus, ProposalStatus } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'
import { ProposalStatusFilter } from 'src/types/app'

const confirmationTooltip =
  'Opens a confirmation modal first. No application status changes immediately.'

export default function ConfirmationModal({
  row,
  acceptApplication,
  declineIndividualApplication,
  proposalDetails,
  refetch,
  setFilters,
}: {
  row: any
  acceptApplication: any
  declineIndividualApplication: any
  proposalDetails: any
  refetch: () => void
  setFilters: Dispatch<SetStateAction<{ status: ProposalStatusFilter }>>
}) {
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [declineComment, setDeclineComment] = useState('')
  const [closeAfterAccept, setCloseAfterAccept] = useState(false)
  const [closeComment, setCloseComment] = useState('')
  const closeProposal = trpc.closeProposalApplications.useMutation()

  const canCloseAfterAccept =
    proposalDetails?.statusKey !== ProposalStatus.MATCHED
  const otherOpenApplicationCount = (proposalDetails?.applications ?? []).filter(
    (application: { id: string; statusKey: string }) =>
      application.id !== row.id &&
      application.statusKey === ApplicationStatus.OPEN
  ).length

  const resetAcceptOptions = () => {
    setCloseAfterAccept(false)
    setCloseComment('')
  }

  const closeAcceptModal = () => {
    if (isProcessing) return
    setIsAcceptModalOpen(false)
    resetAcceptOptions()
  }

  const closeDeclineModal = () => {
    if (isProcessing) return
    setIsDeclineModalOpen(false)
    setDeclineComment('')
  }

  const handleAccept = async () => {
    setIsProcessing(true) // Disable all buttons during processing
    setIsAcceptModalOpen(false)
    const shouldClose = canCloseAfterAccept && closeAfterAccept

    try {
      await acceptApplication.mutateAsync({
        proposalId: proposalDetails.id,
        proposalApplicationId: row.id,
        applicantEmail: row.email,
      })
    } catch (_error) {
      setIsProcessing(false) // Re-enable buttons on error
      resetAcceptOptions()
      return
    }

    // The acceptance flow only responds once the acceptance is stored, so
    // the proposal can be closed right after it.
    if (shouldClose) {
      try {
        const result = await closeProposal.mutateAsync({
          proposalId: proposalDetails.id,
          comment: closeComment,
          acceptedApplicationId: row.id,
        })
        if (result.failedNotificationCount > 0) {
          alert(
            `The proposal was closed, but ${result.failedNotificationCount} decline email(s) could not be sent.`
          )
        }
      } catch (error) {
        alert(
          `${row.fullName} was accepted, but the proposal could not be closed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }

    refetch()
    setFilters({
      status: ProposalStatusFilter.MY_PROPOSALS,
    })
    resetAcceptOptions()
    setIsProcessing(false) // Re-enable buttons after success
  }

  const handleDecline = async () => {
    setIsProcessing(true) // Disable all buttons during processing
    setIsDeclineModalOpen(false)
    await declineIndividualApplication.mutateAsync(
      {
        proposalId: proposalDetails.id,
        proposalApplicationId: row.id,
        applicantEmail: row.email,
        comment: declineComment,
      },
      {
        onSuccess: () => {
          refetch()
          setDeclineComment('')
          setIsProcessing(false) // Re-enable buttons after success
        },
        onError: () => {
          setIsProcessing(false) // Re-enable buttons on error
        },
      }
    )
  }

  const isDisabled =
    row.statusKey !== 'OPEN' ||
    acceptApplication.isLoading ||
    isProcessing ||
    declineIndividualApplication.isLoading

  // Helper function to render the Accept button trigger
  function getAcceptButtonTrigger() {
    if (row.statusKey === 'ACCEPTED') {
      return (
        <Button disabled={true} size="sm">
          <Button.Icon icon={faCheckCircle} />
          <Button.Label>Accepted</Button.Label>
        </Button>
      )
    }
    if (row.statusKey === 'OPEN') {
      return (
        <Button
          disabled={isDisabled}
          onClick={() => setIsAcceptModalOpen(true)}
          size="sm"
          title={confirmationTooltip}
        >
          <Button.Icon
            icon={acceptApplication.isLoading ? faSpinner : faCheckCircle}
          />
          <Button.Label>
            {isProcessing ? 'Processing...' : 'Accept'}
          </Button.Label>
        </Button>
      )
    }
    return null
  }

  // Helper function to render the Decline button trigger
  function getDeclineButtonTrigger() {
    if (row.statusKey === 'ACCEPTED') {
      return null
    }
    return (
      <Button
        disabled={isDisabled}
        onClick={() => setIsDeclineModalOpen(true)}
        size="sm"
        title={confirmationTooltip}
      >
        <Button.Icon
          icon={
            declineIndividualApplication.isLoading ? faSpinner : faCircleXmark
          }
        />
        <Button.Label>
          {isProcessing
            ? 'Processing...'
            : row.statusKey === 'DECLINED'
              ? 'Declined'
              : 'Decline'}
        </Button.Label>
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      {/* Accept Button and Modal */}
      <Modal
        title="Accept Application"
        open={isAcceptModalOpen}
        trigger={getAcceptButtonTrigger()}
        onClose={closeAcceptModal}
        className={{
          content:
            'w-[calc(100vw-2rem)] max-w-xl md:w-[36rem] lg:w-[36rem] xl:w-[36rem]',
          title: 'text-2xl font-semibold text-[#121212]',
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ECF6D6] text-[#536B18]">
              <FontAwesomeIcon className="h-6 w-6" icon={faCheckCircle} />
            </div>
            <div>
              <p className="text-base font-semibold text-[#121212]">
                Confirm acceptance for {row.fullName}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4C4C4C]">
                This cannot be undone. The accepted student receives an
                acceptance email.{' '}
                {canCloseAfterAccept
                  ? 'Unless you close the proposal below, other applications stay open so you can accept further students.'
                  : ''}
              </p>
            </div>
          </div>

          <div className="rounded-[8px] border border-[#E9E9E9] bg-[#FAFAFA] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Applicant
            </p>
            <p className="mt-1 break-words text-base font-semibold text-[#121212]">
              {row.fullName}
            </p>
            <p className="break-all text-sm text-[#4C4C4C]">{row.email}</p>
          </div>

          {canCloseAfterAccept && (
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={closeAfterAccept}
                  onChange={(event) =>
                    setCloseAfterAccept(event.target.checked)
                  }
                  disabled={isProcessing}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#0028A5]"
                />
                <span className="text-sm leading-6 text-[#121212]">
                  <span className="font-semibold">
                    Also close the proposal.
                  </span>{' '}
                  <span className="text-[#4C4C4C]">
                    It is no longer shown to students.{' '}
                    {otherOpenApplicationCount === 0
                      ? 'There are no other open applications to decline.'
                      : otherOpenApplicationCount === 1
                        ? 'The 1 other open applicant receives a declined email.'
                        : `The ${otherOpenApplicationCount} other open applicants receive a declined email.`}
                  </span>
                </span>
              </label>

              {closeAfterAccept && otherOpenApplicationCount > 0 && (
                <TextareaField
                  value={closeComment}
                  onChange={(value) => setCloseComment(value)}
                  label="Feedback to declined applicants (optional)"
                  placeholder="Explain why these applications were declined."
                  maxLength={2000}
                  className={{
                    label: 'text-sm font-semibold text-[#121212]',
                    input: 'min-h-24 bg-white',
                  }}
                />
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button onClick={closeAcceptModal} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleAccept} primary disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Decline Button and Modal */}
      <Modal
        title="Decline Application"
        open={isDeclineModalOpen}
        trigger={getDeclineButtonTrigger()}
        onClose={closeDeclineModal}
        className={{
          content:
            'w-[calc(100vw-2rem)] max-w-xl md:w-[36rem] lg:w-[36rem] xl:w-[36rem]',
          title: 'text-2xl font-semibold text-[#121212]',
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFDBCC] text-[#7E2601]">
              <FontAwesomeIcon className="h-6 w-6" icon={faCircleXmark} />
            </div>
            <div>
              <p className="text-base font-semibold text-[#121212]">
                Confirm decline for {row.fullName}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4C4C4C]">
                This cannot be undone. The applicant receives a declined email
                with your feedback.
              </p>
            </div>
          </div>

          <div className="rounded-[8px] border border-[#E9E9E9] bg-[#FAFAFA] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Applicant
            </p>
            <p className="mt-1 break-words text-base font-semibold text-[#121212]">
              {row.fullName}
            </p>
            <p className="break-all text-sm text-[#4C4C4C]">{row.email}</p>
          </div>

          <TextareaField
            value={declineComment}
            onChange={(value) => setDeclineComment(value)}
            label="Feedback to applicant (optional)"
            placeholder="Explain why this application was declined."
            maxLength={2000}
            className={{
              label: 'text-sm font-semibold text-[#121212]',
              input: 'min-h-32 bg-white',
            }}
          />
          <p className="text-sm leading-6 text-[#4C4C4C]">
            If provided, this text is included in the email to the applicant.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button onClick={closeDeclineModal} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleDecline}
              destructive
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
