import { BlobServiceClient } from '@azure/storage-blob'
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
  FormikDateChanger,
  FormikSelectField,
  FormikTextField,
  FormikTextareaField,
  H2,
  H3,
  Table,
  Tabs,
} from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import dayjs from 'dayjs'
import { Form, Formik } from 'formik'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import * as R from 'ramda'
import { useMemo, useRef, useState } from 'react'
import Dropzone from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import Header from 'src/components/Header'
import ProposalMeta from 'src/components/Proposalmeta'
import { ProposalType, UserRole } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'
import { AppRouter } from 'src/server/routers/_app'
import { twMerge } from 'tailwind-merge'
import * as Yup from 'yup'
import useLocalStorage from '../lib/hooks/useLocalStorage'

type Proposals = inferProcedureOutput<AppRouter['proposals']>
type ProposalDetails = Proposals[number]

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}

function ApplicationForm({ proposalName, proposalId }) {
  const [cv, setCv] = useState([])
  const [transcript, setTranscript] = useState([])

  const mutation = trpc.generateSasQueryToken.useMutation()

  const [submitted, setLocalStorage] = useLocalStorage<boolean>(proposalId)

  const handleFileFieldChange =
    (fieldKey, fileName, formikProps) => async (files) => {
      const file = files[0]
      const { SAS_STRING } = await mutation.mutateAsync()
      console.log('MUTATION RESULT: ', SAS_STRING)
      const blobServiceClient = new BlobServiceClient(
        `${process.env.NEXT_PUBLIC_BLOBSERVICECLIENT_URL}${SAS_STRING}`
      )
      const containerClient = blobServiceClient.getContainerClient(
        process.env.NEXT_PUBLIC_CONTAINER_NAME!
      )
      const name = `${formikProps.values.uzhemail}-${fileName}.pdf`
      const blobClient = containerClient.getBlobClient(name)
      const blockBlobClient = blobClient.getBlockBlobClient()
      const result = await blockBlobClient.uploadData(file, {
        blockSize: 4 * 1024 * 1024, // 4MB block size
      })
      if (fieldKey === 'cvFile') {
        setCv([file])
      } else {
        setTranscript([file])
      }
      formikProps.setFieldValue(fieldKey, name)
    }

  const SignupSchema = Yup.object().shape({
    uzhemail: Yup.string()
      .email('Invalid email')
      .test(
        'uzh-domain',
        'Please enter your @uzh.ch email address',
        (value) => {
          if (value) {
            const domain = value.split('@')[1]
            return domain === 'uzh.ch'
          }
          return true // Allow empty values, you can adjust this based on your needs
        }
      )
      .required('Required'),
    matriculationNumber: Yup.string()
      .matches(/^\d{1,2}-\d{3}-\d{3}$/, 'Invalid matriculation number')
      .required('Required'),
    fullName: Yup.string()
      .test(
        'at-least-two-words',
        'Full name must consist of at least two words',
        (value) => {
          if (value) {
            const words = value.trim().split(' ')
            return words.length >= 2
          }
          return true // Allow empty values, you can adjust this based on your needs
        }
      )
      .required('Required'),
    startingDate: Yup.date().required('Required'),
    motivation: Yup.string()
      .min(200, 'Must be at least 200 characters')
      .required('Required'),
    cvFile: Yup.string().required('Required'),
    transcriptFile: Yup.string().required('Required'),
  })

  return submitted === null ? (
    <>Loading 🔄</>
  ) : !submitted ? (
    <Formik
      initialValues={{
        proposalTitle: proposalName,
        uzhemail: '',
        matriculationNumber: '',
        fullName: '',
        startingDate: dayjs(Date.now()).format('YYYY-MM-DD'),
        motivation: '',
        proposalId: proposalId,
        cvFile: null,
        transcriptFile: null,
      }}
      validationSchema={SignupSchema}
      onSubmit={async (values, { resetForm }) => {
        console.log(JSON.stringify(values)),
          await fetch(process.env.NEXT_PUBLIC_APPLICATION_URL as string, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          })
        await setLocalStorage(true)
        resetForm()
        setCv([])
        setTranscript([])
        toast.success('Application submitted successfully!') // not showing anymore
      }}
    >
      {(formikProps) => (
        <Form>
          <FormikTextField
            disabled
            name="proposalTitle"
            label="Proposal"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <FormikTextField
            required
            name="uzhemail"
            label="Email"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <FormikTextField
            required
            name="matriculationNumber"
            label="Matriculation Number"
            className={{
              label: ' font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <FormikTextField
            required
            name="fullName"
            label="Full Name"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <FormikDateChanger
            required
            name="startingDate"
            className={{
              root: 'pt-2 font-sans font-bold text-lg',
            }}
            label="Starting Date"
          />
          <FormikTextareaField
            required
            name="motivation"
            label="Motivation"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <div className="flex flex-row pt-2 text-lg font-bold">
            <div>Personal CV (PDF)</div>
            <div className="mb-1 ml-0.5 mr-2 text-red-600">*</div>
          </div>
          <Dropzone
            onDrop={handleFileFieldChange('cvFile', 'cv', formikProps)}
            multiple={false}
            accept={{ 'application/pdf': ['.pdf'] }}
          >
            {({ getRootProps, getInputProps }) => (
              <section>
                <div
                  {...getRootProps()}
                  className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                >
                  <input type="file" {...getInputProps()} />
                  <p className="p-2 text-base">
                    {cv.length > 0
                      ? `Attached File 📄: '${cv[0].name}'`
                      : 'Drag and drop your file 🗃️ here, or click to select the file'}
                  </p>
                </div>
              </section>
            )}
          </Dropzone>
          <div className="flex flex-row pt-2 text-lg font-bold">
            <div>Transcript of Records (PDF)</div>
            <div className="mb-1 ml-0.5 mr-2 text-red-600">*</div>
          </div>
          <Dropzone
            onDrop={handleFileFieldChange(
              'transcriptFile',
              'transcript',
              formikProps
            )}
            multiple={false}
            accept={{ 'application/pdf': ['.pdf'] }}
          >
            {({ getRootProps, getInputProps }) => (
              <section>
                <div
                  {...getRootProps()}
                  className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                >
                  <input type="file" {...getInputProps()} />
                  <p className="p-2 text-base">
                    {transcript.length > 0
                      ? `Attached File 📄: '${transcript[0].name}'`
                      : 'Drag and drop your file 🗃️ here, or click to select the file'}
                  </p>
                </div>
              </section>
            )}
          </Dropzone>
          <div>
            <Button className={{ root: 'mt-2' }} type="submit">
              Submit Application
            </Button>
            <Toaster />
          </div>
        </Form>
      )}
    </Formik>
  ) : (
    // Already submitted for this proposal
    <>
      <h1 className="font-bold">Application Submitted</h1>
      <p className="pb-4">
        Your application has been submitted successfully. You will be notified
        once your application has been reviewed.
      </p>
    </>
  )
}

function AcceptProposalForm({ proposalName, proposalId, supervisorEmail }) {
  const SignupSchema = Yup.object().shape({
    comment: Yup.string().required('Required'),
  })

  return (
    <Formik
      initialValues={{
        proposalName: proposalName,
        comment: '',
        proposalId: proposalId,
        supervisorEmail: supervisorEmail,
        actionType: 'ACCEPT',
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
        toast.success('Proposal accepted successfully!')
      }}
    >
      <Form>
        <div>
          Once you accept this proposal, the student will be asked to verify the
          matching. The proposal will be removed from the proposal market and
          assigned to you for supervision. You will work directly with the
          student to finalize the proposal and get the thesis process started.
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
          <FormikTextareaField
            required
            name="comment"
            label="Follow-Up"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <div className="mt-2 italic">
            Your message will be sent to the student alongside your acceptance
            notification.
          </div>
        </div>

        <Button className={{ root: 'mt-2' }} type="submit">
          Accept Proposal
        </Button>
        <Toaster />
      </Form>
    </Formik>
  )
}

function TentativeAcceptProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
}) {
  const SignupSchema = Yup.object().shape({
    comment: Yup.string().required('Required'),
  })

  return (
    <Formik
      initialValues={{
        proposalName: proposalName,
        comment: '',
        proposalId: proposalId,
        supervisorEmail: supervisorEmail,
        actionType: 'ACCEPT_TENTATIVE',
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
        toast.success('Proposal tentatively accepted successfully!')
      }}
    >
      <Form>
        <div>
          When you accept the proposal tentatively, the student will receive
          your feedback and is required to improve the proposal before you
          finally accept the proposal for supervision.
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
          <FormikTextareaField
            required
            name="comment"
            label="Feedback"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <div className="mt-2 italic">
            Your message will be sent to the student alongside your notification
            of interest.
          </div>
        </div>

        <Button className={{ root: 'mt-2' }} type="submit">
          Accept Proposal (Tentative)
        </Button>
        <Toaster />
      </Form>
    </Formik>
  )
}

function RejectProposalForm({ proposalName, proposalId, supervisorEmail }) {
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
        actionType: 'REJECT',
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
        toast.success('Proposal rejected successfully!')
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
              { value: 'TOO_BROAD', label: 'Proposal too broad' },
              {
                value: 'NOT_SCIENTIFIC',
                label: 'Proposal not sufficiently scientific',
              },
              {
                value: 'NOT_CLEAR',
                label: 'Proposal or scope not clear',
              },
              {
                value: 'FORMAT',
                label: 'Format unsuitable',
              },
              {
                value: 'TOPIC_AREA_INVALID',
                label: 'Mismatch in topic area',
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
            Why do you recommend this proposal for rejection? Your comment will
            not be shown to the student.
          </div>
        </div>

        <Button className={{ root: 'mt-2' }} type="submit">
          Reject Proposal
        </Button>
        <Toaster />
      </Form>
    </Formik>
  )
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
