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

  if (isSupervisor) {
    return (
      <Modal
        title="Publish New Proposal"
        open={isModalOpen}
        trigger={
          <Button 
            onClick={() => setIsModalOpen(true)}
            className={{root: "flex items-center gap-1"}}
          >
            <FontAwesomeIcon icon={faAdd} />
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
        <Button className={{root: "flex items-center gap-1"}}>
          <FontAwesomeIcon icon={faAdd} />
          New Proposal
        </Button>
      </Link>
    </div>
  )
}
