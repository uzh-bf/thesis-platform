import { BlobServiceClient } from '@azure/storage-blob'
import {
  Button,
  FormikSelectField,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import { Field, Form, Formik } from 'formik'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import Dropzone from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import { trpc } from 'src/lib/trpc'
import * as Yup from 'yup'

interface ProposalPublishFormProps {
  onSuccess?: () => void
}

export default function ProposalPublishForm({
  onSuccess,
}: ProposalPublishFormProps) {
  const { data: session } = useSession()
  const [researchProposalPDF, setResearchProposalPDF] = useState<any[]>([])
  const [furtherAttachments, setFurtherAttachments] = useState<any[]>([])

  const mutation = trpc.generateSasQueryToken.useMutation()
  const submitProposal = trpc.submitProposalPublish.useMutation()
  const topicAreasQuery = trpc.getTopicAreas.useQuery()
  const personsResponsible = trpc.getAllPersonsResponsible.useQuery()
  const supervisorsQuery = trpc.getAllSupervisors.useQuery()

  const handleFileFieldChange =
    (fieldKey: string, fileName: string, formikProps: any) =>
    async (files: any[]) => {
      const file = files[0]
      const { SAS_STRING } = await mutation.mutateAsync()
      const blobServiceClient = new BlobServiceClient(
        `${process.env.NEXT_PUBLIC_BLOBSERVICECLIENT_URL}${SAS_STRING}`
      )
      const containerClient = blobServiceClient.getContainerClient(
        process.env.NEXT_PUBLIC_CONTAINER_NAME!
      )
      const name = `${formikProps.values.supervisor}-${fileName}-${Date.now()}.pdf`
      const blobClient = containerClient.getBlobClient(name)
      const blockBlobClient = blobClient.getBlockBlobClient()
      await blockBlobClient.uploadData(file, {
        blockSize: 4 * 1024 * 1024, // 4MB block size
      })
      if (fieldKey === 'researchProposalPDF') {
        setResearchProposalPDF([file])
      } else {
        setFurtherAttachments([file])
      }
      formikProps.setFieldValue(fieldKey, name)
    }

  const ProposalPublishSchema = Yup.object().shape({
    proposalTitle: Yup.string()
      .min(5, 'Must be at least 5 characters')
      .required('Required'),
    proposalSummary: Yup.string()
      .min(100, 'Must be at least 100 characters')
      .required('Required'),
    fieldOfResearch: Yup.string().required('Required'),
    supervisor: Yup.string()
      .email('Invalid email')
      .required('Required'),
    personResponsibleEmail: Yup.string()
      .email('Invalid email')
      .required('Required'),
    bachelorOrMasterLevel: Yup.string().required('Required'),
    proposalLanguage: Yup.array().min(1, 'At least one language is required').required('Required'),
    timeFrame: Yup.string().required('Required'),
    researchProposalPDF: Yup.string().nullable(),
    furtherAttachments: Yup.string().nullable(),
  })

  const studyLevelOptions = [
    { value: 'Bachelor Thesis (18 ECTS)', label: 'Bachelor Thesis (18 ECTS)' },
    { value: 'Master Thesis (30 ECTS)', label: 'Master Thesis (30 ECTS)' },
  ]

  const languageOptions = [
    { value: 'English', label: 'English' },
    { value: 'German', label: 'German' },
  ]

  return (
    <Formik
      initialValues={{
        responder: session?.user?.email || '',
        proposalTitle: '',
        proposalSummary: '',
        fieldOfResearch: '',
        supervisor: '',
        personResponsibleEmail: '',
        bachelorOrMasterLevel: '',
        proposalLanguage: [],
        timeFrame: '',
        researchProposalPDF: null,
        furtherAttachments: null,
      }}
      validationSchema={ProposalPublishSchema}
      onSubmit={async (values, { resetForm }) => {
        try {
          await submitProposal.mutateAsync({
            ...values,
            responder: session?.user?.email || '',
            proposalLanguage: JSON.stringify(values.proposalLanguage),
          })
          toast.success('Proposal submitted successfully!')
          resetForm()
          setResearchProposalPDF([])
          setFurtherAttachments([])
          onSuccess?.()
        } catch (error: any) {
          console.error('Form submission error:', error)
          const errorMessage = error?.message || 'Failed to submit proposal. Please try again.'
          toast.error(errorMessage)
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <div className="space-y-4">
            <FormikTextField
              required
              name="proposalTitle"
              label="Proposal Title"
              placeholder="Enter proposal title"
              className={{
                label: 'font-sans text-lg',
                field: 'flex-col',
              }}
            />
            <FormikTextareaField
              required
              name="proposalSummary"
              label="Proposal Summary"
              placeholder="Provide a detailed summary of your proposal (minimum 100 characters)"
              className={{
                label: 'font-sans text-lg',
                field: 'flex-col',
              }}
              rows={6}
            />
            <FormikSelectField
              required
              name="fieldOfResearch"
              label="Field of Research"
              placeholder="Select field of research"
              items={
                topicAreasQuery.data?.map((area) => ({
                  value: area.slug,
                  label: area.name,
                })) || []
              }
              className={{
                label: 'font-sans text-lg',
              }}
            />
            <FormikSelectField
              required
              name="supervisor"
              label="Supervisor"
              placeholder="Select supervisor"
              items={
                supervisorsQuery.data?.map((supervisor) => ({
                  value: supervisor.email,
                  label: `${supervisor.email}`,
                })) || []
              }
              className={{
                label: 'font-sans text-lg',
              }}
            />
            <FormikSelectField
              required
              name="personResponsibleEmail"
              label="Person Responsible"
              placeholder="Select person responsible"
              items={
                personsResponsible.data?.map((person) => ({
                  value: person.email,
                  label: `${person.email}`,
                })) || []
              }
              className={{
                label: 'font-sans text-lg',
              }}
            />
            <FormikSelectField
              required
              name="bachelorOrMasterLevel"
              label="Study Level"
              placeholder="Select study level"
              items={studyLevelOptions}
              className={{
                label: 'font-sans text-lg',
              }}
            />
            <div className="space-y-2">
              <label className="font-sans text-lg font-bold">
                Proposal Language <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {languageOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2">
                    <Field
                      type="checkbox"
                      name="proposalLanguage"
                      value={option.value}
                      className="w-4 h-4"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {formikProps.errors.proposalLanguage && formikProps.touched.proposalLanguage && (
                <div className="text-sm text-red-500">
                  {formikProps.errors.proposalLanguage}
                </div>
              )}
            </div>
            <FormikTextField
              required
              name="timeFrame"
              label="Time Frame"
              placeholder="e.g., 6 months starting from September 2025"
              className={{
                label: 'font-sans text-lg',
                field: 'flex-col',
              }}
            />

            <div>
              <div className="flex flex-row pt-2 text-lg font-bold">
                <div>Research Proposal PDF (Optional)</div>
              </div>
              <Dropzone
                onDrop={handleFileFieldChange(
                  'researchProposalPDF',
                  'proposal',
                  formikProps
                )}
                multiple={false}
                accept={{ 'application/pdf': ['.pdf'] }}
                disabled={!formikProps.values.supervisor}
              >
                {({ getRootProps, getInputProps }) => (
                  <section>
                    <div
                      {...getRootProps()}
                      className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                    >
                      <input type="file" {...getInputProps()} />
                      <p className="p-2 text-base">
                        {!formikProps.values.supervisor
                          ? 'Select a supervisor before uploading files ⚠️'
                          : researchProposalPDF.length > 0
                          ? `Attached File 📄: '${researchProposalPDF[0].name}'`
                          : 'Drag and drop your file 🗃️ here, or click to select the file'}
                      </p>
                    </div>
                  </section>
                )}
              </Dropzone>
            </div>

            <div>
              <div className="flex flex-row pt-2 text-lg font-bold">
                <div>Further Attachments (Optional)</div>
              </div>
              <Dropzone
                onDrop={handleFileFieldChange(
                  'furtherAttachments',
                  'attachments',
                  formikProps
                )}
                multiple={false}
                accept={{ 'application/pdf': ['.pdf'] }}
                disabled={!formikProps.values.supervisor}
              >
                {({ getRootProps, getInputProps }) => (
                  <section>
                    <div
                      {...getRootProps()}
                      className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                    >
                      <input type="file" {...getInputProps()} />
                      <p className="p-2 text-base">
                        {!formikProps.values.supervisor
                          ? 'Select a supervisor before uploading files ⚠️'
                          : furtherAttachments.length > 0
                          ? `Attached File 📄: '${furtherAttachments[0].name}'`
                          : 'Drag and drop your file 🗃️ here, or click to select the file'}
                      </p>
                    </div>
                  </section>
                )}
              </Dropzone>
            </div>

            <div>
              <Button 
                className={{ root: 'mt-2' }} 
                type="submit"
                disabled={submitProposal.isPending}
              >
                {submitProposal.isPending ? 'Submitting...' : 'Submit Proposal'}
              </Button>
              <Toaster />
            </div>
          </div>
        </Form>
      )}
    </Formik>
  )
}
