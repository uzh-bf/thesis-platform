import type { Department, PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'
import { escapeHtml } from 'src/lib/cleverreach/thesisProposal'
import {
  MAX_FURTHER_SUBMISSION_ATTACHMENTS,
  ProposalStatus,
  ProposalType,
} from 'src/lib/constants'
import { sendMail } from 'src/lib/mail/sendMail'
import { isUploadedBlobName } from 'src/lib/proposalApplication'
import {
  type SharePointUploadResult,
  toSharePointName,
  uploadToSharePoint,
} from 'src/lib/sharePointFileRelay'
import type { SupervisorStore } from 'src/lib/supervisors'
import { v4 as uuidv4 } from 'uuid'

export interface ProposalSubmissionInput {
  uzhemail: string
  fullName: string
  matriculationNumber: string
  title: string
  description: string
  // JSON array of languages, e.g. '["English","German"]', as the
  // Microsoft Form stored it; ProposalMeta parses it.
  language: string
  studyLevel: string
  topicAreaSlug: string
  // YYYY-MM-DD
  plannedStartAt: string
  motivation: string
  additionalStudentComment?: string
  allowUsage: boolean
  allowPublication: boolean
  // Blob names in the upload container, as returned by generateSasQueryToken.
  proposalFile: string
  cvFile: string
  transcriptFile: string
  furtherAttachments: string[]
}

export interface SubmissionTopicArea {
  slug: string
  name: string
}

export interface SubmittedAttachment {
  name: string
  href: string
  type: string
}

export interface NewStudentProposal {
  id: string
  title: string
  description: string
  language: string
  studyLevel: string
  topicAreaSlug: string
  additionalStudentComment?: string
  email: string
  matriculationNumber: string
  fullName: string
  plannedStartAt: Date
  motivation: string
  allowUsage: boolean
  allowPublication: boolean
  attachments: SubmittedAttachment[]
}

export interface ProposalSubmissionStore {
  findTopicArea(slug: string): Promise<SubmissionTopicArea | null>
  hasSubmitted(email: string, title: string): Promise<boolean>
  createProposal(proposal: NewStudentProposal): Promise<void>
}

// Supervisors are matched on their topic areas and their notification
// opt-in, which the Power Automate flow read from the SharePoint list.
export interface SupervisorMatcher {
  findNotifiedSupervisorEmails(topicAreaSlug: string): Promise<string[]>
}

// Supervisors of this department who follow the topic area and opted into
// submission notifications (Admin → Supervisors or "My topic areas").
export function createSupervisorMatcher(
  store: Pick<SupervisorStore, 'findSupervisorsToNotify'>
): SupervisorMatcher {
  return {
    async findNotifiedSupervisorEmails(topicAreaSlug) {
      const supervisors = await store.findSupervisorsToNotify(topicAreaSlug)
      return supervisors.map((supervisor) => supervisor.email)
    },
  }
}

export type ProposalSubmissionErrorCode =
  | 'INVALID_FILE'
  | 'TOPIC_AREA_NOT_FOUND'
  | 'ALREADY_SUBMITTED'
  | 'UPLOAD_FAILED'

export class ProposalSubmissionError extends Error {
  constructor(
    readonly code: ProposalSubmissionErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ProposalSubmissionError'
  }
}

export function createPrismaProposalSubmissionStore(
  prisma: PrismaClient,
  department: Department
): ProposalSubmissionStore {
  return {
    async findTopicArea(slug) {
      return prisma.topicArea.findFirst({
        where: { slug, department },
        select: { slug: true, name: true },
      })
    },

    async hasSubmitted(email, title) {
      const application = await prisma.proposalApplication.findFirst({
        where: {
          email,
          proposal: { title, typeKey: ProposalType.STUDENT },
        },
        select: { id: true },
      })
      return application !== null
    },

    // Same rows the flow's persistProposalSubmission callback wrote: the
    // student's own application shares the proposal id and carries no
    // attachments of its own.
    async createProposal(proposal) {
      await prisma.$transaction([
        prisma.proposal.create({
          data: {
            id: proposal.id,
            title: proposal.title,
            description: proposal.description,
            language: proposal.language,
            studyLevel: proposal.studyLevel,
            topicAreaSlug: proposal.topicAreaSlug,
            additionalStudentComment: proposal.additionalStudentComment,
            typeKey: ProposalType.STUDENT,
            statusKey: ProposalStatus.OPEN,
            department,
            attachments: { create: proposal.attachments },
          },
        }),
        prisma.proposalApplication.create({
          data: {
            id: proposal.id,
            statusKey: 'OPEN',
            email: proposal.email,
            matriculationNumber: proposal.matriculationNumber,
            fullName: proposal.fullName,
            plannedStartAt: proposal.plannedStartAt,
            motivation: proposal.motivation,
            proposalId: proposal.id,
            allowUsage: proposal.allowUsage,
            allowPublication: proposal.allowPublication,
          },
        }),
      ])
    },
  }
}

const formatMultiline = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br>')

export function formatLanguages(language: string): string {
  try {
    const parsed: unknown = JSON.parse(language)
    if (Array.isArray(parsed)) return parsed.join(', ')
  } catch {
    // Not JSON; shown as is.
  }
  return language
}

function attachmentList(attachments: SubmittedAttachment[]) {
  const items = attachments
    .map((attachment) => {
      const href = escapeHtml(attachment.href)
      return `<li>${escapeHtml(attachment.name)}: <a href="${href}">${href}</a></li>`
    })
    .join('')
  return `<ul>${items}</ul>`
}

export function buildSubmissionConfirmationEmail({
  department,
  input,
  topicArea,
  attachments,
  submittedAt,
  managementRecipients,
}: {
  // Short department name (DF, IBW) used in the subject and the signature.
  department: string
  input: ProposalSubmissionInput
  topicArea: SubmissionTopicArea
  attachments: SubmittedAttachment[]
  submittedAt: Date
  managementRecipients: string[]
}): Parameters<typeof sendMail>[0] {
  const dept = escapeHtml(department)
  const comment = input.additionalStudentComment?.trim()

  return {
    to: [input.uzhemail],
    replyTo: managementRecipients[0],
    subject: `${department} Theses - Your Proposal has been received (${input.title})`,
    bodyAsHtml:
      `<p>Dear ${escapeHtml(input.fullName)},<br><br>` +
      `We have received your thesis proposal with the information as provided below. Please keep in mind that the thesis matching process usually takes about one month, but might take less or more depending on the workload of our supervisors. You will hear from us as soon as the proposal has been matched to a supervisor or if any further action from your side should be required.<br><br>` +
      `If you have any <strong>urgent</strong> questions, please contact our ${dept} Thesis Coordinator by replying to this email.<br><br>` +
      `Best regards,<br>${dept} Thesis Coordinator<br><br>---<br><br>` +
      `<strong>Submitted By:</strong> ${dayjs(submittedAt).format('YYYY-MM-DD HH:mm')} (${escapeHtml(input.uzhemail)})<br><br>` +
      `<strong>Proposed Title:</strong> ${escapeHtml(input.title)}<br>` +
      `<strong>Thesis Language:</strong> ${escapeHtml(formatLanguages(input.language))}<br>` +
      `<strong>Study Level:</strong> ${escapeHtml(input.studyLevel)}<br>` +
      `<strong>Field of Research:</strong> ${escapeHtml(topicArea.name)}<br>` +
      `<strong>Planned Start Date:</strong> ${escapeHtml(input.plannedStartAt)}<br><br>` +
      `<strong>Summary:</strong> ${formatMultiline(input.description)}<br>` +
      `<strong>Motivation:</strong> ${formatMultiline(input.motivation)}<br>` +
      (comment
        ? `<strong>Additional Comment:</strong> ${formatMultiline(comment)}<br>`
        : '') +
      `<br><strong>Documents:</strong>${attachmentList(attachments)}</p>`,
    importance: 'High',
  }
}

export function buildSupervisorNotificationEmail({
  department,
  supervisorEmail,
  input,
  topicArea,
  proposalUrl,
  attachments,
  managementRecipients,
}: {
  department: string
  supervisorEmail: string
  input: ProposalSubmissionInput
  topicArea: SubmissionTopicArea
  proposalUrl: string
  attachments: SubmittedAttachment[]
  managementRecipients: string[]
}): Parameters<typeof sendMail>[0] {
  const dept = escapeHtml(department)

  return {
    to: [supervisorEmail],
    bcc: managementRecipients,
    replyTo: input.uzhemail,
    subject: `${department} Theses - New Proposal for Review (${input.title})`,
    bodyAsHtml:
      `<p>Dear Supervisor,<br><br>` +
      `We have a new Student Proposal that falls into your Area of interest - ${escapeHtml(topicArea.name)}.<br><br>` +
      `Please have a look here: ${escapeHtml(proposalUrl)}<br><br>` +
      `Documents:${attachmentList(attachments)}<br>` +
      `Best regards,<br>${dept} Thesis Coordinator</p>`,
    importance: 'High',
  }
}

// Replaces the Power Automate "Thesis Proposal Submission" flow: copies the
// student's PDFs to SharePoint through the file relay, saves the proposal
// with the student's own application, confirms it to the student and
// informs the supervisors who follow its topic area. The proposal stands
// even if an email, the matching or the blob cleanup fails; files already
// in SharePoint stay there if the write fails.
export async function submitStudentProposal({
  input,
  store,
  matcher,
  department,
  appUrl,
  containerName,
  managementRecipients,
  upload = uploadToSharePoint,
  send = sendMail,
  deleteBlob,
  newId = uuidv4,
  now = () => new Date(),
}: {
  input: ProposalSubmissionInput
  store: ProposalSubmissionStore
  matcher: SupervisorMatcher
  department: string
  appUrl: string
  containerName: string
  managementRecipients: string[]
  upload?: typeof uploadToSharePoint
  send?: typeof sendMail
  deleteBlob: (blobName: string) => Promise<void>
  newId?: () => string
  now?: () => Date
}): Promise<{
  proposalId: string
  studentEmailSent: boolean
  supervisorEmailsSent: number
}> {
  // The flow named the files "<id>_<kind>_<file>"; the kinds stay the same.
  const files = [
    { name: 'Proposal', kind: 'proposal', blobName: input.proposalFile },
    { name: 'CV', kind: 'cv', blobName: input.cvFile },
    { name: 'Transcript', kind: 'transcript', blobName: input.transcriptFile },
    ...input.furtherAttachments.map((blobName) => ({
      name: 'Attachment',
      kind: 'attachment',
      blobName,
    })),
  ]
  if (
    input.furtherAttachments.length > MAX_FURTHER_SUBMISSION_ATTACHMENTS ||
    !files.every((file) => isUploadedBlobName(file.blobName)) ||
    new Set(files.map((file) => file.blobName)).size !== files.length
  ) {
    throw new ProposalSubmissionError(
      'INVALID_FILE',
      'Please upload your documents again'
    )
  }

  const topicArea = await store.findTopicArea(input.topicAreaSlug)
  if (!topicArea) {
    throw new ProposalSubmissionError(
      'TOPIC_AREA_NOT_FOUND',
      'Field of research not found'
    )
  }
  // Checked before uploading so a double submit does not copy the files
  // again.
  if (await store.hasSubmitted(input.uzhemail, input.title)) {
    throw new ProposalSubmissionError(
      'ALREADY_SUBMITTED',
      'You have already submitted a proposal with this title'
    )
  }

  const proposalId = newId()
  const attachments: SubmittedAttachment[] = []
  for (const file of files) {
    let uploaded: SharePointUploadResult
    try {
      uploaded = await upload({
        blobPath: `${containerName}/${file.blobName}`,
        folder: `Proposals/${toSharePointName(input.uzhemail)}`,
        fileName: toSharePointName(
          `${proposalId}_${file.kind}_${file.blobName}`
        ),
      })
    } catch (error) {
      console.error('Submission file upload to SharePoint failed', {
        proposalId,
        file: file.name,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new ProposalSubmissionError(
        'UPLOAD_FAILED',
        'Your documents could not be stored'
      )
    }
    attachments.push({
      name: file.name,
      href: uploaded.webUrl,
      type: uploaded.mediaType,
    })
  }

  const additionalStudentComment = input.additionalStudentComment?.trim()
  await store.createProposal({
    id: proposalId,
    title: input.title,
    description: input.description,
    language: input.language,
    studyLevel: input.studyLevel,
    topicAreaSlug: topicArea.slug,
    additionalStudentComment: additionalStudentComment || undefined,
    email: input.uzhemail,
    matriculationNumber: input.matriculationNumber,
    fullName: input.fullName,
    plannedStartAt: dayjs(input.plannedStartAt).toDate(),
    motivation: input.motivation,
    allowUsage: input.allowUsage,
    allowPublication: input.allowPublication,
    attachments,
  })

  const trySend = async (
    kind: string,
    email: Parameters<typeof sendMail>[0]
  ) => {
    try {
      return await send(email)
    } catch (error) {
      console.error(`Failed to send submission ${kind} email`, {
        proposalId,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  const studentEmailSent = await trySend(
    'confirmation',
    buildSubmissionConfirmationEmail({
      department,
      input,
      topicArea,
      attachments,
      submittedAt: now(),
      managementRecipients,
    })
  )

  let supervisorEmails: string[] = []
  try {
    supervisorEmails = [
      ...new Set(await matcher.findNotifiedSupervisorEmails(topicArea.slug)),
    ]
  } catch (error) {
    console.error('Failed to match supervisors for submission', {
      proposalId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  let supervisorEmailsSent = 0
  for (const supervisorEmail of supervisorEmails) {
    const sent = await trySend(
      'supervisor',
      buildSupervisorNotificationEmail({
        department,
        supervisorEmail,
        input,
        topicArea,
        proposalUrl: `${appUrl}/${proposalId}`,
        attachments,
        managementRecipients,
      })
    )
    if (sent) supervisorEmailsSent++
  }

  // The files now live in SharePoint; a leftover blob is only clutter.
  for (const file of files) {
    try {
      await deleteBlob(file.blobName)
    } catch (error) {
      console.warn('Failed to delete uploaded submission blob', {
        proposalId,
        blobName: file.blobName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { proposalId, studentEmailSent, supervisorEmailsSent }
}
