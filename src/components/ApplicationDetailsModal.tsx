import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, Prose } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { useState } from 'react'
import { ApplicationDetails } from 'src/types/app'

function ApplicationDetailsModal({ row }: { row: ApplicationDetails }) {
  const FileTypeIconMap: Record<string, IconDefinition> = {
    'application/pdf': faFilePdf,
  }
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Modal
      title={`Application by ${row?.fullName}`}
      open={isOpen}
      trigger={
        <Button
          onClick={() => {
            setIsOpen(true)
          }}
        >
          More
        </Button>
      }
      onClose={() => {
        setIsOpen(false)
      }}
    >
      <div className="md:grid md:grid-cols-2">
        <div>
          <h1 className="text-base font-bold">Full Name:</h1>
          <p className="pb-2 text-base">{row?.fullName}</p>
          <h1 className="text-base font-bold">Email:</h1>
          <p className="pb-2 text-base">{row?.email}</p>
          <h1 className="text-base font-bold">Matriculation Number:</h1>
          <p className="pb-2 text-base">{row?.matriculationNumber}</p>
        </div>
        <div>
          <h1 className="text-base font-bold">Status:</h1>
          <p className="pb-2 text-base">{row?.statusKey}</p>
          <h1 className="text-base font-bold">Working Period:</h1>
          <p className="pb-2 text-base">
            {format(parseISO(row.plannedStartAt), 'dd.MM.Y')} -{' '}
            {format(
              add(parseISO(row.plannedStartAt), {
                months: 6,
              }),
              'dd.MM.Y'
            )}
          </p>

          <h1 className="text-base font-bold">Attachments:</h1>
          <div className="grid grid-cols-1 pb-2 text-base">
            {row?.attachments?.map((attachment: any) => (
              <div key={attachment.id}>
                <a
                  href={attachment.href}
                  target="_blank"
                  className="hover:text-orange-700"
                  rel="noreferrer"
                >
                  <div className="flex flex-row items-center gap-2">
                    <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                    {attachment.name}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-base font-bold">Motivation:</h1>
        <Prose className={{ root: 'max-w-none' }}>{row?.motivation}</Prose>
      </div>
    </Modal>
  )
}

export default ApplicationDetailsModal
