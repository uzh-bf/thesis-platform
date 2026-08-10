import { sendMail } from 'src/lib/mail/sendMail'
import {
  createThesisProposalCleverReachDraft,
  escapeHtml,
  type ThesisProposalDraftPayload,
} from './thesisProposal'

const DEFAULT_CLEVERREACH_ADMIN_URL = 'https://eu2.cleverreach.com/admin'

export type ThesisProposalCleverReachReminderMail = Parameters<
  typeof sendMail
>[0]

type ReminderMailSender = (
  input: ThesisProposalCleverReachReminderMail
) => Promise<void>

type ReminderEnvironment = Record<string, string | undefined>

export interface ThesisProposalCleverReachReminderOptions {
  title: string
  recipients: string[]
  env?: ReminderEnvironment
  send?: ReminderMailSender
}

export function buildThesisProposalCleverReachReminderMail({
  title,
  recipients,
  env = process.env,
}: Omit<
  ThesisProposalCleverReachReminderOptions,
  'send'
>): ThesisProposalCleverReachReminderMail {
  const departmentName =
    env.NEXT_PUBLIC_DEPARTMENT_LONG_NAME?.trim() || 'Thesis Platform'
  const adminUrl =
    env.CLEVERREACH_ADMIN_URL?.trim() || DEFAULT_CLEVERREACH_ADMIN_URL

  return {
    to: recipients,
    subject: `${departmentName} Theses - CleverReach mailing ready for review`,
    bodyAsHtml: [
      '<p>A CleverReach thesis mailing is ready for review and sending.</p>',
      `<p><strong>Thesis title:</strong> ${escapeHtml(title)}</p>`,
      `<p><a href="${escapeHtml(adminUrl)}">Open CleverReach admin</a></p>`,
    ].join(''),
    importance: 'High',
  }
}

export async function sendThesisProposalCleverReachReminder({
  send = sendMail,
  ...options
}: ThesisProposalCleverReachReminderOptions): Promise<void> {
  await send(buildThesisProposalCleverReachReminderMail(options))
}

export async function createThesisProposalCleverReachDraftAndNotify(
  draftPayload: ThesisProposalDraftPayload,
  recipients: string[],
  {
    createDraft = createThesisProposalCleverReachDraft,
    sendReminder = sendThesisProposalCleverReachReminder,
  }: {
    createDraft?: typeof createThesisProposalCleverReachDraft
    sendReminder?: typeof sendThesisProposalCleverReachReminder
  } = {}
): Promise<void> {
  await createDraft(draftPayload)

  try {
    await sendReminder({
      title: draftPayload.title,
      recipients,
    })
  } catch (error) {
    console.error('CleverReach thesis proposal reminder failed', {
      proposalId: draftPayload.proposalId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
