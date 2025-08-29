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
  proposalDetails,
  refetch,
  setFilters,
}: {
  row: any
  acceptApplication: any
  proposalDetails: any
  refetch: () => void
  setFilters: (filters: { status: string }) => void
}) {
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)

  const handleAccept = async () => {
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
        },
      }
    )
  }

  const isDisabled = row.statusKey !== 'OPEN' || acceptApplication.isLoading

  return (
    <div className="flex gap-2">
      {/* Accept Button and Modal */}
      <Modal
        open={isAcceptModalOpen}
        trigger={
          <Button 
            disabled={isDisabled} 
            onClick={() => setIsAcceptModalOpen(true)}
            size="sm"
          >
            <Button.Icon icon={acceptApplication.isLoading ? faSpinner : faCheckCircle} />
            <Button.Label>
              {acceptApplication.isLoading ? 'Loading...' : 'Accept'}
            </Button.Label>
          </Button>
        }
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
            <Button onClick={() => setIsAcceptModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAccept}
              destructive
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Decline Button and Modal */}
      <Modal
        open={isDeclineModalOpen}
        trigger={
          <Button 
            disabled={isDisabled} 
            onClick={() => setIsDeclineModalOpen(true)}
            size="sm"
          >
            <Button.Icon icon={faCircleXmark} />
            <Button.Label>Decline</Button.Label>
          </Button>
        }
        onClose={() => setIsDeclineModalOpen(false)}
      >
        <div className="flex flex-col items-center gap-4">
          <FontAwesomeIcon className="text-7xl text-red-600" icon={faCircleXmark} />
          <Prose>
            Are you sure you want to decline this application? This action cannot be undone.
          </Prose>
          <div className='flex justify-between w-full'>
            <Button onClick={() => setIsDeclineModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => setIsDeclineModalOpen(false)}
              destructive
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
