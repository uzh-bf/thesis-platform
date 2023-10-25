import { faAdd } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import Link from 'next/link'

interface NewProposalButtonProps {
  isSupervisor: boolean
}

export default function NewProposalButton({
  isSupervisor,
}: NewProposalButtonProps) {
  return (
    <div>
      <Link
        target="_blank"
        href={
          isSupervisor
            ? (process.env.NEXT_PUBLIC_FORMS_URL_PUBLISH as string)
            : (process.env.NEXT_PUBLIC_FORMS_URL_SUBMIT as string)
        }
      >
        <Button>
          <Button.Icon>
            <FontAwesomeIcon icon={faAdd} />
          </Button.Icon>
          <Button.Label>New Proposal</Button.Label>
        </Button>
      </Link>
    </div>
  )
}
