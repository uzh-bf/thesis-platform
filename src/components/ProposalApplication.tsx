import { add, format } from 'date-fns'
import { useSession } from 'next-auth/react'
import { Dispatch, SetStateAction } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'
import {
  ApplicationDetails,
  ProposalDetails,
  ProposalStatusFilter,
} from 'src/types/app'
import ApplicationDetailsModal from './ApplicationDetailsModal'
import ApplicationForm from './ApplicationForm'
import ConfirmationModal from './ConfirmationModal'

interface ProposalApplicationProps {
  proposalDetails: ProposalDetails
  refetch: () => void
  setFilters: Dispatch<SetStateAction<{ status: ProposalStatusFilter }>>
}

const statusClassNames: Record<string, string> = {
  ACCEPTED: 'bg-[#ECF6D6] text-[#536B18]',
  DECLINED: 'bg-[#FAFAFA] text-[#666666]',
  OPEN: 'bg-[#F5F5FB] text-[#0028A5]',
}

function formatDate(date: Date | string) {
  return format(new Date(date), 'dd.MM.yyyy')
}

function formatWorkingPeriod(plannedStartAt: Date | string) {
  const startDate = new Date(plannedStartAt)
  const endDate = add(startDate, { months: 6 })

  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export default function ProposalApplication({
  proposalDetails,
  refetch,
  setFilters,
}: ProposalApplicationProps) {
  const { data: session } = useSession()
  const { isStudent, isSupervisor, isDeveloper } = useUserRole()
  const acceptApplication = trpc.acceptProposalApplication.useMutation()
  const declineIndividualApplication =
    trpc.declineProposalApplication.useMutation()
  const applications = proposalDetails.applications ?? []

  if (proposalDetails?.typeKey === 'SUPERVISOR') {
    return (
      <div className="p-4">
        {isStudent && (
          <ApplicationForm
            key={proposalDetails.id}
            proposalName={proposalDetails.title}
            proposalId={proposalDetails.id}
          />
        )}
        {isDeveloper ||
        (isSupervisor &&
          (session?.user?.email === proposalDetails?.ownedByUserEmail ||
            session?.user?.email ===
              proposalDetails?.supervisedBy?.[0].supervisorEmail)) ? (
          <div className="pt-4">
            <h2 className="text-[26px] font-semibold leading-tight text-[#121212]">
              Applications
            </h2>
            {applications.length === 0 && (
              <p className="mt-2 text-base text-[#4C4C4C]">
                No applications for this proposal...
              </p>
            )}
            {applications.length > 0 && (
              <div className="mt-4 grid gap-3">
                {applications.map((application: ApplicationDetails) => (
                  <article
                    key={application.id}
                    className="rounded-[8px] border border-[#E9E9E9] bg-white p-4"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] ${
                              statusClassNames[application.statusKey] ??
                              'bg-[#FAFAFA] text-[#4C4C4C]'
                            }`}
                          >
                            {application.statusKey.toLowerCase()}
                          </span>
                          <span className="text-sm text-[#666666]">
                            Submitted {formatDate(application.createdAt)}
                          </span>
                        </div>
                        <h3 className="break-words text-base font-semibold text-[#121212] [overflow-wrap:anywhere]">
                          {application.fullName}
                        </h3>
                        <p className="break-all text-sm text-[#4C4C4C]">
                          {application.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ApplicationDetailsModal row={application} />
                        <ConfirmationModal
                          row={application}
                          acceptApplication={acceptApplication}
                          declineIndividualApplication={
                            declineIndividualApplication
                          }
                          proposalDetails={proposalDetails}
                          refetch={refetch}
                          setFilters={setFilters}
                        />
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 border-t border-[#E9E9E9] pt-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                          Working Period
                        </dt>
                        <dd className="mt-1 text-sm text-[#121212]">
                          {formatWorkingPeriod(application.plannedStartAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                          Matriculation
                        </dt>
                        <dd className="mt-1 text-sm text-[#121212]">
                          {application.matriculationNumber || '-'}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          isSupervisor && (
            <div className="bg-yellow-100">
              You are not allowed to see any applications to this proposal.
            </div>
          )
        )}
      </div>
    )
  } else {
    return null
  }
}
