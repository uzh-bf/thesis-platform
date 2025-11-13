import { BlobServiceClient } from '@azure/storage-blob'
import {
  Button,
  FormikSelectField,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import { Form, Formik } from 'formik'
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
  const [researchProposalPDF, setResearchProposalPDF] = useState<any[]>([])
  const [furtherAttachments, setFurtherAttachments] = useState<any[]>([])

  const mutation = trpc.generateSasQueryToken.useMutation()
  const submitProposal = trpc.submitProposalPublish.useMutation()
  const topicAreasQuery = trpc.getTopicAreas.useQuery()
  const personsResponsible = trpc.getAllPersonsResponsible.useQuery()

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
      .test(
        'uzh-domain',
        'Please enter a UZH email address (e.g., @uzh.ch, @df.uzh.ch)',
        (value) => {
          if (value) {
            const domain = value.split('@')[1]
            return domain === 'uzh.ch' || domain?.endsWith('.uzh.ch')
          }
          return true
        }
      )
      .required('Required'),
    personResponsible: Yup.string().required('Required'),
    bachelorOrMasterLevel: Yup.string().required('Required'),
    proposalLanguage: Yup.string().required('Required'),
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
        proposalTitle: '',
        proposalSummary: '',
        fieldOfResearch: '',
        supervisor: '',
        personResponsible: '',
        bachelorOrMasterLevel: '',
        proposalLanguage: '',
        timeFrame: '',
        researchProposalPDF: null,
        furtherAttachments: null,
      }}
      validationSchema={ProposalPublishSchema}
      onSubmit={async (values, { resetForm }) => {
        try {
          const languages = [values.proposalLanguage]
          
          await submitProposal.mutateAsync({
            ...values,
            proposalLanguage: JSON.stringify(languages),
          })
          toast.success('Proposal submitted successfully!')
          resetForm()
          setResearchProposalPDF([])
          setFurtherAttachments([])
          onSuccess?.()
        } catch (error) {
          toast.error('Failed to submit proposal. Please try again.')
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
            <FormikTextField
              required
              name="supervisor"
              label="Supervisor Email"
              placeholder="supervisor@uzh.ch"
              className={{
                label: 'font-sans text-lg',
                field: 'flex-col',
              }}
            />
            <FormikSelectField
              required
              name="personResponsible"
              label="Person Responsible"
              placeholder="Select person responsible"
              items={
                personsResponsible.data?.map((person) => ({
                  value: person.name,
                  label: person.name,
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
            <FormikSelectField
              required
              name="proposalLanguage"
              label="Primary Proposal Language"
              placeholder="Select primary language"
              items={languageOptions}
              className={{
                label: 'font-sans text-lg',
              }}
            />
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
                disabled={
                  !formikProps.values.supervisor.includes('@') ||
                  !(
                    formikProps.values.supervisor.split('@')[1] === 'uzh.ch' ||
                    formikProps.values.supervisor.split('@')[1]?.endsWith('.uzh.ch')
                  )
                }
              >
                {({ getRootProps, getInputProps }) => {
                  const email = formikProps.values.supervisor
                  const domain = email.split('@')[1]
                  const isValidUzhEmail = domain === 'uzh.ch' || domain?.endsWith('.uzh.ch')
                  
                  return (
                    <section>
                      <div
                        {...getRootProps()}
                        className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                      >
                        <input type="file" {...getInputProps()} />
                        <p className="p-2 text-base">
                          {!isValidUzhEmail
                            ? 'Enter your UZH Email before uploading files ⚠️'
                            : researchProposalPDF.length > 0
                            ? `Attached File 📄: '${researchProposalPDF[0].name}'`
                            : 'Drag and drop your file 🗃️ here, or click to select the file'}
                        </p>
                      </div>
                    </section>
                  )
                }}
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
                disabled={
                  !formikProps.values.supervisor.includes('@') ||
                  !(
                    formikProps.values.supervisor.split('@')[1] === 'uzh.ch' ||
                    formikProps.values.supervisor.split('@')[1]?.endsWith('.uzh.ch')
                  )
                }
              >
                {({ getRootProps, getInputProps }) => {
                  const email = formikProps.values.supervisor
                  const domain = email.split('@')[1]
                  const isValidUzhEmail = domain === 'uzh.ch' || domain?.endsWith('.uzh.ch')
                  
                  return (
                    <section>
                      <div
                        {...getRootProps()}
                        className="flex items-center justify-center w-full text-2xl border border-dashed rounded bg-gray-50"
                      >
                        <input type="file" {...getInputProps()} />
                        <p className="p-2 text-base">
                          {!isValidUzhEmail
                            ? 'Enter your UZH Email before uploading files ⚠️'
                            : furtherAttachments.length > 0
                            ? `Attached File 📄: '${furtherAttachments[0].name}'`
                            : 'Drag and drop your file 🗃️ here, or click to select the file'}
                        </p>
                      </div>
                    </section>
                  )
                }}
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
