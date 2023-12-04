import { H2, Table } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { trpc } from 'src/lib/trpc'
import { ApplicationDetails, ProposalDetails } from 'src/types/app'
import ApplicationDetailsModal from './ApplicationDetailsModal'
import ApplicationForm from './ApplicationForm'
import ConfirmationModal from './ConfirmationModal'

interface ProposalApplicationProps {
  proposalDetails: ProposalDetails
  isStudent: boolean
  isSupervisor: boolean
  refetch: () => void
  setFilters: (filters: { status: string }) => void
}

export default function ProposalApplication({
  proposalDetails,
  isStudent,
  isSupervisor,
  refetch,
  setFilters,
}: ProposalApplicationProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    useState<boolean>(false)

  const { data: session } = useSession()
  const acceptApplication = trpc.acceptProposalApplication.useMutation()

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
        {isSupervisor &&
        (session?.user?.email === proposalDetails?.ownedByUserEmail ||
          session?.user.email ===
            proposalDetails.supervisedBy[0].supervisorEmail) ? (
          <div className="pt-4">
            <H2>Applications</H2>
            {proposalDetails?.applications?.length === 0 &&
              'No applications for this proposal...'}
            {proposalDetails?.applications?.length > 0 && (
              <Table<ApplicationDetails>
                className={{
                  root: 'text-xs',
                  tableHeader: 'text-sm',
                }}
                columns={[
                  {
                    label: 'Date',
                    accessor: 'createdAt',
                    sortable: true,
                    transformer: ({ row }) =>
                      format(parseISO(row.createdAt), 'dd.MM.yyyy'),
                  },
                  {
                    label: 'Email',
                    accessor: 'email',
                    sortable: true,
                  },
                  {
                    label: 'Working Period',
                    accessor: 'plannedStartAt',
                    sortable: true,
                    transformer: ({ row }) =>
                      `${format(
                        parseISO(row.plannedStartAt),
                        'd.M.Y'
                      )} - ${format(
                        add(parseISO(row.plannedStartAt), { months: 6 }),
                        'd.M.Y'
                      )}`,
                  },
                  {
                    label: 'Details',
                    accessor: 'details',
                    transformer: ({ row }) => (
                      <ApplicationDetailsModal
                        row={row}
                        isModalOpen={isModalOpen}
                        setIsModalOpen={setIsModalOpen}
                      />
                    ),
                  },
                  {
                    label: 'Action',
                    accessor: 'action',
                    transformer: ({ row }) => (
                      <ConfirmationModal
                        row={row}
                        isConfirmationModalOpen={isConfirmationModalOpen}
                        setIsConfirmationModalOpen={setIsConfirmationModalOpen}
                        acceptApplication={acceptApplication}
                        proposalDetails={proposalDetails}
                        refetch={refetch}
                        setFilters={setFilters}
                      />
                    ),
                  },
                ]}
                data={proposalDetails?.applications}
              />
            )}
          </div>
        ) : (
          <div className="bg-yellow-100">
            You are not allowed to see any applications to this proposal.
          </div>
        )}
      </div>
    )
  } else {
    return null
  }
}
