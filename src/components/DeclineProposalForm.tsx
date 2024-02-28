import {
  Button,
  FormikSelectField,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import { Form, Formik } from 'formik'
import toast, { Toaster } from 'react-hot-toast'
import { trpc } from 'src/lib/trpc'
import * as Yup from 'yup'

interface DeclineProposalFormProps {
  proposalName: string
  proposalId: string
  supervisorEmail: string
  setProvidedFeedback: (value: string) => void
}

export default function DeclineProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
  setProvidedFeedback,
}: DeclineProposalFormProps) {
  const SignupSchema = Yup.object().shape({
    reason: Yup.string().required('Required'),
    comment: Yup.string().required('Required'),
  })

  const submitFeedback = trpc.submitProposalFeedback.useMutation()

  return (
    <Formik
      initialValues={{
        proposalName: proposalName,
        reason: undefined,
        comment: '',
        proposalId: proposalId,
        supervisorEmail: supervisorEmail,
        actionType: 'DECLINE',
      }}
      validationSchema={SignupSchema}
      onSubmit={async (values, { resetForm }) => {
        resetForm()
        setProvidedFeedback('DECLINE')
        await submitFeedback.mutateAsync(values)
        toast.success('Proposal declined successfully!')
      }}
    >
      <Form>
        <div>
          Declining this proposal because of a mismatch of interests or a high
          workload on your side will keep it available for other supervisors.
        </div>
        <div className="flex flex-col gap-3 mt-4">
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
            placeholder="Select a reason..."
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
          <div className="italic">
            Why do you decline this proposal specifically? Your comment will not
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
