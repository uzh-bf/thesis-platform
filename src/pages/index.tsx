import {
  faFilePdf,
  faMessage,
  IconDefinition,
} from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { trpc } from '@lib/trpc'
import { inferProcedureOutput } from '@trpc/server'
import { Button, H1, H2, H3, Table, Tabs } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Script from 'next/script'
import * as R from 'ramda'
import { useMemo, useState } from 'react'
import { AppRouter } from 'src/server/routers/_app'
import { twMerge } from 'tailwind-merge'

type Proposals = inferProcedureOutput<AppRouter['proposals']>
type ProposalDetails = Proposals[number]

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}

function Header() {
  const { data: session } = useSession()

  return (
    <header className="w-full">
      <div className="flex flex-row items-center justify-between gap-4 px-4 py-2 text-sm text-gray-600 bg-gray-200 border-b rounded">
        <H1 className={{ root: 'm-0' }}>DBF Thesis Market</H1>
        <div className="flex flex-row items-center gap-4">
          {session?.user ? (
            <>
              <div>
                Signed in as {session.user.email} ({session.user.role})
              </div>
              <Button onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Button onClick={() => signIn()}>DBF Supervisor Log-in</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function ProposalMeta({
  proposalDetails,
}: {
  proposalDetails: ProposalDetails
}) {
  return (
    <div className="pb-4 md:p-4 md:min-w-[500px]">
      <H1>{proposalDetails.title}</H1>

      <p className="pt-2 pb-4 prose max-w-none">
        {proposalDetails.description}
      </p>

      <div className="flex flex-row gap-2">
        <div className="flex-none w-48 font-bold">Type of Proposal</div>
        <div>{proposalDetails.studyLevel}</div>
      </div>
      <div className="flex flex-row gap-2">
        <div className="flex-none w-48 font-bold">Field of Research</div>
        <div>{proposalDetails.topicArea.name}</div>
      </div>
      <div className="flex flex-row gap-2">
        <div className="flex-none w-48 font-bold">Proposal Language</div>
        <div>{JSON.parse(proposalDetails.language).join(', ')}</div>
      </div>
      {proposalDetails.typeKey === 'STUDENT' && (
        <div className="flex flex-row gap-2">
          <div className="flex-none w-48 font-bold">Planned Start Date</div>
          <div>
            {format(
              parseISO(proposalDetails.applications[0].plannedStartAt),
              'yyyy-MM-dd',
            )}
          </div>
        </div>
      )}
      {proposalDetails.typeKey === 'SUPERVISOR' && (
        <div className="flex flex-row gap-2">
          <div className="flex-none w-48 font-bold">Time Frame</div>
          <div>{proposalDetails.timeFrame}</div>
        </div>
      )}
      <div className="flex flex-row gap-2">
        <div className="flex-none w-48 font-bold">Supervised By</div>
        <div>{proposalDetails.supervisedBy?.name ?? 'Unassigned'}</div>
      </div>

      {proposalDetails.typeKey === 'STUDENT' && (
        <div className="flex flex-row gap-2">
          <div className="flex-none w-48 font-bold">Submitted By</div>
          <div>{proposalDetails.applications[0].fullName}</div>
        </div>
      )}

      {proposalDetails.typeKey === 'STUDENT' && (
        <div className="flex flex-row gap-6 pt-4 text-sm">
          {proposalDetails.attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={attachment.href}
              target="_blank"
              className="hover:text-orange-600"
            >
              <div className="flex flex-row items-center gap-2 text-lg">
                <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                <div>{attachment.name}</div>
              </div>
            </Link>
          ))}
          {proposalDetails.applications[0].attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={attachment.href}
              target="_blank"
              className="hover:text-orange-600"
            >
              <div className="flex flex-row items-center gap-2 text-lg">
                <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                <div>{attachment.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {proposalDetails.typeKey === 'SUPERVISOR' && (
        <div className="flex flex-row gap-6 pt-4 text-sm">
          {proposalDetails.attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={attachment.href}
              target="_blank"
              className="hover:text-orange-600"
            >
              <div className="flex flex-row items-center gap-2 text-lg">
                <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                <div>{attachment.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function EasyFormsEmbed({ formId, defaultValues }) {
  return (
    <div className="w-full px-4 md:p-0">
      <div id={`form-${formId}`}>Loading...</div>
      <Script
        src="https://www.bf-tools.uzh.ch/applications/easyforms/static_files/js/form.widget.js"
        id="easy-forms"
        strategy="lazyOnload"
        onReady={() => {
          new EasyForms()
            .initialize({
              id: formId,
              theme: 16,
              container: `form-${formId}`,
              height: '479px',
              form: '//www.bf-tools.uzh.ch/applications/easyforms/index.php?r=app%2Fembed',
              defaultValues,
            })
            .display()
        }}
      />
    </div>
  )
}

function ApplicationForm({ proposalName, proposalId }) {
  return (
    <EasyFormsEmbed
      formId={147}
      defaultValues={{ text_3: proposalName, hidden_1: proposalId }}
    />
  )
}

function AcceptProposalForm({ proposalName, proposalId, supervisorEmail }) {
  return (
    <EasyFormsEmbed
      formId={148}
      defaultValues={{
        text_1: proposalName,
        hidden_3: proposalId,
        hidden_1: supervisorEmail,
      }}
    />
  )
}

function TentativeAcceptProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
}) {
  return (
    <EasyFormsEmbed
      formId={152}
      defaultValues={{
        text_1: proposalName,
        hidden_3: proposalId,
        hidden_1: supervisorEmail,
      }}
    />
  )
}

function RejectProposalForm({ proposalName, proposalId, supervisorEmail }) {
  return (
    <EasyFormsEmbed
      formId={149}
      defaultValues={{
        text_1: proposalName,
        hidden_1: supervisorEmail,
        hidden_2: proposalId,
      }}
    />
  )
}

function DeclineProposalForm({ proposalName, proposalId, supervisorEmail }) {
  return (
    <EasyFormsEmbed
      formId={150}
      defaultValues={{
        text_1: proposalName,
        hidden_3: proposalId,
        hidden_1: supervisorEmail,
      }}
    />
  )
}

function CreateStudentProposal() {
  return (
    <iframe
      className="rounded"
      width="100%"
      height="1400px"
      src="https://forms.office.com/Pages/ResponsePage.aspx?id=2zjkx2LkIkypCsNYsWmAs3FqIECvYGdIv-SlumKwtF1UNFNNNlc0QVVWSkJVR1pWMjc0VjU4VEUyOS4u&embed=true"
    ></iframe>
  )
}

function CreateSupervisorProposal() {
  return (
    <iframe
      className="rounded"
      width="100%"
      height="1400px"
      src="https://forms.office.com/Pages/ResponsePage.aspx?id=2zjkx2LkIkypCsNYsWmAs3FqIECvYGdIv-SlumKwtF1UMU5QSVBLNU5DVzhIWkhGMzFMRE1LNU5PNy4u&embed=true"
    ></iframe>
  )
}

function ProposalCard({
  proposal,
  isActive,
  onClick,
}: {
  proposal: ProposalDetails
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Button
      key={proposal.id}
      className={{
        root: twMerge(
          'flex flex-col justify-between w-full gap-1 p-2 text-sm md:w-64',
          (proposal.isOwnProposal || proposal.isSupervisedProposal) &&
            'border-orange-300',
        ),
      }}
      active={isActive}
      onClick={onClick}
    >
      <div className="font-bold">{proposal.title}</div>
      <div className="mt-1 space-y-1 text-xs">
        <div>{proposal.studyLevel}</div>
        <div>{proposal.topicArea.name}</div>
        <div>{proposal.applications?.[0]?.fullName}</div>
      </div>
    </Button>
  )
}

function Index() {
  const router = useRouter()

  const { data: session } = useSession()

  const result = trpc.proposals.useQuery()

  // const res = trpc.supervisors.useQuery()

  const [displayMode, setDisplayMode] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<string | null>(
    (router?.query?.proposalId as string) ?? null,
  )

  const groupedStudentProposals = useMemo(() => {
    if (!result.data) return []
    return R.groupBy(
      (p) => p.topicArea.name,
      R.sortBy(
        R.prop('title'),
        result.data.filter((proposal) => proposal.typeKey === 'STUDENT'),
      ),
    )
  }, [result])

  const proposalDetails = useMemo(() => {
    if (!selectedProposal) return null

    return result.data?.find((p) => p.id === selectedProposal)
  }, [result, selectedProposal])

  if (!result.data) {
    return <div>Loading...</div>
  }

  const data = result.data

  const isSupervisor = session?.user?.role === 'SUPERVISOR'
  const isStudent = !session?.user || session.user.role === 'UNSET'

  return (
    <div className="">
      <Header />

      <div
        className={twMerge('flex flex-row flex-wrap md:flex-nowrap p-4 gap-8')}
      >
        <div className="flex-initial space-y-4 md:flex-1">
          <div>
            {isSupervisor ? (
              <Button
                active={displayMode === 'createSupervisor'}
                onClick={() => {
                  setSelectedProposal(null)
                  setDisplayMode('createSupervisor')
                }}
              >
                New Proposal
              </Button>
            ) : (
              <Button
                active={displayMode === 'createStudent'}
                onClick={() => {
                  setSelectedProposal(null)
                  setDisplayMode('createStudent')
                }}
              >
                New Proposal
              </Button>
            )}
          </div>

          {isSupervisor && (
            <div>
              <H2>Student Proposals</H2>
              <div className="space-y-2 text-sm">
                {data.filter((proposal) => proposal.typeKey === 'STUDENT')
                  .length === 0 && <div>No student proposals available...</div>}

                {[
                  'Banking and Insurance',
                  'Corporate Finance',
                  'Financial Economics',
                  'Quantitative Finance',
                  'Sustainable Finance',
                ]
                  .filter(
                    (topicArea) =>
                      groupedStudentProposals?.[topicArea]?.length > 0,
                  )
                  .map((topicArea) => (
                    <div key={topicArea}>
                      <H3>{topicArea}</H3>
                      <div className="flex flex-row flex-wrap gap-2">
                        {groupedStudentProposals?.[topicArea].map(
                          (proposal) => (
                            <ProposalCard
                              key={proposal.id}
                              proposal={proposal}
                              isActive={selectedProposal === proposal.id}
                              onClick={() => {
                                setSelectedProposal(proposal.id)
                                setDisplayMode('details')
                              }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div>
            {isSupervisor && <H2>Supervisor Proposals</H2>}
            <div className="flex flex-row flex-wrap gap-2 text-sm">
              {data.filter((proposal) => proposal.typeKey === 'SUPERVISOR')
                .length === 0 && (
                <div>No supervisor proposals available...</div>
              )}
              {data
                .filter((proposal) => proposal.typeKey === 'SUPERVISOR')
                .map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    isActive={selectedProposal === proposal.id}
                    onClick={() => {
                      setSelectedProposal(proposal.id)
                      setDisplayMode('details')
                    }}
                  />
                ))}
            </div>
          </div>
        </div>

        <div className="flex-1 md:border md:rounded md:shadow">
          {proposalDetails && (
            <ProposalMeta proposalDetails={proposalDetails} />
          )}

          {proposalDetails?.typeKey === 'SUPERVISOR' && (
            <div className="pt-4 border-t md:p-4">
              {isStudent && (
                <ApplicationForm
                  key={proposalDetails.id}
                  proposalName={proposalDetails.title}
                  proposalId={proposalDetails.id}
                />
              )}
              {isSupervisor && (
                <div>
                  <H2>Applications</H2>
                  {proposalDetails.applications.length === 0 &&
                    'No applications for this proposal...'}
                  {proposalDetails.applications.length > 0 && (
                    <Table
                      className={{ root: 'text-sm', tableHeader: 'text-base' }}
                      columns={[
                        {
                          label: 'Status',
                          accessor: 'status',
                          sortable: true,
                          transformer: (status) => <div>{status.key}</div>,
                        },
                        {
                          label: 'Working Period',
                          accessor: 'plannedStartAt',
                          sortable: true,
                          transformer: (date) =>
                            `${format(parseISO(date), 'd.M.Y')} - ${format(
                              add(parseISO(date), { months: 6 }),
                              'd.M.Y',
                            )}`,
                        },
                        {
                          label: 'Name',
                          accessor: 'fullName',
                          sortable: true,
                          transformer: (name, all) => (
                            <a
                              href={`mailto:${all.email}`}
                              target="_blank"
                              className="flex flex-row items-center gap-2 hover:text-orange-700"
                              rel="noreferrer"
                            >
                              <FontAwesomeIcon icon={faMessage} />
                              {name}
                            </a>
                          ),
                        },
                        {
                          label: 'Motivation',
                          accessor: 'motivation',
                          transformer: (motivation) => (
                            <div className="text-xs break-all">
                              {motivation}
                            </div>
                          ),
                        },
                        {
                          label: 'Attachments',
                          accessor: 'attachments',
                          transformer: (attachments) => (
                            <div>
                              {attachments.map((attachment) => (
                                <a
                                  href={attachment.href}
                                  target="_blank"
                                  key={attachment.id}
                                  className="hover:text-orange-700"
                                  rel="noreferrer"
                                >
                                  <div className="flex flex-row items-center gap-2">
                                    <FontAwesomeIcon
                                      icon={FileTypeIconMap[attachment.type]}
                                    />
                                    {attachment.name}
                                  </div>
                                </a>
                              ))}
                            </div>
                          ),
                        },
                      ]}
                      data={proposalDetails.applications}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {proposalDetails?.typeKey === 'STUDENT' && (
            <div className="pt-4 border-t md:p-4">
              <Tabs defaultValue="accept">
                <Tabs.TabList className={{ root: 'flex flex-row border' }}>
                  <Tabs.Tab key="accept" value="accept" label="Accept" />
                  <Tabs.Tab
                    key="acceptTentative"
                    value="acceptTentative"
                    label="Accept (Tentative)"
                  />
                  <Tabs.Tab key="reject" value="reject" label="Reject" />
                  <Tabs.Tab key="decline" value="decline" label="Decline" />
                </Tabs.TabList>
                <Tabs.TabContent
                  key="accept"
                  value="accept"
                  className={{ root: 'border border-t-0 rounded-none' }}
                >
                  <AcceptProposalForm
                    key={proposalDetails.id}
                    proposalName={proposalDetails.title}
                    proposalId={proposalDetails.id}
                    supervisorEmail={session?.user?.email}
                  />
                </Tabs.TabContent>
                <Tabs.TabContent
                  key="acceptTentative"
                  value="acceptTentative"
                  className={{ root: 'border border-t-0 rounded-none' }}
                >
                  <TentativeAcceptProposalForm
                    key={proposalDetails.id}
                    proposalName={proposalDetails.title}
                    proposalId={proposalDetails.id}
                    supervisorEmail={session?.user?.email}
                  />
                </Tabs.TabContent>
                <Tabs.TabContent
                  key="decline"
                  value="decline"
                  className={{ root: 'border border-t-0 rounded-none' }}
                >
                  <DeclineProposalForm
                    key={proposalDetails.id}
                    proposalName={proposalDetails.title}
                    proposalId={proposalDetails.id}
                    supervisorEmail={session?.user?.email}
                  />
                </Tabs.TabContent>
                <Tabs.TabContent
                  key="reject"
                  value="reject"
                  className={{ root: 'border border-t-0 rounded-none' }}
                >
                  <RejectProposalForm
                    key={proposalDetails.id}
                    proposalName={proposalDetails.title}
                    proposalId={proposalDetails.id}
                    supervisorEmail={session?.user?.email}
                  />
                </Tabs.TabContent>
              </Tabs>
            </div>
          )}

          {displayMode === 'createStudent' && <CreateStudentProposal />}

          {displayMode === 'createSupervisor' && <CreateSupervisorProposal />}
        </div>
      </div>
    </div>
  )
}

export default Index
