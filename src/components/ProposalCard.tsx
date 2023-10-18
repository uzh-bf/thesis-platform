import { inferProcedureOutput } from '@trpc/server'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { ProposalType, UserRole } from 'src/lib/constants'
import { AppRouter } from 'src/server/routers/_app'
import { twMerge } from 'tailwind-merge'

type Proposals = inferProcedureOutput<AppRouter['proposals']>
type ProposalDetails = Proposals[number]
export default function ProposalCard({
  proposal,
  isActive,
  onClick,
}: {
  proposal: ProposalDetails
  isActive: boolean
  onClick: () => void
}) {
  const { data: session } = useSession()

  const hasFeedback =
    session?.user?.role === UserRole.SUPERVISOR &&
    proposal.receivedFeedbacks?.length > 0

  return (
    <Button
      key={proposal.id}
      className={{
        root: twMerge(
          'flex flex-col justify-between w-full md:w-64 p-2 text-sm',
          (proposal.isOwnProposal || proposal.isSupervisedProposal) &&
            'border-orange-300',
          hasFeedback && 'bg-slate-100 border-slate-200'
        ),
      }}
      active={isActive}
      onClick={onClick}
    >
      <div className="font-bold">{proposal.title}</div>
      <div className="mt-1 space-y-1 text-xs">
        <div>{proposal.studyLevel}</div>
        <div>{proposal.topicArea.name}</div>
        <div>
          {proposal.typeKey === ProposalType.STUDENT
            ? proposal.applications?.[0]?.fullName
            : proposal.supervisedBy?.name}
        </div>
        {hasFeedback && (
          <div>
            {proposal.receivedFeedbacks?.map((feedback) => feedback.typeKey)}
          </div>
        )}
      </div>
    </Button>
  )
}
