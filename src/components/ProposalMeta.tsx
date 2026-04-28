import { IconDefinition, faFilePdf } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ProposalDetails } from 'src/types/app'

interface ProposalMetaProps {
  proposalDetails: ProposalDetails
}

const FileTypeIconMap: Record<string, IconDefinition> = {
  'application/pdf': faFilePdf,
}

type ProposalAttachment = {
  id: string
  href: string
  name: string
  type: string
}

type MetaItem = {
  label: string
  value: ReactNode
}

const metaLabelClass =
  'text-xs font-semibold uppercase tracking-[0.04em] text-[#666666]'

const sortByName = (attachments: ProposalAttachment[]) =>
  [...attachments].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  )

const isAdditionalAttachment = (attachment: ProposalAttachment) =>
  attachment.name.toLowerCase().startsWith('attachment')

function ProposalMetaItem({ label, value }: MetaItem) {
  return (
    <div className="text-base">
      <div className={metaLabelClass}>{label}</div>
      <div className="mt-1 text-[#121212]">{value}</div>
    </div>
  )
}

function AttachmentLink({ attachment }: { attachment: ProposalAttachment }) {
  return (
    <Link
      href={attachment.href}
      target="_blank"
      className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
    >
      <div className="flex flex-row items-center gap-2 text-base">
        <FontAwesomeIcon icon={FileTypeIconMap[attachment.type] || faFilePdf} />
        <div>{attachment.name}</div>
      </div>
    </Link>
  )
}

function AttachmentList({
  attachments,
}: {
  attachments: ProposalAttachment[]
}) {
  return (
    <div className="flex flex-row flex-wrap gap-6 text-sm">
      {attachments.map((attachment) => (
        <AttachmentLink key={attachment.id} attachment={attachment} />
      ))}
    </div>
  )
}

function AttachmentGroups({
  attachments,
}: {
  attachments: ProposalAttachment[]
}) {
  const regularAttachments = sortByName(
    attachments.filter((attachment) => !isAdditionalAttachment(attachment))
  )
  const additionalAttachments = sortByName(
    attachments.filter(isAdditionalAttachment)
  )

  return (
    <div className="mt-6 flex flex-col gap-4">
      <AttachmentList attachments={regularAttachments} />
      <AttachmentList attachments={additionalAttachments} />
    </div>
  )
}

export default function ProposalMeta({ proposalDetails }: ProposalMetaProps) {
  if (!proposalDetails) return null

  const supervisedBy =
    proposalDetails.supervisedBy[0]?.supervisor?.name ?? 'Unassigned'
  const isStudentProposal = proposalDetails.typeKey === 'STUDENT'
  const studentApplication = proposalDetails.applications[0]
  const attachments = isStudentProposal
    ? [...proposalDetails.attachments, ...studentApplication.attachments]
    : proposalDetails.attachments
  const metaItems: MetaItem[] = [
    {
      label: 'Type of Proposal',
      value: proposalDetails.studyLevel,
    },
    {
      label: 'Field of Research',
      value: proposalDetails.topicArea.name,
    },
    {
      label: 'Proposal Language',
      value: JSON.parse(proposalDetails.language).join(', '),
    },
    ...(isStudentProposal
      ? [
          {
            label: 'Planned Start Date',
            value: format(
              parseISO(studentApplication.plannedStartAt),
              'yyyy-MM-dd'
            ),
          },
        ]
      : [
          {
            label: 'Time Frame',
            value: proposalDetails.timeFrame,
          },
        ]),
    {
      label: 'Supervised By',
      value: supervisedBy,
    },
    ...(isStudentProposal
      ? [
          {
            label: 'Submitted By',
            value: studentApplication.fullName,
          },
        ]
      : []),
    {
      label: 'Submitted On',
      value: format(parseISO(proposalDetails.createdAt), 'dd.MM.Y'),
    },
    ...(!isStudentProposal && proposalDetails.supervisedBy[0]?.responsible
      ? [
          {
            label: 'Person Responsible',
            value: proposalDetails.supervisedBy[0].responsible.name
              .split(' ')
              .reverse()
              .join(' '),
          },
        ]
      : []),
    ...(isStudentProposal
      ? [
          {
            label: 'Email',
            value: studentApplication.email,
          },
        ]
      : []),
  ]

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
        {metaItems.map((item) => (
          <ProposalMetaItem key={item.label} {...item} />
        ))}
      </div>

      {isStudentProposal && proposalDetails.additionalStudentComment && (
        <div className="border-b border-[#E9E9E9] py-6 text-base">
          <div className={metaLabelClass}>Additional Comment</div>
          <p className="mt-2 text-base leading-7 text-[#4C4C4C]">
            {proposalDetails.additionalStudentComment}
          </p>
        </div>
      )}

      <AttachmentGroups attachments={attachments} />
    </div>
  )
}
