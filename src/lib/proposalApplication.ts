import type { PrismaClient } from '@prisma/client'
import { escapeHtml } from 'src/lib/cleverreach/thesisProposal'
import {
  type ReportFailure,
  describeError,
  ignoreFailures,
} from 'src/lib/failureNotification'
import { sendMail } from 'src/lib/mail/sendMail'
import {
  type SharePointUploadResult,
  toSharePointName,
  uploadToSharePoint,
} from 'src/lib/sharePointFileRelay'
import { v4 as uuidv4 } from 'uuid'

export interface ProposalApplicationInput {
  proposalId: string
  uzhemail: string
  matriculationNumber: string
  fullName: string
  startingDate: string
  motivation: string
  // Blob names in the upload container, as returned by generateSasQueryToken.
  cvFile: string
  transcriptFile: string
  allowUsage: boolean
  allowPublication: boolean
}

export interface AppliedProposal {
  title: string
  ownedByUserEmail: string | null
  supervisorEmail: string | null
}

export interface ApplicationAttachment {
  name: string
  href: string
  type: string
}

export interface NewProposalApplication {
  id: string
  proposalId: string
  email: string
  matriculationNumber: string
  fullName: string
  plannedStartAt: Date
  motivation: string
  allowUsage: boolean
  allowPublication: boolean
  attachments: ApplicationAttachment[]
}

export interface ProposalApplicationStore {
  findProposal(proposalId: string): Promise<AppliedProposal | null>
  hasApplied(proposalId: string, email: string): Promise<boolean>
  createApplication(application: NewProposalApplication): Promise<void>
}

export type ProposalApplicationErrorCode =
  'INVALID_FILE' | 'PROPOSAL_NOT_FOUND' | 'ALREADY_APPLIED' | 'UPLOAD_FAILED'

export class ProposalApplicationError extends Error {
  constructor(
    readonly code: ProposalApplicationErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ProposalApplicationError'
  }
}

// generateSasQueryToken names every upload "<uuid>-<sanitized name>.pdf".
// Anything else did not come from this form and is not copied anywhere.
const UPLOADED_BLOB_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[\w.-]+\.pdf$/i

export const isUploadedBlobName = (value: string) =>
  UPLOADED_BLOB_NAME.test(value)

export function createPrismaProposalApplicationStore(
  prisma: PrismaClient
): ProposalApplicationStore {
  return {
    async findProposal(proposalId) {
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        select: {
          title: true,
          ownedByUserEmail: true,
          supervisedBy: { select: { supervisorEmail: true }, take: 1 },
        },
      })
      if (!proposal) return null
      return {
        title: proposal.title,
        ownedByUserEmail: proposal.ownedByUserEmail,
        supervisorEmail: proposal.supervisedBy[0]?.supervisorEmail ?? null,
      }
    },

    async hasApplied(proposalId, email) {
      const application = await prisma.proposalApplication.findUnique({
        where: { proposalId_email: { proposalId, email } },
        select: { id: true },
      })
      return application !== null
    },

    async createApplication(application) {
      await prisma.proposalApplication.create({
        data: {
          id: application.id,
          statusKey: 'OPEN',
          email: application.email,
          matriculationNumber: application.matriculationNumber,
          fullName: application.fullName,
          plannedStartAt: application.plannedStartAt,
          motivation: application.motivation,
          proposalId: application.proposalId,
          allowUsage: application.allowUsage,
          allowPublication: application.allowPublication,
          attachments: { create: application.attachments },
        },
      })
    },
  }
}

const formatMultiline = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br>')

function applicationDetails(input: ProposalApplicationInput) {
  return [
    ['Fullname', escapeHtml(input.fullName)],
    ['Matriculation Number', escapeHtml(input.matriculationNumber)],
    ['Start Date', escapeHtml(input.startingDate)],
    ['Motivation', formatMultiline(input.motivation)],
  ]
}

export function buildApplicationReceivedEmail({
  department,
  proposal,
  input,
  cvUrl,
  transcriptUrl,
  managementRecipients,
}: {
  // Short department name (DF, IBW) used in the subject.
  department: string
  proposal: AppliedProposal
  input: ProposalApplicationInput
  cvUrl: string
  transcriptUrl: string
  managementRecipients: string[]
}): Parameters<typeof sendMail>[0] {
  // Proposals without a supervision row still reach their owner.
  const supervisor = proposal.supervisorEmail ?? proposal.ownedByUserEmail
  const owner = proposal.ownedByUserEmail
  const details = applicationDetails(input)
    .map(([label, value]) => `<strong>${label}: </strong>${value}<br>`)
    .join('\n')

  return {
    to: supervisor ? [supervisor] : [],
    cc: owner && owner !== supervisor ? [owner] : undefined,
    bcc: managementRecipients,
    replyTo: input.uzhemail,
    subject: `${department} Theses - New Application for Proposal "${proposal.title}"`,
    bodyAsHtml: `<p>${details}\n<br>\n<strong>Transcript: <br>\n</strong><strong>${escapeHtml(transcriptUrl)}</strong><br>\n<strong>Personal CV: <br>\n</strong><strong>${escapeHtml(cvUrl)}</strong></p>`,
    importance: 'Normal',
  }
}

