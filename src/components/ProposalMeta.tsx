import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { ProposalDetails } from 'src/types/app'

interface ProposalMetaProps {
  proposalDetails: ProposalDetails
}

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}

export default function ProposalMeta({ proposalDetails }: ProposalMetaProps) {
  const supervisedBy =
    proposalDetails.supervisedBy[0]?.supervisor?.name ?? 'Unassigned'

  if (!proposalDetails) return null

  return (
    <div className="p-6">
      <div className="border-b border-[#E9E9E9] pb-6">
        <div className="mb-3 inline-flex rounded-full bg-[#F5F5FB] px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-[#0028A5]">
          {proposalDetails.typeKey.toLowerCase()} proposal
        </div>
        <h1 className="text-[26px] font-semibold leading-tight text-[#121212]">
          {proposalDetails.title}
        </h1>

        <p className="mt-5 whitespace-pre-line text-base leading-7 text-[#4C4C4C]">
          {proposalDetails.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 border-b border-[#E9E9E9] py-6 sm:grid-cols-2">
        <div className="text-base">
          <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
            Type of Proposal
          </div>
          <div className="mt-1 text-[#121212]">
            {proposalDetails.studyLevel}
          </div>
        </div>
        <div className="text-base">
          <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
            Field of Research
          </div>
          <div className="mt-1 text-[#121212]">
            {proposalDetails.topicArea.name}
          </div>
        </div>
        <div className="text-base">
          <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
            Proposal Language
          </div>
          <div className="mt-1 text-[#121212]">
            {JSON.parse(proposalDetails.language).join(', ')}
          </div>
        </div>
        {proposalDetails.typeKey === 'STUDENT' && (
          <div className="text-base">
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Planned Start Date
            </div>
            <div className="mt-1 text-[#121212]">
              {format(
                parseISO(proposalDetails.applications[0].plannedStartAt),
                'yyyy-MM-dd'
              )}
            </div>
          </div>
        )}
        {proposalDetails.typeKey === 'SUPERVISOR' && (
          <div className="text-base">
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Time Frame
            </div>
            <div className="mt-1 text-[#121212]">
              {proposalDetails.timeFrame}
            </div>
          </div>
        )}
        <div className="text-base">
          <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
            Supervised By
          </div>
          <div className="mt-1 text-[#121212]">{supervisedBy}</div>
        </div>

        {proposalDetails.typeKey === 'STUDENT' && (
          <div className="text-base">
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Submitted By
            </div>
            <div className="mt-1 text-[#121212]">
              {proposalDetails.applications[0].fullName}
            </div>
          </div>
        )}

        <div className="text-base">
          <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
            Submitted On
          </div>
          <div className="mt-1 text-[#121212]">
            {format(parseISO(proposalDetails.createdAt), 'dd.MM.Y')}
          </div>
        </div>

        {proposalDetails.typeKey === 'SUPERVISOR' &&
          proposalDetails.supervisedBy[0]?.responsible && (
            <div className="text-base">
              <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
                Person Responsible
              </div>
              <div className="mt-1 text-[#121212]">
                {proposalDetails.supervisedBy[0].responsible.name
                  .split(' ')
                  .reverse()
                  .join(' ')}
              </div>
            </div>
          )}

        {proposalDetails.typeKey === 'STUDENT' && (
          <div className="text-base">
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Email
            </div>
            <div className="mt-1 text-[#121212]">
              {proposalDetails.applications[0].email}
            </div>
          </div>
        )}
      </div>

      {proposalDetails.typeKey === 'STUDENT' &&
        proposalDetails.additionalStudentComment && (
          <div className="border-b border-[#E9E9E9] py-6 text-base">
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]">
              Additional Comment
            </div>
            <p className="mt-2 text-base leading-7 text-[#4C4C4C]">
              {proposalDetails.additionalStudentComment}
            </p>
          </div>
        )}

      {proposalDetails.typeKey === 'STUDENT' && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Main files */}
          <div className="flex flex-row flex-wrap gap-6 text-sm">
            {[...proposalDetails.attachments]
              .filter((a) => !a.name.toLowerCase().startsWith('attachment'))
              .sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
              )
              .map((attachment: any) => (
                <Link
                  key={attachment.id}
                  href={attachment.href}
                  target="_blank"
                  className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
                >
                  <div className="flex flex-row items-center gap-2 text-base">
                    <FontAwesomeIcon
                      icon={FileTypeIconMap[attachment.type] || faFilePdf}
                    />
                    <div>{attachment.name}</div>
                  </div>
                </Link>
              ))}
            {[...proposalDetails.applications[0].attachments]
              .filter((a) => !a.name.toLowerCase().startsWith('attachment'))
              .sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
              )
              .map((attachment: any) => (
                <Link
                  key={attachment.id}
                  href={attachment.href}
                  target="_blank"
                  className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
                >
                  <div className="flex flex-row items-center gap-2 text-base">
                    <FontAwesomeIcon
                      icon={FileTypeIconMap[attachment.type] || faFilePdf}
                    />
                    <div>{attachment.name}</div>
                  </div>
                </Link>
              ))}
          </div>
          {/* Attachment files */}
          <div className="flex flex-row flex-wrap gap-6 text-sm">
            {[
              ...proposalDetails.attachments.filter((a) =>
                a.name.toLowerCase().startsWith('attachment')
              ),
              ...proposalDetails.applications[0].attachments.filter((a) =>
                a.name.toLowerCase().startsWith('attachment')
              ),
            ]
              .sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
              )
              .map((attachment: any) => (
                <Link
                  key={attachment.id}
                  href={attachment.href}
                  target="_blank"
                  className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
                >
                  <div className="flex flex-row items-center gap-2 text-base">
                    <FontAwesomeIcon
                      icon={FileTypeIconMap[attachment.type] || faFilePdf}
                    />
                    <div>{attachment.name}</div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {proposalDetails.typeKey === 'SUPERVISOR' && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Main files */}
          <div className="flex flex-row flex-wrap gap-6 text-sm">
            {[...proposalDetails.attachments]
              .filter((a) => !a.name.toLowerCase().startsWith('attachment'))
              .sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
              )
              .map((attachment: any) => (
                <Link
                  key={attachment.id}
                  href={attachment.href}
                  target="_blank"
                  className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
                >
                  <div className="flex flex-row items-center gap-2 text-base">
                    <FontAwesomeIcon
                      icon={FileTypeIconMap[attachment.type] || faFilePdf}
                    />
                    <div>{attachment.name}</div>
                  </div>
                </Link>
              ))}
          </div>
          {/* Attachment files */}
          <div className="flex flex-row flex-wrap gap-6 text-sm">
            {[...proposalDetails.attachments]
              .filter((a) => a.name.toLowerCase().startsWith('attachment'))
              .sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
              )
              .map((attachment: any) => (
                <Link
                  key={attachment.id}
                  href={attachment.href}
                  target="_blank"
                  className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
                >
                  <div className="flex flex-row items-center gap-2 text-base">
                    <FontAwesomeIcon
                      icon={FileTypeIconMap[attachment.type] || faFilePdf}
                    />
                    <div>{attachment.name}</div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
