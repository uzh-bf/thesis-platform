import {
  Button,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import { Form, Formik } from 'formik'
import toast, { Toaster } from 'react-hot-toast'
import { trpc } from 'src/lib/trpc'
import * as Yup from 'yup'

interface AcceptProposalFormProps {
  proposalName: string
  proposalId: string
  supervisorEmail: string
}

export default function AcceptProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
}: AcceptProposalFormProps) {
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
        actionType: 'ACCEPT',
      }}
      validationSchema={SignupSchema}
      onSubmit={async (values, { resetForm }) => {
        await submitFeedback.mutateAsync(values)

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
