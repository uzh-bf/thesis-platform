import {
  Button,
  FormikDatePicker,
  FormikSelectField,
  FormikSwitchField,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import dayjs from 'dayjs'
import { Field, Form, Formik } from 'formik'
import { useState } from 'react'
import Dropzone from 'react-dropzone'
import toast from 'react-hot-toast'
import { uploadFileToBlob } from 'src/lib/blobUpload'
import { MAX_FURTHER_SUBMISSION_ATTACHMENTS } from 'src/lib/constants'
import { trpc } from 'src/lib/trpc'
import * as Yup from 'yup'

type SingleFileKey = 'proposalFile' | 'cvFile' | 'transcriptFile'
type UploadPurpose =
  | 'submission-proposal'
  | 'submission-cv'
  | 'submission-transcript'
  | 'submission-attachment'

interface UploadedFile {
  blobName: string
  fileName: string
}

const SINGLE_FILES: {
  key: SingleFileKey
  label: string
  purpose: UploadPurpose
}[] = [
  {
    key: 'proposalFile',
    label: 'Research Proposal (PDF)',
    purpose: 'submission-proposal',
  },
  { key: 'cvFile', label: 'Personal CV (PDF)', purpose: 'submission-cv' },
  {
    key: 'transcriptFile',
    label: 'Transcript of Records (PDF)',
    purpose: 'submission-transcript',
  },
]

const studyLevelOptions = [
  { value: 'Bachelor Thesis (18 ECTS)', label: 'Bachelor Thesis (18 ECTS)' },
  { value: 'Master Thesis (30 ECTS)', label: 'Master Thesis (30 ECTS)' },
]

const languageOptions = [
  { value: 'English', label: 'English' },
  { value: 'German', label: 'German' },
]

const isUzhEmail = (email: string) =>
  email.trim().toLowerCase().endsWith('@uzh.ch')

const SubmissionSchema = Yup.object().shape({
  uzhemail: Yup.string()
    .email('Invalid email')
    .test('uzh-domain', 'Please enter your @uzh.ch email address', (value) =>
      value ? isUzhEmail(value) : true
    )
    .required('Required'),
  fullName: Yup.string()
    .test(
      'at-least-two-words',
      'Full name must consist of at least two words',
      (value) => (value ? value.trim().split(/\s+/).length >= 2 : true)
    )
    .required('Required'),
  matriculationNumber: Yup.string()
    .matches(/^\d{1,2}-\d{3}-\d{3}$/, 'Invalid matriculation number')
    .required('Required'),
  title: Yup.string()
    .min(5, 'Must be at least 5 characters')
    .required('Required'),
  description: Yup.string()
    .min(100, 'Must be at least 100 characters')
    .required('Required'),
  topicAreaSlug: Yup.string().required('Required'),
  studyLevel: Yup.string().required('Required'),
  language: Yup.array()
    .min(1, 'At least one language is required')
    .required('Required'),
  plannedStartAt: Yup.date().required('Required'),
  motivation: Yup.string()
    .min(200, 'Must be at least 200 characters')
    .required('Required'),
  additionalStudentComment: Yup.string(),
  proposalFile: Yup.string().required('Required'),
  cvFile: Yup.string().required('Required'),
  transcriptFile: Yup.string().required('Required'),
  allowUsage: Yup.boolean().required('Required'),
  allowPublication: Yup.boolean().required('Required'),
})

interface StudentProposalFormProps {
  onSuccess?: () => void
}

export default function StudentProposalForm({
  onSuccess,
}: StudentProposalFormProps) {
  const [fileNames, setFileNames] = useState<
    Partial<Record<SingleFileKey, string>>
  >({})
  const [furtherAttachments, setFurtherAttachments] = useState<UploadedFile[]>(
    []
  )
  const [uploadingCount, setUploadingCount] = useState(0)
  const [startDate] = useState(() => dayjs().format('YYYY-MM-DD'))

  const sasToken = trpc.generateSasQueryToken.useMutation()
  const submitProposal = trpc.submitStudentProposal.useMutation()
  const topicAreasQuery = trpc.getTopicAreas.useQuery()

  const uploadFile = async (
    file: File,
    purpose: UploadPurpose
  ): Promise<UploadedFile | null> => {
    setUploadingCount((count) => count + 1)
    try {
      const { blobName, uploadUrl } = await sasToken.mutateAsync({
        requestedFileName: file.name,
        contentType: 'application/pdf',
        size: file.size,
        purpose,
      })
      await uploadFileToBlob({ file, uploadUrl })
      return { blobName, fileName: file.name }
    } catch (error: any) {
      console.error('Submission upload error:', error)
      toast.error(
        error?.message || `Failed to upload ${file.name}. Please try again.`
      )
      return null
    } finally {
      setUploadingCount((count) => count - 1)
    }
  }

  return (
    <Formik
      initialValues={{
        uzhemail: '',
        fullName: '',
        matriculationNumber: '',
        title: '',
        description: '',
        topicAreaSlug: '',
        studyLevel: '',
        language: [] as string[],
        plannedStartAt: startDate,
        motivation: '',
        additionalStudentComment: '',
        proposalFile: '',
        cvFile: '',
        transcriptFile: '',
        allowUsage: true,
        allowPublication: true,
      }}
      validationSchema={SubmissionSchema}
      onSubmit={async (values, { resetForm }) => {
        try {
          await submitProposal.mutateAsync({
            ...values,
            language: JSON.stringify(values.language),
            plannedStartAt: dayjs(values.plannedStartAt).format('YYYY-MM-DD'),
            furtherAttachments: furtherAttachments.map(
              (attachment) => attachment.blobName
            ),
          })
        } catch (error: any) {
          console.error('Proposal submission error:', error)
          toast.error(
            error?.message ||
              'Failed to submit your proposal. Please try again.'
          )
          return
        }
        resetForm()
        setFileNames({})
        setFurtherAttachments([])
        onSuccess?.()
        toast.success(
          'Proposal submitted successfully! You will receive a confirmation email.'
        )
      }}
    >
      {(formikProps) => {
        const uploadDisabled = !isUzhEmail(formikProps.values.uzhemail)
        const dropzoneHint = (attached: string | undefined) =>
          uploadDisabled
            ? 'Enter your UZH Email before uploading files ⚠️'
            : attached
              ? `Attached File 📄: '${attached}'`
              : 'Drag and drop your file 🗃️ here, or click to select the file'

        return (
          <Form>
            <div className="space-y-4">
              <FormikTextField
                required
                name="uzhemail"
                label="UZH Email"
                placeholder="firstname.lastname@uzh.ch"
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />
              <FormikTextField
                required
                name="fullName"
                label="Full Name"
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />
              <FormikTextField
                required
                name="matriculationNumber"
                label="Matriculation Number"
                placeholder="12-345-678"
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />
              <FormikTextField
                required
                name="title"
                label="Proposed Title"
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />
              <FormikTextareaField
                required
                name="description"
                label="Summary"
                placeholder="Summarize your proposal (minimum 100 characters)"
                rows={6}
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />
              <FormikSelectField
                required
                name="topicAreaSlug"
                label="Field of Research"
                placeholder="Select field of research"
                items={
                  topicAreasQuery.data?.map((area) => ({
                    value: area.slug,
                    label: area.name,
                  })) || []
                }
                className={{ label: 'font-sans text-lg' }}
              />
              <FormikSelectField
                required
                name="studyLevel"
                label="Study Level"
                placeholder="Select study level"
                items={studyLevelOptions}
                className={{ label: 'font-sans text-lg' }}
              />
              <div className="space-y-2">
                <label className="font-sans text-lg font-bold">
                  Thesis Language <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {languageOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Field
                        type="checkbox"
                        name="language"
                        value={option.value}
                        className="w-4 h-4"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                {formikProps.errors.language &&
                  formikProps.touched.language && (
                    <div className="text-sm text-red-500">
                      {formikProps.errors.language}
                    </div>
                  )}
              </div>
              <FormikDatePicker
                required
                name="plannedStartAt"
                label="Planned Start Date"
                className={{ label: 'pt-2 font-sans font-bold text-lg' }}
              />
              <FormikTextareaField
                required
                name="motivation"
                label="Motivation"
                placeholder="Why this topic? (minimum 200 characters)"
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />
              <FormikTextareaField
                name="additionalStudentComment"
                label="Additional Comment (Optional)"
                className={{ label: 'font-sans text-lg', field: 'flex-col' }}
              />

              {SINGLE_FILES.map(({ key, label, purpose }) => (
                <div key={key}>
                  <div className="flex flex-row pt-2 text-lg font-bold">
                    <div>{label}</div>
                    <div className="mb-1 ml-0.5 mr-2 text-red-600">*</div>
                  </div>
                  <Dropzone
                    onDrop={async (files) => {
                      if (!files[0]) return
                      const uploaded = await uploadFile(files[0], purpose)
                      if (!uploaded) return
                      setFileNames((names) => ({
                        ...names,
                        [key]: uploaded.fileName,
                      }))
                      formikProps.setFieldValue(key, uploaded.blobName)
                    }}
                    multiple={false}
                    accept={{ 'application/pdf': ['.pdf'] }}
                    disabled={uploadDisabled}
                  >
                    {({ getRootProps, getInputProps }) => (
                      <section>
                        <div
                          {...getRootProps()}
                          className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                        >
                          <input type="file" {...getInputProps()} />
                          <p className="p-2 text-base">
                            {dropzoneHint(fileNames[key])}
                          </p>
                        </div>
                      </section>
                    )}
                  </Dropzone>
                  {formikProps.errors[key] && formikProps.submitCount > 0 && (
                    <div className="text-sm text-red-500">
                      {formikProps.errors[key]}
                    </div>
                  )}
                </div>
              ))}

              <div>
                <div className="flex flex-row pt-2 text-lg font-bold">
                  <div>
                    Further Attachments (Optional, up to{' '}
                    {MAX_FURTHER_SUBMISSION_ATTACHMENTS} PDFs)
                  </div>
                </div>
                <Dropzone
                  onDrop={async (files) => {
                    const room =
                      MAX_FURTHER_SUBMISSION_ATTACHMENTS -
                      furtherAttachments.length
                    if (files.length > room) {
                      toast.error(
                        `You can attach up to ${MAX_FURTHER_SUBMISSION_ATTACHMENTS} further files`
                      )
                    }
                    for (const file of files.slice(0, Math.max(room, 0))) {
                      const uploaded = await uploadFile(
                        file,
                        'submission-attachment'
                      )
                      if (uploaded) {
                        setFurtherAttachments((current) => [
                          ...current,
                          uploaded,
                        ])
                      }
                    }
                  }}
                  multiple
                  accept={{ 'application/pdf': ['.pdf'] }}
                  disabled={
                    uploadDisabled ||
                    furtherAttachments.length >=
                      MAX_FURTHER_SUBMISSION_ATTACHMENTS
                  }
                >
                  {({ getRootProps, getInputProps }) => (
                    <section>
                      <div
                        {...getRootProps()}
                        className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                      >
                        <input type="file" {...getInputProps()} />
                        <p className="p-2 text-base">
                          {dropzoneHint(undefined)}
                        </p>
                      </div>
                    </section>
                  )}
                </Dropzone>
                {furtherAttachments.length > 0 && (
                  <ul className="pt-2 text-sm">
                    {furtherAttachments.map((attachment) => (
                      <li
                        key={attachment.blobName}
                        className="flex items-center gap-2"
                      >
                        <span>📄 {attachment.fileName}</span>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() =>
                            setFurtherAttachments((current) =>
                              current.filter(
                                (item) => item.blobName !== attachment.blobName
                              )
                            )
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 text-lg font-bold sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-[#E9E9E9] bg-white p-3">
                  <FormikSwitchField
                    name="allowUsage"
                    label="Allow Usage"
                    tooltip={`I hereby consent and grant the University of Zurich, represented by the ${process.env.NEXT_PUBLIC_DEPARTMENT_LONG_NAME}, the rights of use to my written work and all artifacts under copyright protection created in the context of my academic work.`}
                    required
                    size="sm"
                    className={{
                      tooltip: 'w-80 max-w-[calc(100vw-3rem)] sm:w-96',
                    }}
                  />
                </div>
                <div className="min-w-0 rounded-lg border border-[#E9E9E9] bg-white p-3">
                  <FormikSwitchField
                    name="allowPublication"
                    label="Allow Publication"
                    tooltip={`I agree to allow the University of Zurich, represented by the ${process.env.NEXT_PUBLIC_DEPARTMENT_LONG_NAME}, to publish my work in its entirety or in part on the Internet and distribute printed versions to interested parties.`}
                    required
                    size="sm"
                    className={{
                      tooltip: 'w-80 max-w-[calc(100vw-3rem)] sm:w-96',
                    }}
                  />
                </div>
              </div>

              <div>
                <Button
                  className={{ root: 'mt-2' }}
                  type="submit"
                  disabled={submitProposal.isPending || uploadingCount > 0}
                >
                  {submitProposal.isPending
                    ? 'Submitting...'
                    : uploadingCount > 0
                      ? 'Uploading...'
                      : 'Submit Proposal'}
                </Button>
              </div>
            </div>
          </Form>
        )
      }}
    </Formik>
  )
}
