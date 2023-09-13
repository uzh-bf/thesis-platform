import {
  IconDefinition,
  faComment,
  faFilePdf,
  faMessage,
} from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { inferProcedureOutput } from '@trpc/server'
import {
  Button,
  FormikSelectField,
  FormikTextField,
  FormikTextareaField,
  H2,
  H3,
  Table,
  Tabs,
} from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { Form, Formik } from 'formik'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import * as R from 'ramda'
import { useMemo, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import AcceptProposalForm from 'src/components/AcceptProposalForm'
import ApplicationForm from 'src/components/ApplicationForm'
import Header from 'src/components/Header'
import ProposalMeta from 'src/components/ProposalMeta'
import RejectProposalForm from 'src/components/RejectProposalForm'
import TentativeAcceptProposalForm from 'src/components/TentativeAcceptProposalForm'
import { ProposalType, UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'
import { AppRouter } from 'src/server/routers/_app'
import { twMerge } from 'tailwind-merge'
import * as Yup from 'yup'

type Proposals = inferProcedureOutput<AppRouter['proposals']>
type ProposalDetails = Proposals[number]

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}

function DeclineProposalForm({ proposalName, proposalId, supervisorEmail }) {
  const SignupSchema = Yup.object().shape({
    reason: Yup.string().required('Required'),
    comment: Yup.string().required('Required'),
  })

  return (
    <Formik
      initialValues={{
        proposalName: proposalName,
        reason: '',
        comment: '',
        proposalId: proposalId,
        supervisorEmail: supervisorEmail,
        actionType: 'DECLINE',
      }}
      validationSchema={SignupSchema}
      onSubmit={async (values, { resetForm }) => {
        console.log(JSON.stringify(values)),
          await fetch(process.env.NEXT_PUBLIC_PROPOSAL_FEEDBACK_URL as string, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          })
        resetForm()
        toast.success('Proposal declined successfully!')
      }}
    >
      <Form>
        <div>
          Rejecting this proposal because of lacking content quality or format
          requirements will cause review by the thesis coordinator. The student
          will need to improve and resubmit the proposal.
        </div>
        <div className="grid mt-4 place-items-lef">
          <FormikTextField
            disabled={true}
            name="proposalName"
            label="Proposal"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <FormikSelectField
            required
            name="reason"
            items={[
              {
                value: 'PERSONAL_WORKLOAD',
                label: 'Personal workload too high',
              },
              {
                value: 'LACKING_INTEREST',
                label: 'Lack of interest in specific topic',
              },
              {
                value: 'LANGUAGE',
                label: 'Mismatch in language',
              },
            ]}
            label="Reason"
            placeholder="Select a name"
            className={{
              label: 'font-sans text-lg',
              root: 'flex-col',
            }}
          />
          <FormikTextareaField
            required
            name="comment"
            label="Comment"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <div className="mt-2 italic">
            Why do you decline this proposal specifcally? Your comment will not
            be shown to the student.
          </div>
        </div>

        <Button className={{ root: 'mt-2' }} type="submit">
          Decline Proposal
        </Button>
        <Toaster />
      </Form>
    </Formik>
  )
}

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

