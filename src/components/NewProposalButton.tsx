import { faAdd } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from '@uzh-bf/design-system'
import Link from 'next/link'
import { useState } from 'react'
import ProposalPublishForm from './ProposalPublishForm'

interface NewProposalButtonProps {
  isSupervisor: boolean
}

export default function NewProposalButton({
  isSupervisor,
}: NewProposalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buttonClass =
    'flex items-center rounded-[4px] border-[#0028A5] bg-[#0028A5] px-3 py-1.5 text-sm font-semibold text-white shadow-none hover:bg-[#001E7C] hover:text-white'

  if (isSupervisor) {
    return (
      <Modal
        title="Publish New Supervisor Proposal"
        open={isModalOpen}
        trigger={
          <Button
            onClick={() => setIsModalOpen(true)}
            className={{ root: buttonClass }}
          >
            <FontAwesomeIcon icon={faAdd} className="mr-2" />
            New Proposal
          </Button>
        }
        onClose={() => setIsModalOpen(false)}
      >
        <ProposalPublishForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    )
  }

  return (
    <div>
      <Link
        target="_blank"
        href={process.env.NEXT_PUBLIC_FORMS_URL_SUBMIT as string}
      >
        <Button className={{ root: buttonClass }}>
          <FontAwesomeIcon icon={faAdd} className="mr-2" />
          New Proposal
        </Button>
      </Link>
    </div>
  )
}
