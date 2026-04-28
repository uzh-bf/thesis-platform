import {
  faCircleCheck,
  faHourglassHalf,
} from '@fortawesome/free-regular-svg-icons'
import { faCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '@uzh-bf/design-system'
import { differenceInMonths, differenceInWeeks, format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { ProposalType, UserRole } from 'src/lib/constants'
import { twMerge } from 'tailwind-merge'

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
    return weeksOld >= 12 && proposal.statusKey === 'OPEN'
  }, [proposal])

  const isRecentlyActive = useMemo(() => {
    // Check if proposal was accepted within the last 6 months
    if (proposal.statusKey === 'MATCHED') {
      const monthsOld = differenceInMonths(
        new Date(),
        new Date(proposal.updatedAt)
      )
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

  const statusIcon =
    proposal.statusKey === 'MATCHED_TENTATIVE' &&
    proposal.supervisedBy?.[0]?.supervisorEmail === session?.user?.email ? (
      <FontAwesomeIcon icon={faHourglassHalf} />
    ) : proposal.statusKey === 'MATCHED' &&
      proposal.supervisedBy?.[0]?.supervisorEmail === session?.user?.email ? (
      <div className="flex items-center">
        <FontAwesomeIcon icon={faCircleCheck} />
        {isRecentlyActive && (
          <FontAwesomeIcon
            icon={faCircle}
            className="ml-1 text-xs text-[#28960C]"
            title="Active proposal (accepted within the last 6 months)"
          />
        )}
      </div>
    ) : isUrgent ? (
      <FontAwesomeIcon icon={faHourglassHalf} />
    ) : null

  return (
    <Button
      key={proposal.id}
      className={{
        root: twMerge(
          'group flex h-full min-h-[13rem] w-full flex-col items-stretch justify-between rounded-lg border border-[#E9E9E9] bg-white p-4 text-left text-sm text-[#121212] shadow-none transition hover:-translate-y-0.5 hover:border-[#CCD4ED] hover:bg-white hover:text-[#121212] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
          (proposal.isOwnProposal || proposal.isSupervisedProposal) &&
            'border-[#F3AB00]',
          hasFeedback && 'bg-[#F5F5FB]',
          isUrgent && 'border-[#B50000] bg-[#FFF4F4]',
          isRecentlyActive &&
            proposal.statusKey === 'MATCHED' &&
            'border-[#28960C]',
          !isRecentlyActive &&
            proposal.statusKey === 'MATCHED' &&
            'bg-[#FAFAFA] text-[#666666]'
        ),
        active:
          'border-[#0028A5] bg-[#F5F5FB] text-[#121212] ring-2 ring-[#0028A5] hover:bg-[#F5F5FB]',
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
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="break-words text-[17px] font-semibold leading-6">
            {proposal.title}
          </div>
          {statusIcon && (
            <div
              className={twMerge(
                'mt-1 shrink-0 text-[#0028A5]',
                isUrgent && 'text-[#B50000]'
              )}
            >
              {statusIcon}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 text-[13px] leading-5 text-[#4C4C4C]">
          <div className="font-semibold text-[#121212]">
            {proposal.studyLevel}
          </div>
          <div>{proposal.topicArea.name}</div>
          <div>
            {proposal.typeKey === ProposalType.STUDENT
              ? proposal.applications?.[0]?.fullName
              : proposal.supervisedBy?.name}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E9E9E9] pt-3 text-xs text-[#666666]">
        <span>
          {proposal.typeKey === ProposalType.STUDENT ? 'Student' : 'Supervisor'}
        </span>
        <span>
          {format(new Date(proposal.createdAt), 'dd.MM.yyyy', { locale: de })}
        </span>
        {hasFeedback && (
          <span className="rounded-full bg-[#CCD4ED] px-2 py-0.5 text-[#1B214A]">
            {proposal.receivedFeedbacks
              ?.map((feedback: { typeKey: string }) => feedback.typeKey)
              .join(', ')}
          </span>
        )}
      </div>
    </Button>
  )
}
