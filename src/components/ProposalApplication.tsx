import {
  faCheckCircle,
  faCircleXmark,
} from '@fortawesome/free-regular-svg-icons'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, H2, Table } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { useState } from 'react'
import { trpc } from 'src/lib/trpc'
import {
  ApplicationDetails,
  ProposalDetails,
  ProposalStatusFilter,
} from 'src/types/app'
import ApplicationDetailsModal from './ApplicationDetailsModal'
import ApplicationForm from './ApplicationForm'

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
        {isSupervisor && (
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
                      <Button
                        disabled={
                          row.statusKey !== 'OPEN' ||
                          acceptApplication.isLoading
                        }
                        onClick={async () => {
                          await acceptApplication.mutateAsync(
                            {
                              proposalId: proposalDetails.id,
                              proposalApplicationId: row.id,
                              applicantEmail: row.email,
                            },
                            {
                              onSuccess: () => {
                                refetch()
                                setFilters({
                                  status: ProposalStatusFilter.MY_PROPOSALS,
                                })
                              },
                            }
                          )
                        }}
                      >
                        <FontAwesomeIcon
                          icon={
                            acceptApplication.isLoading
                              ? faSpinner
                              : row.statusKey === 'OPEN'
                              ? faCheckCircle
                              : row.statusKey === 'ACCEPTED'
                              ? faCheckCircle
                              : faCircleXmark
                          }
                        />
                        {acceptApplication.isLoading
                          ? 'Loading...'
                          : row.statusKey === 'OPEN'
                          ? 'Accept'
                          : row.statusKey === 'ACCEPTED'
                          ? 'Accepted'
                          : 'Declined'}
                      </Button>
                    ),
                  },
                ]}
                data={proposalDetails?.applications}
              />
            )}
          </div>
        )}
      </div>
    )
  } else {
    return null
  }
}
