import type { inferRouterInputs } from '@trpc/server'
import toast from 'react-hot-toast'
import { trpc } from 'src/lib/trpc'
import type { AppRouter } from 'src/server/routers/_app'

type ProposalFeedbackInput =
  inferRouterInputs<AppRouter>['submitProposalFeedback']

/**
 * Returns a Formik submit handler for the proposal feedback forms. The form
 * switches to "feedback provided" only after the request succeeds, and the
 * supervisor is warned when the notification email could not be sent.
 */
export default function useSubmitProposalFeedback(
  setProvidedFeedback: (value: string) => void,
  successMessage: string
) {
  const submitFeedback = trpc.submitProposalFeedback.useMutation()

  return async (
    values: ProposalFeedbackInput,
    { resetForm }: { resetForm: () => void }
  ) => {
    try {
      const { emailSent } = await submitFeedback.mutateAsync(values)
      resetForm()
      setProvidedFeedback(values.actionType)
      toast.success(successMessage)
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
  }
}
