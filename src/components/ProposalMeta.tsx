import { faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}
export default function ProposalMeta({
  proposalDetails,
}: {
  proposalDetails: ProposalDetails
}) {
  if (!proposalDetails) return null
  return (
    <div className="p-4">
      <h1 className="text-base font-bold">{proposalDetails.title}</h1>

      <p className="pb-4 text-base">{proposalDetails.description}</p>

      <div className="grid grid-cols-2">
        <div className="text-base">
          <div className="font-bold">Type of Proposal</div>
          <div>{proposalDetails.studyLevel}</div>
        </div>
        <div className="text-base">
          <div className="font-bold">Field of Research</div>
          <div>{proposalDetails.topicArea.name}</div>
        </div>
        <div className="text-base">
          <div className="font-bold">Proposal Language</div>
          <div>{JSON.parse(proposalDetails.language).join(', ')}</div>
        </div>
        {proposalDetails.typeKey === 'STUDENT' && (
          <div className="text-base">
            <div className="font-bold">Planned Start Date</div>
            <div>
              {format(
                parseISO(proposalDetails.applications[0].plannedStartAt),
                'yyyy-MM-dd'
              )}
            </div>
          </div>
        )}
        {proposalDetails.typeKey === 'SUPERVISOR' && (
          <div className="text-base">
            <div className="font-bold">Time Frame</div>
            <div>{proposalDetails.timeFrame}</div>
          </div>
        )}
        <div className="text-base">
          <div className="font-bold">Supervised By</div>
          <div>{proposalDetails.supervisedBy?.name ?? 'Unassigned'}</div>
        </div>

        {proposalDetails.typeKey === 'STUDENT' && (
          <div className="text-base">
            <div className="font-bold">Submitted By</div>
            <div>{proposalDetails.applications[0].fullName}</div>
          </div>
        )}

        <div className="text-base">
          <div className="font-bold">Submitted On</div>
          <div>{format(parseISO(proposalDetails.createdAt), 'dd.MM.Y')}</div>
        </div>
      </div>

      {proposalDetails.typeKey === 'STUDENT' && (
        <div className="text-sm">
          {proposalDetails.attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={attachment.href}
              target="_blank"
              className="hover:text-orange-600"
            >
              <div className="flex flex-row items-center gap-2 text-lg">
                <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                <div>{attachment.name}</div>
              </div>
            </Link>
          ))}
          {proposalDetails.applications[0].attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={attachment.href}
              target="_blank"
              className="hover:text-orange-600"
            >
              <div className="flex flex-row items-center gap-2 text-lg">
                <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                <div>{attachment.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {proposalDetails.typeKey === 'SUPERVISOR' && (
        <div className="flex flex-row gap-6 text-sm">
          {proposalDetails.attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={attachment.href}
              target="_blank"
              className="hover:text-orange-600"
            >
              <div className="flex flex-row items-center gap-2 text-lg">
                <FontAwesomeIcon icon={FileTypeIconMap[attachment.type]} />
                <div>{attachment.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
