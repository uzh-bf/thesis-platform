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

interface RejectProposalFormProps {
  proposalName: string
  proposalId: string
  supervisorEmail: string
  feedbackGiven: boolean
  setFeedbackGiven: (value: boolean) => void
}

export default function RejectProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
  feedbackGiven,
  setFeedbackGiven,
}: RejectProposalFormProps) {
  const SignupSchema = Yup.object().shape({
    reason: Yup.string().required('Required'),
    comment: Yup.string().required('Required'),
  })

  const submitFeedback = trpc.submitProposalFeedback.useMutation()

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
        setFeedbackGiven(true)
        await submitFeedback.mutateAsync(values)
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

        <Button
          className={{ root: 'mt-2' }}
          type="submit"
          disabled={feedbackGiven}
        >
          Reject Proposal
        </Button>
        <Toaster />
      </Form>
    </Formik>
  )
}