function CreateSupervisorProposal({ ref }) {
  return (
    <iframe
      ref={ref}
      className="rounded"
      width="100%"
      height="1400px"
      src={process.env.NEXT_PUBLIC_FORMS_URL_PUBLISH}
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
  const { data: session } = useSession()

  const hasFeedback =
    session?.user?.role === UserRole.SUPERVISOR &&
    proposal.receivedFeedbacks?.length > 0

  return (
    <Button
      key={proposal.id}
      className={{
        root: twMerge(
          'flex flex-col justify-between w-full md:w-64 p-2 text-sm',
          (proposal.isOwnProposal || proposal.isSupervisedProposal) &&
            'border-orange-300',
          hasFeedback && 'bg-slate-100 border-slate-200'
        ),
      }}
      active={isActive}
      onClick={onClick}
    >
      <div className="font-bold">{proposal.title}</div>
      <div className="mt-1 space-y-1 text-xs">
        <div>{proposal.studyLevel}</div>
        <div>{proposal.topicArea.name}</div>
        <div>
          {proposal.typeKey === ProposalType.STUDENT
            ? proposal.applications?.[0]?.fullName
            : proposal.supervisedBy?.name}
        </div>
        {hasFeedback && (
          <div>
            {proposal.receivedFeedbacks?.map((feedback) => feedback.typeKey)}
          </div>
        )}
      </div>
    </Button>
  )
}

function Index(props) {
  const router = useRouter()
  const ref = useRef(null)

  const { data: session } = useSession()

  const { data, isLoading, isError, isFetching } = trpc.proposals.useQuery()

  const [displayMode, setDisplayMode] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<string | null>(
    (router?.query?.proposalId as string) ?? null
  )

  const groupedStudentProposals = useMemo(() => {
    if (!data) return []
    return R.groupBy(
      (p) => p.topicArea.name,
      R.sortBy(
        R.prop('title'),
        data.filter((proposal) => proposal.typeKey === 'STUDENT')
      )
    )
  }, [data])

  const proposalDetails = useMemo(() => {
    if (
      (!selectedProposal && displayMode === 'createStudent') ||
      displayMode === 'createSupervisor'
    )
      return null
    if (!selectedProposal) return setSelectedProposal(data?.[0]?.id as string)

    return data?.find((p) => p.id === selectedProposal)
  }, [data, selectedProposal])

  if (isLoading) {
    return <div className="p-2">Loading 🔄</div>
  }

  const isAdmin = session?.user?.role === UserRole.ADMIN
  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isStudent = !isAdmin && !isSupervisor

  return (
    <div>
      <Header />

      <div className="grid grid-cols-1 gap-2 m-4 md:grid-cols-2">
        <div className="flex-initial pb-4 space-y-4 md:flex-1">
          <div>
            {isSupervisor ? (
              <Button
                active={displayMode === 'createSupervisor'}
                onClick={() => {
                  if (displayMode === 'createSupervisor') {
                    setDisplayMode('')
                  } else {
                    setSelectedProposal(null)
                    setDisplayMode('createSupervisor')
                  }
                  ref.current?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }}
              >
                New Proposal
              </Button>
            ) : (
              <Button
                active={displayMode === 'createStudent'}
                onClick={() => {
                  if (displayMode === 'createStudent') {
                    setDisplayMode('')
                  } else {
                    setSelectedProposal(null)
                    setDisplayMode('createStudent')
                  }
                  ref.current?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }}
              >
                New Proposal
              </Button>
            )}
          </div>

          {isSupervisor && (
            <div>
              <H2>Student Proposals</H2>
              <div className="text-base">
                {data?.filter((proposal) => proposal.typeKey === 'STUDENT')
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
                      groupedStudentProposals?.[topicArea]?.length > 0
                  )
                  .map((topicArea) => (
                    <div key={topicArea}>
                      <H3>{topicArea}</H3>
                      <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
                        {groupedStudentProposals?.[topicArea].map(
                          (proposal) => (
                            <ProposalCard
                              key={proposal.id}
                              proposal={proposal}
                              isActive={selectedProposal === proposal.id}
                              onClick={() => {
                                setSelectedProposal(proposal.id),
                                  setDisplayMode('details')
                                ref.current?.scrollIntoView({
                                  behavior: 'smooth',
                                })
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div>
            {isSupervisor && <H2>Supervisor Proposals</H2>}
            <div className="flex flex-row flex-wrap grid-cols-3 gap-2">
              {data?.filter((proposal) => proposal.typeKey === 'SUPERVISOR')
                .length === 0 && (
                <div>No supervisor proposals available...</div>
              )}
              {data
                ?.filter((proposal) => proposal.typeKey === 'SUPERVISOR')
                .map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    isActive={selectedProposal === proposal.id}
                    onClick={() => {
                      setSelectedProposal(proposal.id),
                        setDisplayMode('details')
                      ref.current?.scrollIntoView({
                        behavior: 'smooth',
                      })
                    }}
                  />
                ))}
            </div>
          </div>
        </div>

        <div className="mb-4 border rounded shadow" ref={ref}>
          {proposalDetails && (
            <ProposalMeta proposalDetails={proposalDetails} />
          )}

          {proposalDetails?.typeKey === 'SUPERVISOR' && (
            <div className="p-4">
              {isStudent && (
                <ApplicationForm
                  key={proposalDetails.id}
                  proposalName={proposalDetails.title}
                  proposalId={proposalDetails.id}
                />
              )}
              {isSupervisor && (
                <div className="pt-4">
                  <H2>Applications</H2>
                  {proposalDetails?.applications?.length === 0 &&
                    'No applications for this proposal...'}
                  {proposalDetails?.applications?.length > 0 && (
                    <Table<(typeof proposalDetails.applications)[0]>
                      className={{
                        root: 'text-xs',
                        tableHeader: 'text-sm',
                      }}
                      columns={[
                        {
                          label: 'Date',
                          accessor: 'createdAt',
                          transformer: ({ row }) =>
                            format(parseISO(row.createdAt), 'dd.MM.Y'),
                        },
                        {
                          label: 'Status',
                          accessor: 'status',
                          sortable: true,
                          transformer: ({ row }) => <div>{row.statusKey}</div>,
                        },
                        {
                          label: 'Working Period',
                          accessor: 'plannedStartAt',
                          sortable: true,
                          transformer: ({ row }) =>
                            `${format(
                              parseISO(row.plannedStartAt),
                              'd.M.Y'
                            )} - ${format(
                              add(parseISO(row.plannedStartAt), { months: 6 }),
                              'd.M.Y'
                            )}`,
                        },
                        {
                          label: 'Name',
                          accessor: 'fullName',
                          sortable: true,
                          transformer: ({ row }) => (
                            <a
                              href={`mailto:${row.email}`}
                              target="_blank"
                              className="flex flex-row items-center gap-2 hover:text-orange-700"
                              rel="noreferrer"
                            >
                              <FontAwesomeIcon icon={faMessage} />
                              {row.fullName}
                            </a>
                          ),
                        },
                        {
                          label: 'Motivation',
                          accessor: 'motivation',
                          transformer: ({ row }) => (
                            <div className="text-xs break-all">
                              {row.motivation}
                            </div>
                          ),
                        },
                        {
                          label: 'Attachments',
                          accessor: 'attachments',
                          transformer: ({ row }) => (
                            <div>
                              {row.attachments?.map((attachment) => (
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

          {proposalDetails?.receivedFeedbacks?.length > 0 &&
            (isSupervisor || isAdmin) &&
            proposalDetails?.receivedFeedbacks.map((feedback) => (
              <div key={feedback.id} className="border-t">
                <div className="flex flex-row items-center gap-2 p-4 text-sm">
                  <FontAwesomeIcon icon={faComment} />
                  <div>
                    <div>{feedback.typeKey}</div>
                    <div className="prose-sm prose">{feedback.comment}</div>
                    <div className="prose-sm prose">{feedback.userEmail}</div>
                  </div>
                </div>
              </div>
            ))}

          {proposalDetails?.typeKey === 'STUDENT' &&
          proposalDetails?.statusKey === 'MATCHED_TENTATIVE' ? (
            <>
              <div className="pl-4 bg-red-100">
                <b>
                  This proposal is tentatively matched with a student. Please
                  accept or reject the proposal.
                </b>
              </div>
              <div className="">
                <Tabs defaultValue="accept">
                  <Tabs.TabList className={{ root: 'md:flex-row border' }}>
                    <Tabs.Tab key="accept" value="accept" label="Accept" />
                    <Tabs.Tab key="reject" value="reject" label="Reject" />
                  </Tabs.TabList>
                  <Tabs.TabContent
                    key="accept"
                    value="accept"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <AcceptProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="reject"
                    value="reject"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <RejectProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                </Tabs>
              </div>
            </>
          ) : (proposalDetails?.typeKey === 'STUDENT' &&
              proposalDetails?.statusKey === 'MATCHED') ||
            proposalDetails?.receivedFeedbacks?.length > 0 ? (
            <div className="p-4 bg-yellow-100">
              {proposalDetails?.applications?.[0].statusKey === 'ACCEPTED'
                ? 'You have already accepted this proposal!'
                : 'You have already provided feedback to this proposal!'}
            </div>
          ) : (
            proposalDetails?.typeKey === 'STUDENT' && (
              <div className="">
                <Tabs defaultValue="accept">
                  <Tabs.TabList className={{ root: 'md:flex-row border' }}>
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
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <AcceptProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="acceptTentative"
                    value="acceptTentative"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <TentativeAcceptProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="decline"
                    value="decline"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <DeclineProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                  <Tabs.TabContent
                    key="reject"
                    value="reject"
                    className={{
                      root: 'border border-t-0 rounded-none px-4',
                    }}
                  >
                    <RejectProposalForm
                      key={proposalDetails?.id}
                      proposalName={proposalDetails?.title}
                      proposalId={proposalDetails?.id}
                      supervisorEmail={session?.user?.email}
                    />
                  </Tabs.TabContent>
                </Tabs>
              </div>
            )
          )}

          {displayMode === 'createStudent' && (
            <CreateStudentProposal ref={ref} />
          )}

          {displayMode === 'createSupervisor' && (
            <CreateSupervisorProposal ref={ref} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Index
