function CreateStudentProposal({ ref }) {
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

export default CreateStudentProposal
