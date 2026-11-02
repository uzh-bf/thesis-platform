import { faAdd } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from '@uzh-bf/design-system'
import { useState } from 'react'
import ProposalPublishForm from './ProposalPublishForm'
import StudentProposalForm from './StudentProposalForm'

interface NewProposalButtonProps {
  isSupervisor: boolean
}

export default function NewProposalButton({
  isSupervisor,
}: NewProposalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buttonClass =
    'flex items-center rounded-[4px] border-[#0028A5] bg-[#0028A5] px-3 py-1.5 text-sm font-semibold text-white shadow-none hover:bg-[#001E7C] hover:text-white'
  // Rendered outside the Modal because its trigger slot drops the button's
  // own classes, which made the button fall back to the default styling
  const openModalButton = (
    <Button
      onClick={() => setIsModalOpen(true)}
      className={{ root: buttonClass }}
    >
      <FontAwesomeIcon icon={faAdd} className="mr-2" />
      New Proposal
    </Button>
  )

  if (isSupervisor) {
    return (
      <>
        {openModalButton}
        <Modal
          title="Publish New Supervisor Proposal"
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <ProposalPublishForm onSuccess={() => setIsModalOpen(false)} />
        </Modal>
      </>
    )
  }

  return (
    <>
      {openModalButton}
      <Modal
        title="Submit a Thesis Proposal"
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <StudentProposalForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </>
  )
}
