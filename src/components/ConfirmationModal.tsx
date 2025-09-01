import {
  faCheckCircle,
  faCircleXmark,
} from '@fortawesome/free-regular-svg-icons'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, Prose } from '@uzh-bf/design-system'
import { useState } from 'react'
import { ProposalStatusFilter } from 'src/types/app'

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
  setFilters: (filters: { status: string }) => void
}) {
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAccept = async () => {
    setIsProcessing(true) // Disable all buttons during processing
    setIsAcceptModalOpen(false)
    await acceptApplication.mutateAsync(
      {
        proposalId: proposalDetails.id,
        proposalApplicationId: row.id,
        applicantEmail: row.email,
      },
      {
        onSuccess: () => {
          refetch()
          setFilters({
            status: ProposalStatusFilter.MY_PROPOSALS,
          })
          setIsProcessing(false) // Re-enable buttons after success
        },
        onError: () => {
          setIsProcessing(false) // Re-enable buttons on error
        }
      }
    )
  }

  const handleDecline = async () => {
    setIsProcessing(true) // Disable all buttons during processing
    setIsDeclineModalOpen(false)
    await declineIndividualApplication.mutateAsync(
      {
        proposalId: proposalDetails.id,
        proposalApplicationId: row.id,
        applicantEmail: row.email,
      },
      {
        onSuccess: () => {
          refetch()
          setIsProcessing(false) // Re-enable buttons after success
        },
        onError: () => {
          setIsProcessing(false) // Re-enable buttons on error
        }
      }
    )
  }

  const isDisabled = row.statusKey !== 'OPEN' || acceptApplication.isLoading || isProcessing || declineIndividualApplication.isLoading

  // Helper function to render the Accept button trigger
  function getAcceptButtonTrigger() {
    if (row.statusKey === 'ACCEPTED') {
      return (
        <Button 
          disabled={true} 
          size="sm"
        >
          <Button.Icon icon={faCheckCircle} />
          <Button.Label>Accepted</Button.Label>
        </Button>
      );
    }
    if (row.statusKey === 'OPEN') {
      return (
        <Button 
          disabled={isDisabled} 
          onClick={() => setIsAcceptModalOpen(true)}
          size="sm"
        >
          <Button.Icon icon={acceptApplication.isLoading ? faSpinner : faCheckCircle} />
          <Button.Label>{isProcessing ? 'Processing...' : 'Accept'}</Button.Label>
        </Button>
      );
    }
    return null;
  }

  // Helper function to render the Decline button trigger
  function getDeclineButtonTrigger() {
    if (row.statusKey === 'ACCEPTED') {
      return null;
    }
    return (
      <Button 
        disabled={isDisabled} 
        onClick={() => setIsDeclineModalOpen(true)}
        size="sm"
      >
        <Button.Icon icon={declineIndividualApplication.isLoading ? faSpinner : faCircleXmark} />
        <Button.Label>{isProcessing ? 'Processing...' : row.statusKey === 'DECLINED' ? 'Declined' : 'Decline'}</Button.Label>
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      {/* Accept Button and Modal */}
      <Modal
        open={isAcceptModalOpen}
        trigger={getAcceptButtonTrigger()}
        onClose={() => setIsAcceptModalOpen(false)}
      >
        <div className="flex flex-col items-center gap-4">
          <FontAwesomeIcon className="text-7xl text-green-600" icon={faCheckCircle} />
          <Prose>
            This action cannot be undone. Once confirmed, the accepted student
            will receive an acceptance notification, while the other students will
            receive a notification indicating their application has been declined.
          </Prose>
          <div className='flex justify-between w-full'>
            <Button 
              onClick={() => setIsAcceptModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              destructive
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Decline Button and Modal */}
      <Modal
        open={isDeclineModalOpen}
        trigger={getDeclineButtonTrigger()}
        onClose={() => setIsDeclineModalOpen(false)}
        >
      
        <div className="flex flex-col items-center gap-4">
          <FontAwesomeIcon className="text-7xl text-red-600" icon={faCircleXmark} />
          <Prose>
            Are you sure you want to decline this application? This action cannot be undone.
          </Prose>
          <div className='flex justify-between w-full'>
            <Button 
              onClick={() => setIsDeclineModalOpen(false)}
              disabled={isProcessing}
            >
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
