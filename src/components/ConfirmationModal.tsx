import {
  faCheckCircle,
  faCircleXmark,
} from '@fortawesome/free-regular-svg-icons'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, Prose } from '@uzh-bf/design-system'
import { useState } from 'react'
import { ProposalStatusFilter } from 'src/types/app'
import { twMerge } from 'tailwind-merge'

export default function ConfirmationModal({
  row,
  isConfirmationModalOpen,
  setIsConfirmationModalOpen,
  acceptApplication,
  proposalDetails,
  refetch,
  setFilters,
}: {
  row: any
  isConfirmationModalOpen: boolean
  setIsConfirmationModalOpen: (isOpen: boolean) => void
  acceptApplication: any
  proposalDetails: any
  refetch: () => void
  setFilters: (filters: { status: string }) => void
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <Modal
      open={isModalOpen}
      trigger={
        <Button
          disabled={row.statusKey !== 'OPEN' || acceptApplication.isLoading}
          onClick={() => setIsModalOpen(true)}
        >
          <FontAwesomeIcon
            icon={
              acceptApplication.isLoading
                ? faSpinner
                : row.statusKey === 'OPEN'
                ? faCheckCircle
                : row.statusKey === 'ACCEPTED'
                ? faCheckCircle
                : faCircleXmark
            }
          />
          {acceptApplication.isLoading
            ? 'Loading...'
            : row.statusKey === 'OPEN'
            ? 'Accept'
            : row.statusKey === 'ACCEPTED'
            ? 'Accepted'
            : 'Declined'}
        </Button>
      }
      onClose={() => setIsModalOpen(false)}
      onPrimaryAction={
        <Button
          onClick={async () => {
            setIsModalOpen(false)
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
          }}
          className={{
            root: twMerge('bg-red-600 font-bold text-white'),
          }}
        >
          Confirm
        </Button>
      }
      onSecondaryAction={
        <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
      }
      hideCloseButton={true}
      className={{ content: 'w-[40rem] h-max self-center pt-0' }}
    >
      <div className="flex flex-col items-center gap-4">
        <FontAwesomeIcon className="text-8xl" icon={faCircleXmark} />
        <Prose>
          This action cannot be undone. Once confirmed, the accepted student
          will receive an acceptance notification, while the other students will
          receive a notification indicating their application has been declined.
        </Prose>
      </div>
    </Modal>
  )
}
