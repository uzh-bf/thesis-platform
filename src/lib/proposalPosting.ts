import type { Department, PrismaClient } from '@prisma/client'
import { escapeHtml } from 'src/lib/cleverreach/thesisProposal'
import { ProposalStatus, ProposalType } from 'src/lib/constants'
import { sendMail } from 'src/lib/mail/sendMail'
import {
  type SharePointUploadResult,
  toSharePointName,
  uploadToSharePoint,
} from 'src/lib/sharePointFileRelay'
import { v4 as uuidv4 } from 'uuid'

export interface ProposalPostingInput {
  responder: string
  proposalTitle: string
  proposalSummary: string
  fieldOfResearch: string
  supervisor: string
  personResponsibleEmail: string
  bachelorOrMasterLevel: string
  proposalLanguage: string
  timeFrame: string
  // Blob names in the upload container; null or empty when not attached.
  researchProposalPDF: string | null
  furtherAttachments: string | null
}

export interface PostedAttachment {
  name: string
  href: string
  type: string
}

export interface NewSupervisorProposal {
  id: string
  title: string
  description: string
  language: string
  studyLevel: string
  topicAreaSlug: string
  timeFrame: string
  ownedByUserEmail: string
  supervisorEmail: string
  responsibleId: string
  attachments: PostedAttachment[]
}

export interface ProposalPostingStore {
  findResponsibleId(email: string): Promise<string | null>
  topicAreaExists(slug: string): Promise<boolean>
  createProposal(proposal: NewSupervisorProposal): Promise<void>
}

export type ProposalPostingErrorCode =
  'RESPONSIBLE_NOT_FOUND' | 'TOPIC_AREA_NOT_FOUND' | 'UPLOAD_FAILED'

export class ProposalPostingError extends Error {
  constructor(
    readonly code: ProposalPostingErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ProposalPostingError'
  }
}

// The form sends the topic area slug; the flow also accepted display names,
// so the same normalization is kept.
export const normalizeTopicAreaSlug = (value: string) =>
  value.toLowerCase().replace(/ /g, '_').replace(/,/g, '').replace(/&/g, 'and')

export function createPrismaProposalPostingStore(
  prisma: PrismaClient,
  department: Department
): ProposalPostingStore {
  return {
    async findResponsibleId(email) {
      const responsible = await prisma.responsible.findFirst({
        where: { email, department },
        select: { id: true },
      })
      return responsible?.id ?? null
    },

    async topicAreaExists(slug) {
      const topicArea = await prisma.topicArea.findUnique({
        where: { slug },
        select: { id: true },
      })
      return topicArea !== null
    },

    async createProposal(proposal) {
      await prisma.proposal.create({
        data: {
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          language: proposal.language,
          studyLevel: proposal.studyLevel,
          topicAreaSlug: proposal.topicAreaSlug,
          timeFrame: proposal.timeFrame,
          typeKey: ProposalType.SUPERVISOR,
          statusKey: ProposalStatus.OPEN,
          ownedByUserEmail: proposal.ownedByUserEmail,
          department,
          attachments: { create: proposal.attachments },
          supervisedBy: {
            create: {
              supervisorEmail: proposal.supervisorEmail,
              studyLevel: proposal.studyLevel,
              responsibleId: proposal.responsibleId,
            },
          },
        },
      })
    },
  }
}

export function buildProposalPostedEmail({
  department,
  proposalTitle,
  proposalUrl,
  responder,
  managementRecipients,
}: {
  // Short department name (DF, IBW) used in the subject and the signature.
  department: string
  proposalTitle: string
  proposalUrl: string
  responder: string
  managementRecipients: string[]
}): Parameters<typeof sendMail>[0] {
  const dept = escapeHtml(department)

  return {
    to: [responder],
    bcc: managementRecipients,
    replyTo: managementRecipients[0],
    subject: `${department} Theses - Your Proposal was posted`,
    bodyAsHtml: `<p>Your proposal on "${escapeHtml(proposalTitle)}" was posted on the ${dept} Thesis Platform. You will be notified as soon as applications are received.<br><br>The proposal is visible on ${escapeHtml(proposalUrl)}.<br><br>If you have any further remarks, please contact the ${dept} Thesis Coordinator by replying to this email.<br><br>Best regards,<br>${dept} Thesis Coordinator</p>`,
    importance: 'Normal',
  }
}

