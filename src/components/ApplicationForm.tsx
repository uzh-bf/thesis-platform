import { BlobServiceClient } from '@azure/storage-blob'
import {
  Button,
  FormikDateChanger,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import dayjs from 'dayjs'
import { Form, Formik } from 'formik'
import { useState } from 'react'
import Dropzone from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import useLocalStorage from 'src/lib/hooks/useLocalStorage'
import { trpc } from 'src/lib/trpc'
import * as Yup from 'yup'

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

export default ApplicationForm
