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
        <Button>New Proposal</Button>
      </Link>
    </div>
  )
}