export function buildApplicationConfirmationEmail({
  department,
  proposal,
  input,
  managementRecipients,
}: {
  department: string
  proposal: AppliedProposal
  input: ProposalApplicationInput
  managementRecipients: string[]
}): Parameters<typeof sendMail>[0] {
  const dept = escapeHtml(department)
  const details = applicationDetails(input)
    .map(([label, value]) => `${label}: ${value}`)
    .join('<br>')

  return {
    to: [input.uzhemail],
    bcc: managementRecipients,
    replyTo: managementRecipients[0],
    subject: `${department} Theses - Confirmation Mail`,
    bodyAsHtml: `<p>Dear ${escapeHtml(input.fullName)},<br><br>Thank you for applying to the following proposal: "${escapeHtml(proposal.title)}".<br><br>Best regards,<br>${dept} Thesis Coordinator<br><br>---<br><br>${details}</p>`,
    importance: 'Normal',
  }
}

// Replaces the Power Automate "Thesis Proposal Application" flow: copies the
// CV and transcript to SharePoint through the file relay, saves the
// application with both links, and informs the supervisor and the student.
// The application stands even if an email or the blob cleanup fails; files
// already in SharePoint stay there if the write fails. Failed emails are
// reported.
export async function submitProposalApplication({
  input,
  store,
  department,
  containerName,
  managementRecipients,
  upload = uploadToSharePoint,
  send = sendMail,
  deleteBlob,
  newId = uuidv4,
  reportFailure = ignoreFailures,
}: {
  input: ProposalApplicationInput
  store: ProposalApplicationStore
  department: string
  containerName: string
  managementRecipients: string[]
  upload?: typeof uploadToSharePoint
  send?: typeof sendMail
  deleteBlob: (blobName: string) => Promise<void>
  newId?: () => string
  reportFailure?: ReportFailure
}): Promise<{
  applicationId: string
  supervisorEmailSent: boolean
  studentEmailSent: boolean
}> {
  const files = [
    { name: 'CV', blobName: input.cvFile },
    { name: 'Transcript', blobName: input.transcriptFile },
  ]
  if (!files.every((file) => isUploadedBlobName(file.blobName))) {
    throw new ProposalApplicationError(
      'INVALID_FILE',
      'Please upload your CV and transcript again'
    )
  }

  const proposal = await store.findProposal(input.proposalId)
  if (!proposal) {
    throw new ProposalApplicationError(
      'PROPOSAL_NOT_FOUND',
      'Proposal not found'
    )
  }
  // One application per student and proposal (unique in the database);
  // checked first so a repeat does not copy the files again.
  if (await store.hasApplied(input.proposalId, input.uzhemail)) {
    throw new ProposalApplicationError(
      'ALREADY_APPLIED',
      'You have already applied to this proposal'
    )
  }

  const applicationId = newId()
  const attachments: ApplicationAttachment[] = []
  for (const file of files) {
    let uploaded: SharePointUploadResult
    try {
      uploaded = await upload({
        blobPath: `${containerName}/${file.blobName}`,
        folder: `Applications/${toSharePointName(input.proposalId)}`,
        fileName: toSharePointName(file.blobName),
      })
    } catch (error) {
      console.error('Application file upload to SharePoint failed', {
        proposalId: input.proposalId,
        file: file.name,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new ProposalApplicationError(
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

  await store.createApplication({
    id: applicationId,
    proposalId: input.proposalId,
    email: input.uzhemail,
    matriculationNumber: input.matriculationNumber,
    fullName: input.fullName,
    plannedStartAt: new Date(input.startingDate),
    motivation: input.motivation,
    allowUsage: input.allowUsage,
    allowPublication: input.allowPublication,
    attachments,
  })

  const problems: string[] = []
  const trySend = async (
    kind: string,
    email: Parameters<typeof sendMail>[0]
  ) => {
    try {
      const sent = await send(email)
      if (!sent) {
        problems.push(
          `The ${kind} email to ${email.to.join(', ') || '(no recipient)'} was not sent`
        )
      }
      return sent
    } catch (error) {
      console.error(`Failed to send application ${kind} email`, {
        applicationId,
        error: describeError(error),
      })
      problems.push(
        `The ${kind} email to ${email.to.join(', ')} failed: ${describeError(error)}`
      )
      return false
    }
  }

  const supervisorEmailSent = await trySend(
    'received',
    buildApplicationReceivedEmail({
      department,
      proposal,
      input,
      cvUrl: attachments[0].href,
      transcriptUrl: attachments[1].href,
      managementRecipients,
    })
  )
  const studentEmailSent = await trySend(
    'confirmation',
    buildApplicationConfirmationEmail({
      department,
      proposal,
      input,
      managementRecipients,
    })
  )

  // The files now live in SharePoint; a leftover blob is only clutter.
  for (const file of files) {
    try {
      await deleteBlob(file.blobName)
    } catch (error) {
      console.warn('Failed to delete uploaded application blob', {
        applicationId,
        blobName: file.blobName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await reportFailure({
    process: 'Proposal application',
    reference: `application ${applicationId} to proposal ${input.proposalId}`,
    problems,
  })

  return { applicationId, supervisorEmailSent, studentEmailSent }
}
