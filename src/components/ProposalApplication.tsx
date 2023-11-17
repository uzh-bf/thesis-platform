import { H2, Table } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { useState } from 'react'
import { ApplicationDetails, ProposalDetails } from 'src/types/app'
import ApplicationDetailsModal from './ApplicationDetailsModal'
import ApplicationForm from './ApplicationForm'

interface ProposalApplicationProps {
  proposalDetails: ProposalDetails
  isStudent: boolean
  isSupervisor: boolean
}

export default function ProposalApplication({
  proposalDetails,
  isStudent,
  isSupervisor,
}: ProposalApplicationProps) {
  const [isProposalOpen, setIsProposalOpen] = useState<boolean>(true)

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
                        isProposalOpen={isProposalOpen}
                        setIsProposalOpen={setIsProposalOpen}
                      />
                    ),
                  },
                ]}
                data={proposalDetails.applications}
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
