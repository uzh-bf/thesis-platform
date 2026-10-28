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
  setProvidedFeedback: (value: string) => void
}

export default function RejectProposalForm({
  proposalName,
  proposalId,
  supervisorEmail,
  setProvidedFeedback,
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
        reason: undefined,
        comment: '',
        proposalId: proposalId,
        supervisorEmail: supervisorEmail,
        actionType: 'REJECT' as const,
      }}
      validationSchema={SignupSchema}
      onSubmit={async (values, { resetForm }) => {
        try {
          const { emailSent } = await submitFeedback.mutateAsync(values)
          resetForm()
          setProvidedFeedback('REJECT')
          toast.success('Proposal rejected successfully!')
          if (!emailSent) {
            toast.error(
              'Your feedback was saved, but the notification email could not be sent.'
            )
          }
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Could not submit feedback'
          )
        }
      }}
    >
      <Form>
        <div>
          Rejecting this proposal because of lacking content quality or format
          requirements will cause review by the thesis coordinator. The student
          will need to improve and resubmit the proposal.
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
                value: 'FORMAT_UNSUITABLE',
                label: 'Format unsuitable',
              },
              {
                value: 'TOPIC_AREA_INVALID',
                label: 'Mismatch in topic area',
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
            Why do you recommend this proposal for rejection? Your comment will
            not be shown to the student.
          </div>
        </div>

        <Button className={{ root: 'my-2' }} type="submit">
          Reject Proposal
        </Button>
        <Toaster />
      </Form>
    </Formik>
  )
}
