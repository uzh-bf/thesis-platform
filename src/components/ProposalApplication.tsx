import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, H2, Modal, Table } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { useState } from 'react'
import { ProposalDetails } from 'src/types/app'
import { IterableElement } from 'type-fest'
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
  const FileTypeIconMap: Record<string, IconDefinition> = {
    'application/pdf': faFilePdf,
  }
  const [isOpen, setIsOpen] = useState(false)
  const [updatedRow, setUpdatedRow] = useState<null | any>(null)
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
              <Table<IterableElement<(typeof proposalDetails)['applications']>>
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
                  // {
                  //   label: 'Status',
                  //   accessor: 'status',
                  //   sortable: true,
                  //   transformer: ({ row }) => <div>{row.statusKey}</div>,
                  // },
                  {
                    label: 'Email',
                    accessor: 'email',
                    sortable: true,
                  },
                  {
                    label: 'Details',
                    accessor: 'fullName',
                    transformer: ({ row }) => (
                      <div>
                        <Modal
                          open={isOpen}
                          trigger={
                            <Button
                              onClick={() => (
                                setUpdatedRow(row), setIsOpen(true)
                              )}
                            >
                              More
                            </Button>
                          }
                          onClose={() => setIsOpen(false)}
                        >
                          <div className="p-4">
                            <div className="md:grid md:grid-cols-2">
                              <div>
                                <h1 className="text-base font-bold">
                                  Full Name:
                                </h1>
                                <p className="pb-2 text-base">
                                  {updatedRow?.fullName}
                                </p>
                                <h1 className="text-base font-bold">Email:</h1>
                                <p className="pb-2 text-base">
                                  {updatedRow?.email}
                                </p>
                                <h1 className="text-base font-bold">
                                  Matriculation Number:
                                </h1>
                                <p className="pb-2 text-base">
                                  {updatedRow?.matriculationNumber}
                                </p>
                              </div>
                              <div>
                                <h1 className="text-base font-bold">Status:</h1>
                                <p className="pb-2 text-base">
                                  {updatedRow?.statusKey}
                                </p>
                                <h1 className="text-base font-bold">
                                  Working Period:
                                </h1>
                                <p className="pb-2 text-base">
                                  {format(
                                    parseISO(row.plannedStartAt),
                                    'dd.MM.Y'
                                  )}{' '}
                                  -{' '}
                                  {format(
                                    add(parseISO(row.plannedStartAt), {
                                      months: 6,
                                    }),
                                    'dd.MM.Y'
                                  )}
                                </p>

                                <h1 className="text-base font-bold">
                                  Attachments:
                                </h1>
                                <div className="grid grid-cols-1 pb-2 text-base">
                                  {updatedRow?.attachments?.map(
                                    (attachment: any) => (
                                      <div key={attachment.id}>
                                        <a
                                          href={attachment.href}
                                          target="_blank"
                                          className="hover:text-orange-700"
                                          rel="noreferrer"
                                        >
                                          <div className="flex flex-row items-center gap-2">
                                            <FontAwesomeIcon
                                              icon={
                                                FileTypeIconMap[attachment.type]
                                              }
                                            />
                                            {attachment.name}
                                          </div>
                                        </a>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              <h1 className="text-base font-bold">
                                Motivation:
                              </h1>
                              <p className="pb-2 text-base">
                                {updatedRow?.motivation}
                              </p>
                            </div>
                          </div>
                        </Modal>
                      </div>
                    ),
                  },
                  // {
                  //   label: 'Working Period',
                  //   accessor: 'plannedStartAt',
                  //   sortable: true,
                  //   transformer: ({ row }) =>
                  //     `${format(
                  //       parseISO(row.plannedStartAt),
                  //       'd.M.Y'
                  //     )} - ${format(
                  //       add(parseISO(row.plannedStartAt), { months: 6 }),
                  //       'd.M.Y'
                  //     )}`,
                  // },
                  // {
                  //   label: 'Name',
                  //   accessor: 'fullName',
                  //   sortable: true,
                  //   transformer: ({ row }) => (
                  //     <a
                  //       href={`mailto:${row.email}`}
                  //       target="_blank"
                  //       className="flex flex-row items-center gap-2 hover:text-orange-700"
                  //       rel="noreferrer"
                  //     >
                  //       <FontAwesomeIcon icon={faMessage} />
                  //       {row.email}
                  //     </a>
                  //   ),
                  // },
                  // {
                  //   label: 'Motivation',
                  //   accessor: 'motivation',
                  //   transformer: ({ row }) => (
                  //     <div className="text-xs break-all">{row.motivation}</div>
                  //   ),
                  // },
                  // {
                  //   label: 'Attachments',
                  //   accessor: 'attachments',
                  //   transformer: ({ row }) => (
                  //     <div>
                  //       {row.attachments?.map((attachment: any) => (
                  //         <a
                  //           href={attachment.href}
                  //           target="_blank"
                  //           key={attachment.id}
                  //           className="hover:text-orange-700"
                  //           rel="noreferrer"
                  //         >
                  //           <div className="flex flex-row items-center gap-2">
                  //             <FontAwesomeIcon
                  //               icon={FileTypeIconMap[attachment.type]}
                  //             />
                  //             {attachment.name}
                  //           </div>
                  //         </a>
                  //       ))}
                  //     </div>
                  //   ),
                  // },
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
