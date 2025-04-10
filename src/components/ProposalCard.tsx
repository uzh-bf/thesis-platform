import {
  faCircleCheck,
  faHourglassHalf,
} from '@fortawesome/free-regular-svg-icons'
import { faCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { inferProcedureOutput } from '@trpc/server'
import { Button } from '@uzh-bf/design-system'
import { useSession } from 'next-auth/react'
import { ProposalType, UserRole } from 'src/lib/constants'
import { AppRouter } from 'src/server/routers/_app'
import { twMerge } from 'tailwind-merge'
import { format, differenceInWeeks, differenceInMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { useMemo } from 'react'

type Proposals = inferProcedureOutput<AppRouter['proposals']>
type ProposalDetails = any // Using any temporarily to fix TypeScript errors
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
    (session?.user?.role === UserRole.SUPERVISOR ||
      session?.user?.role === UserRole.DEVELOPER) &&
    proposal.receivedFeedbacks?.length > 0

  const isUrgent = useMemo(() => {
    if (proposal.typeKey !== 'STUDENT') return false
    const weeksOld = differenceInWeeks(new Date(), new Date(proposal.createdAt))
    return weeksOld >= 3 && proposal.statusKey === 'OPEN'
  }, [proposal])

  const isRecentlyActive = useMemo(() => {
    // Check if proposal was accepted within the last 6 months
    if (proposal.statusKey === 'MATCHED') {
      const monthsOld = differenceInMonths(new Date(), new Date(proposal.updatedAt))
      return monthsOld <= 6
    }
    // Check if supervision relationship was created within the last 6 months
    if (proposal.supervisedBy && proposal.supervisedBy.length > 0) {
      const supervisorRelation = proposal.supervisedBy.find(
        (relation: { supervisorEmail: string; createdAt: string | Date }) => 
          relation.supervisorEmail === session?.user?.email
      )
      if (supervisorRelation) {
        const monthsOld = differenceInMonths(
          new Date(), 
          new Date(supervisorRelation.createdAt)
        )
        return monthsOld <= 6
      }
    }
    return false
  }, [proposal, session?.user?.email])

  return (
    <Button
      key={proposal.id}
      className={{
        root: twMerge(
          'flex flex-row md:flex-col justify-between w-full md:w-64 p-2 text-right md:text-center text-sm',
          (proposal.isOwnProposal || proposal.isSupervisedProposal) &&
            'border-orange-300',
          hasFeedback && 'bg-slate-100 border-slate-200',
          isUrgent && 'bg-red-50 border-red-200',
          isRecentlyActive && proposal.statusKey === 'MATCHED' && 'border-green-400',
          !isRecentlyActive && proposal.statusKey === 'MATCHED' && 'bg-gray-100 text-gray-600'
        ),
      }}
      active={isActive}
      onClick={onClick}
      title={
        proposal.statusKey === 'MATCHED'
          ? isRecentlyActive
            ? 'Active proposal (accepted within the last 6 months)'
            : 'Inactive proposal (accepted more than 6 months ago)'
          : undefined
      }
    >
      {proposal.statusKey === 'MATCHED_TENTATIVE' &&
      proposal.supervisedBy[0]?.supervisorEmail === session?.user?.email ? (
        <FontAwesomeIcon icon={faHourglassHalf} />
      ) : proposal.statusKey === 'MATCHED' &&
        proposal.supervisedBy[0]?.supervisorEmail === session?.user?.email ? (
        <div className="flex items-center">
          <FontAwesomeIcon icon={faCircleCheck} />
          {isRecentlyActive && (
            <FontAwesomeIcon 
              icon={faCircle} 
              className="text-green-500 ml-1 text-xs" 
              title="Active proposal (accepted within the last 6 months)" 
            />
          )}
        </div>
      ) : isUrgent ? (
        <FontAwesomeIcon icon={faHourglassHalf} className="text-red-500" />
      ) : null}
      <div className="font-bold">{proposal.title}</div>
      <div className="mt-1 space-y-1 text-xs">
        <div>{proposal.studyLevel}</div>
        <div>{proposal.topicArea.name}</div>
        <div>
          {proposal.typeKey === ProposalType.STUDENT
            ? proposal.applications?.[0]?.fullName
            : proposal.supervisedBy?.name}
        </div>
        <div className="text-gray-600">
          Erstellt am {format(new Date(proposal.createdAt), 'dd.MM.yyyy', { locale: de })}
        </div>
        {hasFeedback && (
          <div>
            {proposal.receivedFeedbacks?.map((feedback: { typeKey: string }) => feedback.typeKey)}
          </div>
        )}
      </div>
    </Button>
  )
}
