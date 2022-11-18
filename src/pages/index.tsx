import { faFilePdf, faFileWord } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { trpc } from '@lib/trpc'
import { Button, H1 } from '@uzh-bf/design-system'
import { add, format } from 'date-fns'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    const s: any = document.createElement('script')
    const options = {
      id: 147,
      theme: 0,
      container: 'c7',
      height: '479px',
      form: '//www.bf-tools.uzh.ch/applications/easyforms/index.php?r=app%2Fembed',
    }
    s.type = 'text/javascript'
    s.src =
      'https://www.bf-tools.uzh.ch/applications/easyforms/static_files/js/form.widget.js'
    s.onload = s.onreadystatechange = function () {
      const rs = this.readyState
      if (rs) if (rs != 'complete') if (rs != 'loaded') return
      try {
        new window.EasyForms().initialize(options).display()
      } catch (e) {}
    }
    const scr = document.getElementsByTagName('script')[0]
    const par: any = scr.parentNode
    par.insertBefore(s, scr)
  }, [proposalDetails])

  if (!result.data) {
    return <div>Loading...</div>
  }

  const data = result.data

  if (session?.user) {
    const isSupervisor = session.user.role === 'SUPERVISOR'
    const isStudent = session.user.role === 'STUDENT'

    return (
      <div className="p-4 m-auto mt-4 space-y-8">
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
                      <div>{proposal.topicArea.name}</div>
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
                      <div>{proposal.topicArea.name}</div>
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
                  <div>{proposalDetails.topicArea.name}</div>
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
                <div className="max-w-lg border">
                  <div id="c7">
                    Fill in the{' '}
                    <a
                      href={`https://www.bf-tools.uzh.ch/applications/easyforms/index.php?r=app%2Fform&id=13&hidden_1=${proposalDetails.id}`}
                    >
                      online form
                    </a>
                    .
                  </div>
                </div>
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
