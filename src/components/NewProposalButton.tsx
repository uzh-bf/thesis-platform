import { Button } from '@uzh-bf/design-system'

export default function NewProposalButton({
  isSupervisor,
  displayMode,
  setDisplayMode,
  setSelectedProposal,
  buttonRef,
}) {
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
