import { faFilePdf, faMessage } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { H2, Table } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import ApplicationForm from './ApplicationForm'

export default function ProposalApplication({
  proposalDetails,
  isStudent,
  isSupervisor,
}) {
  const FileTypeIconMap: Record<string, IconDefinition> = {
    'application/pdf': faFilePdf,
  }
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
              <Table<(typeof proposalDetails.applications)[0]>
                className={{
                  root: 'text-xs',
                  tableHeader: 'text-sm',
                }}
                columns={[
                  {
                    label: 'Date',
                    accessor: 'createdAt',
                    transformer: ({ row }) =>
                      format(parseISO(row.createdAt), 'dd.MM.Y'),
                  },
                  {
                    label: 'Status',
                    accessor: 'status',
                    sortable: true,
                    transformer: ({ row }) => <div>{row.statusKey}</div>,
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
                    label: 'Name',
                    accessor: 'fullName',
                    sortable: true,
                    transformer: ({ row }) => (
                      <a
                        href={`mailto:${row.email}`}
                        target="_blank"
                        className="flex flex-row items-center gap-2 hover:text-orange-700"
                        rel="noreferrer"
                      >
                        <FontAwesomeIcon icon={faMessage} />
                        {row.fullName}
                      </a>
                    ),
                  },
                  {
                    label: 'Motivation',
                    accessor: 'motivation',
                    transformer: ({ row }) => (
                      <div className="text-xs break-all">{row.motivation}</div>
                    ),
                  },
                  {
                    label: 'Attachments',
                    accessor: 'attachments',
                    transformer: ({ row }) => (
                      <div>
                        {row.attachments?.map((attachment) => (
                          <a
                            href={attachment.href}
                            target="_blank"
                            key={attachment.id}
                            className="hover:text-orange-700"
                            rel="noreferrer"
                          >
                            <div className="flex flex-row items-center gap-2">
                              <FontAwesomeIcon
                                icon={FileTypeIconMap[attachment.type]}
                              />
                              {attachment.name}
                            </div>
                          </a>
                        ))}
                      </div>
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
