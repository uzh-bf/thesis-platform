import type { Department, PrismaClient } from '@prisma/client'
import { escapeHtml } from 'src/lib/cleverreach/thesisProposal'
import { sendMail } from 'src/lib/mail/sendMail'

// Open student proposals are reminded after 8 weeks without an update; a
// reminded proposal is withdrawn when the student does not confirm it within
// one week.
export const STUDENT_PROPOSAL_REMINDER_INTERVAL_DAYS = 8 * 7
export const STUDENT_PROPOSAL_CONFIRMATION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export interface DueStudentProposal {
  id: string
  title: string
  emails: string[]
}

export interface StudentReminderStore {
  withdrawUnconfirmed(updatedBefore: Date): Promise<string[]>
  findDue(updatedBefore: Date): Promise<DueStudentProposal[]>
  // Resolves to false when the proposal is no longer open and due.
  markWaitingForStudent(id: string, updatedBefore: Date): Promise<boolean>
}

export interface StudentReminderResult {
  withdrawnProposalIds: string[]
  remindedProposalIds: string[]
  failedProposalIds: string[]
}

export function createPrismaStudentReminderStore(
  prisma: PrismaClient,
  department: Department
): StudentReminderStore {
  // Student proposals have no owning supervisor.
  const studentProposals = { ownedByUserEmail: null, department }

  return {
    async withdrawUnconfirmed(updatedBefore) {
      const proposals = await prisma.proposal.findMany({
        where: {
          ...studentProposals,
          statusKey: 'WAITING_FOR_STUDENT',
          updatedAt: { lt: updatedBefore },
        },
        select: { id: true },
      })
      const ids = proposals.map((proposal) => proposal.id)

      if (ids.length > 0) {
        await prisma.proposal.updateMany({
          where: { id: { in: ids }, statusKey: 'WAITING_FOR_STUDENT' },
          data: { statusKey: 'WITHDRAWN' },
        })
      }

      return ids
    },

    async findDue(updatedBefore) {
      const proposals = await prisma.proposal.findMany({
        where: {
          ...studentProposals,
          statusKey: 'OPEN',
          updatedAt: { lt: updatedBefore },
        },
        select: {
          id: true,
          title: true,
          applications: { select: { email: true } },
        },
      })

      return proposals.map((proposal) => ({
        id: proposal.id,
        title: proposal.title,
        emails: [...new Set(proposal.applications.map((app) => app.email))],
      }))
    },

    async markWaitingForStudent(id, updatedBefore) {
      // Skips a proposal the student confirmed while the job was running.
      const { count } = await prisma.proposal.updateMany({
        where: { id, statusKey: 'OPEN', updatedAt: { lt: updatedBefore } },
        data: { statusKey: 'WAITING_FOR_STUDENT' },
      })
      return count > 0
    },
  }
}

export function buildStudentReminderMail({
  proposal,
  appUrl,
}: {
  proposal: DueStudentProposal
  appUrl: string
}): Parameters<typeof sendMail>[0] {
  const confirmUrl = `${appUrl}/api/updateProposalUpdatedAt/${encodeURIComponent(proposal.id)}`

  return {
    to: proposal.emails,
    subject: 'Action Required: Proposal bestätigen',
    bodyAsHtml: [
      '<p><em>Dies ist eine automatisch generierte E-Mail.</em></p>',
      `<p>Bitte bestätige, ob dein Proposal mit dem Titel: „${escapeHtml(proposal.title)}“ noch aktuell ist.</p>`,
      `<p>Falls ja, klicke auf den folgenden Link: <a href="${escapeHtml(confirmUrl)}">Bestätigungslink</a><br>Falls nicht, kannst du diese E-Mail einfach ignorieren.</p>`,
      `<p><strong>Hinweis</strong>: Das Proposal wird automatisch gelöscht, sofern der Bestätigungslink nicht innerhalb von ${STUDENT_PROPOSAL_CONFIRMATION_DAYS} Tagen angeklickt wird.</p>`,
      '<p>Vielen Dank!</p>',
    ].join(''),
    importance: 'Normal',
  }
}

// Replaces the Student Reminder Power Automate flow. A reminder that cannot
// be sent leaves its proposal open, so the next run retries it.
export async function runStudentProposalReminders({
  store,
  appUrl,
  now = new Date(),
  send = sendMail,
}: {
  store: StudentReminderStore
  appUrl: string
  now?: Date
  send?: typeof sendMail
}): Promise<StudentReminderResult> {
  const withdrawnProposalIds = await store.withdrawUnconfirmed(
    new Date(now.getTime() - STUDENT_PROPOSAL_CONFIRMATION_DAYS * DAY_MS)
  )

  const dueBefore = new Date(
    now.getTime() - STUDENT_PROPOSAL_REMINDER_INTERVAL_DAYS * DAY_MS
  )
  const dueProposals = await store.findDue(dueBefore)

  const remindedProposalIds: string[] = []
  const failedProposalIds: string[] = []

  for (const proposal of dueProposals) {
    try {
      const sent = await send(buildStudentReminderMail({ proposal, appUrl }))
      if (!sent) {
        throw new Error('mail relay not configured or no recipients')
      }
      if (await store.markWaitingForStudent(proposal.id, dueBefore)) {
        remindedProposalIds.push(proposal.id)
      }
    } catch (error) {
      console.error('Student proposal reminder failed', {
        proposalId: proposal.id,
        error: error instanceof Error ? error.message : String(error),
      })
      failedProposalIds.push(proposal.id)
    }
  }

  return { withdrawnProposalIds, remindedProposalIds, failedProposalIds }
}
