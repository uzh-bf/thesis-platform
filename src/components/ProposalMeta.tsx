import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { format, parseISO } from 'date-fns'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ProposalDetails } from 'src/types/app'

interface ProposalMetaProps {
  proposalDetails: ProposalDetails
}

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}
export default function ProposalMeta({ proposalDetails }: ProposalMetaProps) {
  const { data: session } = useSession()

  if (!proposalDetails) return null

  const getSupervisedBy = () => {
    if (session?.user?.email && proposalDetails.supervisedBy.length > 0) {
      return proposalDetails.supervisedBy[0].supervisor.name
    } else if (proposalDetails.supervisedBy.name) {
      return proposalDetails.supervisedBy.name
    } else {
      return 'Unassigned'
    }
  }
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
          <div>{getSupervisedBy()}</div>
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
        <div className="flex flex-row gap-6 mt-4 text-sm">
          {proposalDetails.attachments.map((attachment: any) => (
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
          {proposalDetails.applications[0].attachments.map(
            (attachment: any) => (
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
            )
          )}
        </div>
      )}

      {proposalDetails.typeKey === 'SUPERVISOR' && (
        <div className="flex flex-row gap-6 text-sm">
          {proposalDetails.attachments.map((attachment: any) => (
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
