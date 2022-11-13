import { faFilePdf, faFileWord } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { trpc } from '@lib/trpc'
import {
  Button,
  FormikTextareaField,
  FormikTextField,
  H1,
  H2,
} from '@uzh-bf/design-system'
import { add, format } from 'date-fns'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'

interface ApplicationValues {
  matriculationNumber: string
  fullName: string
  plannedStartingDate: string
  motivation: string
  personalCV?: File
  transcriptOfRecords?: File
}

const ApplicationInitialValues: ApplicationValues = {
  matriculationNumber: '',
  fullName: '',
  plannedStartingDate: format(add(new Date(), { months: 6 }), 'yyyy-MM-dd'),
  motivation: '',
  personalCV: undefined,
  transcriptOfRecords: undefined,
}

function Index() {
  const { data: session } = useSession()

  const result = trpc.proposals.useQuery()

  const [displayMode, setDisplayMode] = useState('createStudent')
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)

  const proposalDetails = useMemo(() => {
    if (!selectedProposal) return null

    return result.data?.find((p) => p.id === selectedProposal)
  }, [result, selectedProposal])

  if (!result.data) {
    return <div>Loading...</div>
  }

  const data = result.data

  if (session?.user) {
    const isSupervisor = session.user.role === 'SUPERVISOR'
    const isStudent = session.user.role === 'STUDENT'

    return (
      <div className="p-4 m-auto mt-4 space-y-8 border rounded max-w-7xl">
        <div className="flex flex-row items-center justify-between p-4 text-gray-600 bg-gray-200 border-b rounded">
          <div>
            Signed in as {session.user.email} ({session.user.role})
          </div>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>

        <div className="flex flex-row gap-8">
          <div className="flex-none w-[30rem] space-y-8">
            <div>
              <H1>Student Proposals</H1>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data
                  .filter((proposal) => proposal.typeKey === 'STUDENT')
                  .map((proposal) => (
                    <Button
                      fluid
                      key={proposal.id}
                      className="flex flex-col justify-between"
                      active={
                        selectedProposal === proposal.id &&
                        displayMode === 'details'
                      }
                      onClick={() => {
                        setSelectedProposal(proposal.id)
                        setDisplayMode('details')
                      }}
                    >
                      <div className="font-bold">{proposal.title}</div>
                      <div>{proposal.studyLevel}</div>
                      <div>{proposal.topicAreas.map((area) => area.name)}</div>
                    </Button>
                  ))}
              </div>
            </div>
            <div>
              <H1>Supervisor Proposals</H1>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data
                  .filter((proposal) => proposal.typeKey === 'SUPERVISOR')
                  .map((proposal) => (
                    <Button
                      fluid
                      key={proposal.id}
                      className="flex flex-col justify-between"
                      active={
                        selectedProposal === proposal.id &&
                        displayMode === 'details'
                      }
                      onClick={() => {
                        setSelectedProposal(proposal.id)
                        setDisplayMode('details')
                      }}
                    >
                      <div className="font-bold">{proposal.title}</div>
                      <div>{proposal.studyLevel}</div>
                      <div>{proposal.topicAreas.map((area) => area.name)}</div>
                    </Button>
                  ))}
              </div>
            </div>

            <div>
              <H1>New Proposal</H1>
              <div className="flex flex-row gap-2">
                <Button
                  disabled={isSupervisor}
                  active={displayMode === 'createStudent'}
                  onClick={() => {
                    setSelectedProposal(null)
                    setDisplayMode('createStudent')
                  }}
                >
                  Student
                </Button>
                <Button
                  disabled={isStudent}
                  active={displayMode === 'createSupervisor'}
                  onClick={() => {
                    setSelectedProposal(null)
                    setDisplayMode('createSupervisor')
                  }}
                >
                  Supervisor
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 border rounded shadow">
            {proposalDetails && (
              <div className="p-4">
                <div className="flex flex-row justify-between">
                  <H1>{proposalDetails.title}</H1>
                  <div>
                    {proposalDetails.statusKey} / {proposalDetails.typeKey}
                  </div>
                </div>

                <p className="pt-2 pb-4 prose">{proposalDetails.description}</p>

                <div className="flex flex-row gap-2">
                  <div className="flex-none w-48 font-bold">
                    Type of Proposal
                  </div>
                  <div>{proposalDetails.studyLevel}</div>
                </div>
                <div className="flex flex-row gap-2">
                  <div className="flex-none w-48 font-bold">
                    Field of Research
                  </div>
                  <div>
                    {proposalDetails.topicAreas.map((area) => area.name)}
                  </div>
                </div>
                <div className="flex flex-row gap-2">
                  <div className="flex-none w-48 font-bold">
                    Proposal Language
                  </div>
                  <div>{proposalDetails.language}</div>
                </div>
                {proposalDetails.typeKey === 'STUDENT' && (
                  <div className="flex flex-row gap-2">
                    <div className="flex-none w-48 font-bold">
                      Planned Start Date
                    </div>
                    <div>{proposalDetails.plannedStartAt}</div>
                  </div>
                )}
                {proposalDetails.typeKey === 'SUPERVISOR' && (
                  <div className="flex flex-row gap-2">
                    <div className="flex-none w-48 font-bold">
                      Supervised By
                    </div>
                    <div>{proposalDetails.supervisedBy?.name}</div>
                  </div>
                )}
                <div className="flex flex-row gap-2">
                  <div className="flex-none w-48 font-bold">Submitted By</div>
                  <div>{proposalDetails.ownedBy.name}</div>
                </div>

                {proposalDetails.typeKey === 'STUDENT' && (
                  <div className="flex flex-row gap-6 pt-4 mt-4 text-sm border-t">
                    <div>
                      <FontAwesomeIcon icon={faFileWord} size="2x" /> Proposal
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faFilePdf} size="2x" /> CV
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faFilePdf} size="2x" /> Transcript
                    </div>
                  </div>
                )}

                {proposalDetails.typeKey === 'SUPERVISOR' && (
                  <div className="flex flex-row gap-6 pt-4 mt-4 text-sm border-t">
                    <div>
                      <FontAwesomeIcon icon={faFilePdf} size="2x" /> Proposal
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faFilePdf} size="2x" /> Resources
                    </div>
                  </div>
                )}
              </div>
            )}

            {proposalDetails?.typeKey === 'SUPERVISOR' && (
              <div className="p-4 border-t">
                <H2 className="mb-4">Application</H2>
                <Formik
                  initialValues={ApplicationInitialValues}
                  onSubmit={(
                    values: ApplicationValues,
                    { setSubmitting }: FormikHelpers<ApplicationValues>,
                  ) => {
                    const formData = new FormData()
                    formData.append(
                      'matriculationNumber',
                      values.matriculationNumber,
                    )
                    formData.append('fullName', values.fullName)
                    formData.append(
                      'plannedStartingDate',
                      values.plannedStartingDate,
                    )
                    formData.append('motivation', values.motivation)
                    formData.append('personalCV', values.personalCV!)
                    formData.append(
                      'transcriptOfRecords',
                      values.transcriptOfRecords!,
                    )

                    fetch(
                      'https://prod-119.westeurope.logic.azure.com:443/workflows/8a7c3785ade64d168a78cc9e21ed7a1c/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yykbjdA-5KZju5qiBWHw5Gt5WsBa_t1tgBTlqTk7_WU',
                      {
                        method: 'POST',
                        body: formData,
                      },
                    )
                  }}
                >
                  <Form className="flex flex-col gap-4">
                    <FormikTextField
                      name="matriculationNumber"
                      label="Matriculation Number"
                      required
                    />
                    <FormikTextField
                      name="fullName"
                      label="Full Name"
                      required
                    />
                    <div className="flex flex-row items-center gap-4">
                      <div className="font-bold">Starting Date</div>
                      <Field name="plannedStartingDate" type="date" />
                    </div>
                    <FormikTextareaField
                      required
                      name="motivation"
                      label="Motivation"
                    />
                    <div className="space-y-1">
                      <div className="font-bold">Personal CV (PDF)</div>
                      <Field
                        name="personalCV"
                        placeholder="personalCV"
                        type="file"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold">
                        Transcript of Records (PDF)
                      </div>
                      <Field
                        name="transcriptOfRecords"
                        placeholder="transcriptOfRecords"
                        type="file"
                      />
                    </div>

                    <Button type="submit">Submit</Button>
                  </Form>
                </Formik>
              </div>
            )}

            {proposalDetails?.typeKey === 'STUDENT' && (
              <div className="flex flex-row gap-4 p-4 border-t">
                <Button>Accept Proposal</Button>
                <Button>Decline Proposal</Button>
                <Button>Reject Proposal</Button>
              </div>
            )}

            {displayMode === 'createStudent' && (
              <iframe
                className="rounded"
                width="100%"
                height="1300px"
                src="https://forms.office.com/Pages/ResponsePage.aspx?id=2zjkx2LkIkypCsNYsWmAs3FqIECvYGdIv-SlumKwtF1UNFNNNlc0QVVWSkJVR1pWMjc0VjU4VEUyOS4u&embed=true"
              ></iframe>
            )}

            {displayMode === 'createSupervisor' && (
              <iframe
                className="rounded"
                width="100%"
                height="1400px"
                src="https://forms.office.com/Pages/ResponsePage.aspx?id=2zjkx2LkIkypCsNYsWmAs3FqIECvYGdIv-SlumKwtF1UMU5QSVBLNU5DVzhIWkhGMzFMRE1LNU5PNy4u&embed=true"
              ></iframe>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center justify-between max-w-5xl p-4 m-auto mt-4 space-y-4 border rounded">
      Not signed in
      <Button onClick={() => signIn()}>Sign in</Button>
    </div>
  )
}

export default Index
