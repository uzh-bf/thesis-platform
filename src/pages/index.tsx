import { ProposalsDocument } from '@graphql/ops'
import {
  Button,
  FormikTextareaField,
  FormikTextField,
  H1,
} from '@uzh-bf/design-system'
import { add, format } from 'date-fns'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { useQuery } from 'urql'

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

  const [{ data, fetching, error }] = useQuery({
    query: ProposalsDocument,
  })

  const [displayMode, setDisplayMode] = useState('create')
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)

  const proposalDetails = useMemo(() => {
    if (!selectedProposal) return null

    return data?.proposals.find((p) => p.id === selectedProposal)
  }, [data, selectedProposal])

  if (session?.user) {
    return (
      <div className="p-4 m-auto mt-4 space-y-4 border rounded max-w-7xl">
        <div className="flex flex-row items-center justify-between p-4 text-gray-600 bg-gray-200 border-b rounded">
          <div>
            Signed in as {session.user.email} ({session.user.role})
          </div>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex-none w-[30rem] space-y-8">
            <div>
              <H1>Available Theses</H1>
              <div className="space-y-1">
                {data?.proposals?.map((proposal) => (
                  <Button
                    fluid
                    key={proposal.id}
                    className="flex flex-row justify-between"
                    active={
                      selectedProposal === proposal.id &&
                      displayMode === 'details'
                    }
                    onClick={() => {
                      setSelectedProposal(proposal.id)
                      setDisplayMode('details')
                    }}
                  >
                    <div>{proposal.title}</div>
                    <div>{proposal.statusKey}</div>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Button
                active={displayMode === 'create'}
                onClick={() => {
                  setSelectedProposal(null)
                  setDisplayMode('create')
                }}
              >
                Submit Proposal
              </Button>
            </div>
          </div>

          <div className="flex-1 border rounded shadow">
            {proposalDetails && (
              <div className="p-4">
                <div className="flex flex-row justify-between">
                  <H1>Proposal {proposalDetails.title}</H1>
                  <div>{proposalDetails.statusKey}</div>
                </div>
                <p>{proposalDetails.description}</p>
                <div>{proposalDetails.typeKey}</div>
              </div>
            )}

            {proposalDetails && (
              <div className="p-4 border-t">
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
                  <Form className="flex flex-col gap-2">
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
                    <div>
                      Starting Date
                      <Field name="plannedStartingDate" type="date" />
                    </div>
                    <FormikTextareaField name="motivation" label="Motivation" />
                    <div>
                      Personal CV (PDF){' '}
                      <Field
                        name="personalCV"
                        placeholder="personalCV"
                        type="file"
                      />
                    </div>
                    <div>
                      Transcript of Records (PDF){' '}
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

            {displayMode === 'create' && (
              <iframe
                className="rounded"
                width="100%"
                height="1300px"
                src="https://forms.office.com/Pages/ResponsePage.aspx?id=2zjkx2LkIkypCsNYsWmAs3FqIECvYGdIv-SlumKwtF1UOE9LV0RPSDRDNE8xNE9HQVJLN0RFTklTRC4u&embed=true"
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
