import { escapeHtml } from 'src/lib/cleverreach/thesisProposal'
import { sendMail } from 'src/lib/mail/sendMail'

export interface FailureReport {
  // What was running, e.g. "Student proposal submission".
  process: string
  // What it was about, e.g. "proposal 1234"; shown in the subject.
  reference?: string
  problems: string[]
}

export type ReportFailure = (report: FailureReport) => Promise<void>

// Used where nothing should be reported, e.g. in tests that do not care.
export const ignoreFailures: ReportFailure = async () => {}

export const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const parseRecipients = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean)

// The Power Automate flows mailed their failures to a dedicated inbox; the
// management recipients are the fallback until that list is configured.
export function getFailureNotificationRecipients(
  env: Record<string, string | undefined> = process.env
) {
  const recipients = parseRecipients(env.FAILURE_NOTIFICATION_RECIPIENTS)
  return recipients.length > 0
    ? recipients
    : parseRecipients(env.ADMIN_CHANGE_NOTIFICATION_RECIPIENTS)
}

// Staging also runs as department DF, so its failures would read exactly like
// production's; every deployed environment is named in the subject.
const environmentLabels: Record<string, string> = {
  prd: 'Production',
  prd_ibw: 'Production',
  stg: 'Staging',
  dev: 'Dev',
}

export function getFailureEnvironmentLabel(
  env: Record<string, string | undefined> = process.env
) {
  const environment = (env.THESIS_PLATFORM_ENV ?? '').trim().toLowerCase()
  return environmentLabels[environment] ?? ''
}

export function buildFailureNotificationEmail({
  department,
  environment = '',
  report,
  recipients,
}: {
  // Short department name (DF, IBW) used in the subject.
  department: string
  // e.g. "Production" or "Staging"; empty when unknown.
  environment?: string
  report: FailureReport
  recipients: string[]
}): Parameters<typeof sendMail>[0] {
  const prefix = environment ? `[${environment}] ` : ''
  const reference = report.reference ? ` (${report.reference})` : ''
  const problems = report.problems
    .map((problem) => `<li>${escapeHtml(problem)}</li>`)
    .join('')

  return {
    to: recipients,
    subject: `${prefix}${department} Theses - Failure: ${report.process}${reference}`,
    bodyAsHtml: `<p>${escapeHtml(report.process)}${escapeHtml(reference)} did not complete everything:</p><ul>${problems}</ul><p>Details are in the application logs.</p>`,
    importance: 'High',
  }
}

// Mails a failure report and never throws: reporting must not turn a saved
// submission into an error for the user. If the mail relay itself is down the
// report only reaches the logs.
export function createFailureReporter({
  department,
  environment,
  recipients,
  send = sendMail,
}: {
  department: string
  environment?: string
  recipients: string[]
  send?: typeof sendMail
}): ReportFailure {
  return async (report) => {
    if (report.problems.length === 0) return

    console.error('Failure report', report)
    if (recipients.length === 0) {
      console.warn(
        'Failure report not mailed: FAILURE_NOTIFICATION_RECIPIENTS and ADMIN_CHANGE_NOTIFICATION_RECIPIENTS are empty'
      )
      return
    }

    try {
      const sent = await send(
        buildFailureNotificationEmail({
          department,
          environment,
          report,
          recipients,
        })
      )
      if (!sent) console.warn('Failure report mail was skipped by sendMail')
    } catch (error) {
      console.error('Failed to mail failure report', {
        process: report.process,
        error: describeError(error),
      })
    }
  }
}
