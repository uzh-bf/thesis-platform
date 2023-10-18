import { Button } from '@uzh-bf/design-system'

interface NewProposalButtonProps {
  isSupervisor: boolean
  displayMode: string
  setDisplayMode: (displayMode: string) => void
  setSelectedProposal: (proposalId: string | null) => void
  buttonRef: any
}

export default function NewProposalButton({
  isSupervisor,
  displayMode,
  setDisplayMode,
  setSelectedProposal,
  buttonRef,
}: NewProposalButtonProps) {
  const handleButtonClick = () => {
    setSelectedProposal(null)
    isSupervisor
      ? setDisplayMode('createSupervisor')
      : setDisplayMode('createStudent')
    buttonRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <div>
      <Button
        active={
          displayMode === 'createSupervisor' || displayMode === 'createStudent'
        }
        onClick={handleButtonClick}
      >
        New Proposal
      </Button>
    </div>
  )
}
