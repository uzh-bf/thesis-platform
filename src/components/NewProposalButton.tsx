import { Button } from '@uzh-bf/design-system'

function NewProposalButton({
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

export default NewProposalButton
