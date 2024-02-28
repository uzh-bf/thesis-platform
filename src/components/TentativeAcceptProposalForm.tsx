import {
  Button,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import { Form, Formik } from 'formik'
import toast, { Toaster } from 'react-hot-toast'
import { trpc } from 'src/lib/trpc'
import * as Yup from 'yup'

interface TentativeAcceptProposalFormProps {
  proposalName: string
  proposalId: string
  supervisorEmail: string
  setProvidedFeedback: (value: string) => void
}

export default function TentativeAcceptProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
  setProvidedFeedback,
}: TentativeAcceptProposalFormProps) {
  const SignupSchema = Yup.object().shape({
    comment: Yup.string().required('Required'),
  })

  const submitFeedback = trpc.submitProposalFeedback.useMutation()

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
        resetForm()
        setProvidedFeedback('ACCEPT_TENTATIVE')
        await submitFeedback.mutateAsync(values)
        toast.success('Proposal tentatively accepted successfully!')
      }}
    >
      <Form>
        <div>
          When you accept the proposal tentatively, the student will receive
          your feedback and is required to improve the proposal before you
          finally accept the proposal for supervision.
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
          <FormikTextareaField
            required
            name="comment"
            label="Feedback"
            className={{
              label: 'font-sans text-lg',
              field: 'flex-col',
            }}
          />
          <div className="italic">
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
