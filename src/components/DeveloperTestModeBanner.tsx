import { Button } from '@uzh-bf/design-system'
import toast from 'react-hot-toast'
import { trpc } from 'src/lib/trpc'

interface DeveloperTestModeBannerProps {
  refetch: () => void
}

export default function DeveloperTestModeBanner({
  refetch,
}: DeveloperTestModeBannerProps) {
  const createTestStudentProposal =
    trpc.developerCreateTestStudentProposal.useMutation({
      onSuccess: () => {
        toast.success('Test student proposal created')
        refetch()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })

  const deleteTestData = trpc.developerDeleteTestData.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Deleted ${result.deletedProposals} test proposal${
          result.deletedProposals === 1 ? '' : 's'
        }`
      )
      refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="mb-6 rounded-lg border border-[#F3AB00] bg-[#FFF8EA] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="m-0 text-sm font-semibold text-[#121212]">
            Developer test mode
          </p>
          <p className="m-0 mt-1 text-sm text-[#4C4C4C]">
            Proposals, applications, and feedback you submit are stored as test
            data: they are hidden from students, supervisors, and admin views,
            and no emails, Power Automate flows, or newsletter drafts are
            triggered. Look for the{' '}
            <span className="rounded-full bg-[#FFE8CC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8A4B00]">
              Test
            </span>{' '}
            badge.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => createTestStudentProposal.mutate()}
            disabled={createTestStudentProposal.isPending}
          >
            {createTestStudentProposal.isPending
              ? 'Creating...'
              : 'Create test student proposal'}
          </Button>
          <Button
            onClick={() => {
              if (
                window.confirm(
                  'Delete ALL test proposals including their applications, feedback, and attachments? Production data is not affected.'
                )
              ) {
                deleteTestData.mutate({})
              }
            }}
            disabled={deleteTestData.isPending}
          >
            {deleteTestData.isPending ? 'Deleting...' : 'Delete all test data'}
          </Button>
        </div>
      </div>
    </div>
  )
}