// Replaces the Power Automate "Thesis Proposal Posting" flow: copies the
// uploaded PDFs to SharePoint through the file relay, creates the proposal
// with its attachments and supervision in one write, and confirms it to the
// supervisor. The proposal stands even if the email or the blob cleanup
// fails; files already in SharePoint stay there if the write fails.
export async function postSupervisorProposal({
  input,
  store,
  department,
  appUrl,
  containerName,
  managementRecipients,
  upload = uploadToSharePoint,
  send = sendMail,
  deleteBlob,
  newId = uuidv4,
}: {
  input: ProposalPostingInput
  store: ProposalPostingStore
  department: string
  appUrl: string
  containerName: string
  managementRecipients: string[]
  upload?: typeof uploadToSharePoint
  send?: typeof sendMail
  deleteBlob: (blobName: string) => Promise<void>
  newId?: () => string
}): Promise<{ proposalId: string; emailSent: boolean }> {
  const topicAreaSlug = normalizeTopicAreaSlug(input.fieldOfResearch)
  const [responsibleId, topicAreaExists] = await Promise.all([
    store.findResponsibleId(input.personResponsibleEmail),
    store.topicAreaExists(topicAreaSlug),
  ])

  if (!responsibleId) {
    throw new ProposalPostingError(
      'RESPONSIBLE_NOT_FOUND',
      'Responsible person not found'
    )
  }
  if (!topicAreaExists) {
    throw new ProposalPostingError(
      'TOPIC_AREA_NOT_FOUND',
      'Field of research not found'
    )
  }

  const proposalId = newId()
  const files = [
    { name: 'Proposal', blobName: input.researchProposalPDF },
    { name: 'Attachment', blobName: input.furtherAttachments },
  ].filter((file): file is { name: string; blobName: string } =>
    Boolean(file.blobName)
  )

  const attachments: PostedAttachment[] = []
  for (const file of files) {
    let uploaded: SharePointUploadResult
    try {
      uploaded = await upload({
        blobPath: `${containerName}/${file.blobName}`,
        folder: `Proposals/${toSharePointName(input.supervisor)}`,
        fileName: toSharePointName(`${proposalId}_${file.blobName}`),
      })
    } catch (error) {
      console.error('Proposal file upload to SharePoint failed', {
        proposalId,
        file: file.name,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new ProposalPostingError(
        'UPLOAD_FAILED',
        'The proposal files could not be stored'
      )
    }
    attachments.push({
      name: file.name,
      href: uploaded.webUrl,
      type: uploaded.mediaType,
    })
  }

  await store.createProposal({
    id: proposalId,
    title: input.proposalTitle,
    description: input.proposalSummary,
    language: input.proposalLanguage,
    studyLevel: input.bachelorOrMasterLevel,
    topicAreaSlug,
    timeFrame: input.timeFrame,
    ownedByUserEmail: input.responder,
    supervisorEmail: input.supervisor,
    responsibleId,
    attachments,
  })

  let emailSent = false
  try {
    emailSent = await send(
      buildProposalPostedEmail({
        department,
        proposalTitle: input.proposalTitle,
        proposalUrl: `${appUrl}/${proposalId}`,
        responder: input.responder,
        managementRecipients,
      })
    )
  } catch (error) {
    console.error('Failed to send proposal posted email', {
      proposalId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // The files now live in SharePoint; a leftover blob is only clutter.
  for (const file of files) {
    try {
      await deleteBlob(file.blobName)
    } catch (error) {
      console.warn('Failed to delete uploaded proposal blob', {
        proposalId,
        blobName: file.blobName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { proposalId, emailSent }
}
