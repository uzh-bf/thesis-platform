import { ProposalsDocument } from '@graphql/ops'
import { Button, H1 } from '@uzh-bf/design-system'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { useQuery } from 'urql'

interface ApplicationValues {
  matriculationNumber: string
  fullName: string
  plannedStartingDate?: Date
  motivation: string
  personalCV?: File
  transcriptOfRecords?: File
}

const ApplicationInitialValues: ApplicationValues = {
  matriculationNumber: '',
  fullName: '',
  plannedStartingDate: undefined,
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

  console.log(session?.user.role)

  if (session?.user) {
    return (
      <div className="p-4 m-auto mt-4 space-y-4 border rounded max-w-7xl">
        <div className="flex flex-row items-end justify-between">
          <div>Signed in as {session.user.email}</div>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex-1 space-y-1">
            {data?.proposals?.map((proposal) => (
              <Button
                fluid
                key={proposal.id}
                className="p-4 space-y-2 border rounded"
                active={
                  selectedProposal === proposal.id && displayMode === 'details'
                }
                onClick={() => {
                  setSelectedProposal(proposal.id)
                  setDisplayMode('details')
                }}
              >
                <H1>{proposal.title}</H1>
              </Button>
            ))}

            <Button
              active={displayMode === 'create'}
              onClick={() => {
                setSelectedProposal(null)
                setDisplayMode('create')
              }}
            >
              Submit new Proposal
            </Button>
          </div>

          <div className="flex-1 border rounded shadow">
            {(displayMode === 'details' || displayMode === 'application') &&
              proposalDetails && (
                <div className="p-4">
                  <H1>{proposalDetails.title}</H1>
                  <p>{proposalDetails.description}</p>
                  <div>{proposalDetails.status}</div>
                  <div>{proposalDetails.type}</div>
                  <Button
                    active={
                      selectedProposal === proposalDetails.id &&
                      displayMode === 'application'
                    }
                    onClick={() => {
                      setSelectedProposal(proposalDetails.id)
                      setDisplayMode('application')
                    }}
                  >
                    Application
                  </Button>
                </div>
              )}

            {displayMode === 'application' && proposalDetails && (
              <div>
                <Formik
                  initialValues={ApplicationInitialValues}
                  onSubmit={(
                    values: ApplicationValues,
                    { setSubmitting }: FormikHelpers<ApplicationValues>,
                  ) => {
                    console.log(values)
                  }}
                >
                  <Form>
                    <Field
                      id="matriculationNumber"
                      name="matriculationNumber"
                      placeholder="matriculationNumber"
                    />
                    <Field
                      id="fullName"
                      name="fullName"
                      placeholder="fullName"
                    />
                    <Field
                      id="plannedStartingDate"
                      name="plannedStartingDate"
                      placeholder="plannedStartingDate"
                      type="date"
                    />
                    <Field
                      id="motivation"
                      name="motivation"
                      placeholder="motivation"
                      as="textarea"
                    />
                    <Field
                      id="personalCV"
                      name="personalCV"
                      placeholder="personalCV"
                      type="file"
                    />
                    <Field
                      id="transcriptOfRecords"
                      name="transcriptOfRecords"
                      placeholder="transcriptOfRecords"
                      type="file"
                    />
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
