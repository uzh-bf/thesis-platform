import {
  Button,
  FormikTextField,
  FormikTextareaField,
} from '@uzh-bf/design-system'
import { Form, Formik } from 'formik'
import toast, { Toaster } from 'react-hot-toast'
import * as Yup from 'yup'

export default function TentativeAcceptProposalForm({
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
