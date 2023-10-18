interface CreateProposalProps {
  displayMode: string
  ref: any
}

export default function CreateProposal({
  displayMode,
  ref,
}: CreateProposalProps) {
  if (displayMode === 'createSupervisor') {
    return (
      <iframe
        ref={ref}
        className="rounded"
        width="100%"
        height="1400px"
        src={process.env.NEXT_PUBLIC_FORMS_URL_PUBLISH}
      ></iframe>
    )
  } else if (displayMode === 'createStudent') {
    return (
      <iframe
        ref={ref}
        className="rounded"
        width="100%"
        height="1400px"
        src={process.env.NEXT_PUBLIC_FORMS_URL_SUBMIT}
      ></iframe>
    )
  }
  return null
}
