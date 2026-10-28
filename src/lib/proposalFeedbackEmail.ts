import { escapeHtml } from './mail/escapeHtml'

export const PROPOSAL_FEEDBACK_ACTIONS = [
  'ACCEPT',
  'ACCEPT_TENTATIVE',
  'DECLINE',
  'REJECT',
] as const

export type ProposalFeedbackAction = (typeof PROPOSAL_FEEDBACK_ACTIONS)[number]

interface ProposalFeedbackEmailInput {
  actionType: ProposalFeedbackAction
  // Short department name (DF, IBW) used in subjects and the signature.
  department: string
  proposalTitle: string
  studentEmail: string
  studentFullName: string
  supervisorEmail: string
  comment: string
  reason?: string
  managementRecipients: string[]
}

export interface ProposalFeedbackEmail {
  to: string[]
  bcc?: string[]
  replyTo?: string
  subject: string
  bodyAsHtml: string
}

const formatMultiline = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br>')

// Builds the email the Power Automate "Thesis Proposal Feedback" flow used to
// send: accepts go to the student and the supervisor (BCC the management
// inbox, replies to the supervisor), declines and rejects go to the
// management inbox only.
export function buildProposalFeedbackEmail({
  actionType,
  department,
  proposalTitle,
  studentEmail,
  studentFullName,
  supervisorEmail,
  comment,
  reason,
  managementRecipients,
}: ProposalFeedbackEmailInput): ProposalFeedbackEmail {
  const title = escapeHtml(proposalTitle)
  const supervisor = escapeHtml(supervisorEmail)
  const signature = `Best regards,<br>${escapeHtml(department)} Thesis Coordinator`

  switch (actionType) {
    case 'ACCEPT':
      return {
        to: [studentEmail, supervisorEmail],
        bcc: managementRecipients,
        replyTo: supervisorEmail,
        subject: `${department} Theses - Your Proposal has been accepted`,
        bodyAsHtml: `<p>Dear ${escapeHtml(studentFullName)},<br><br>Your proposal on "${title}" has been accepted by a supervisor. Please get in touch with your supervisor "${supervisor}" to get started with the thesis process (just reply to this email).<br><br>${signature}<br><br>---<br><br>Message of your supervisor: ${formatMultiline(comment)}</p>`,
      }
    case 'ACCEPT_TENTATIVE':
      return {
        to: [studentEmail, supervisorEmail],
        bcc: managementRecipients,
        replyTo: supervisorEmail,
        subject: `${department} Theses - Your Proposal has attracted interest`,
        bodyAsHtml: `<p>Dear ${escapeHtml(studentFullName)},<br><br>Your proposal on "${title}" has attracted the interest of a supervisor on the condition that the proposal is improved in certain areas. Please review the supervisor feedback, adjust your proposal as needed, and get in touch with your potential supervisor "${supervisor}" (just reply to this email).<br><br>${signature}<br><br>---<br><br>Feedback of your potential supervisor: ${formatMultiline(comment)}</p>`,
      }
    case 'DECLINE':
    case 'REJECT': {
      const verb = actionType === 'DECLINE' ? 'declined' : 'rejected'
      return {
        to: managementRecipients,
        subject: `${department} Theses - Proposal ${verb} (${proposalTitle})`,
        bodyAsHtml: `<p>The proposal "${title}" has been ${verb} by "${supervisor}".<br><br><strong>Reason:</strong> ${escapeHtml(reason)}<br><strong>Comment:</strong> ${formatMultiline(comment)}</p>`,
      }
    }
  }
}
