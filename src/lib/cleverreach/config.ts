export interface CleverReachConfig {
  clientId: string
  clientSecret: string
  senderName: string
  senderEmail: string
  mailingNamePrefix: string
  templateName: string
  subjectTemplate: string
  filterId: string
  adminUrl: string
}

export type CleverReachConfigResult =
  | { ok: true; config: CleverReachConfig }
  | { ok: false; missing: string[] }

const CLEVERREACH_DEFAULTS = {
  adminUrl: 'https://eu2.cleverreach.com/admin',
  mailingNamePrefix: 'THESIS_PROPOSAL',
  senderEmail: 'df-community@mailing.uzh.ch',
  senderName: 'DF Community',
  subjectTemplate: 'New Thesis Available: {title}',
  templateName: 'THESIS_PROPOSAL_V0',
} as const

function envValue(
  env: Record<string, string | undefined>,
  name: string
): string | null {
  const value = env[name]?.trim()

  if (!value || value.toUpperCase() === 'EMPTY') {
    return null
  }

  return value
}

export function resolveThesisProposalCleverReachConfig(
  env: Record<string, string | undefined> = process.env
): CleverReachConfigResult {
  const clientId = envValue(env, 'CLEVERREACH_CLIENT_ID')
  const clientSecret = envValue(env, 'CLEVERREACH_CLIENT_SECRET')
  const filterId = envValue(env, 'CLEVERREACH_FILTER_THESES')

  const missing = [
    clientId ? null : 'clientId',
    clientSecret ? null : 'clientSecret',
    filterId ? null : 'filterId',
  ].filter((value): value is string => value !== null)

  if (missing.length > 0) {
    return { ok: false, missing }
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      filterId,
      adminUrl:
        envValue(env, 'CLEVERREACH_ADMIN_URL') ?? CLEVERREACH_DEFAULTS.adminUrl,
      mailingNamePrefix:
        envValue(env, 'CLEVERREACH_MAILING_NAME_PREFIX') ??
        CLEVERREACH_DEFAULTS.mailingNamePrefix,
      senderEmail:
        envValue(env, 'CLEVERREACH_SENDER_EMAIL') ??
        CLEVERREACH_DEFAULTS.senderEmail,
      senderName:
        envValue(env, 'CLEVERREACH_SENDER_NAME') ??
        CLEVERREACH_DEFAULTS.senderName,
      subjectTemplate:
        envValue(env, 'CLEVERREACH_SUBJECT_THESIS_PROPOSAL') ??
        CLEVERREACH_DEFAULTS.subjectTemplate,
      templateName:
        envValue(env, 'CLEVERREACH_TEMPLATE_THESIS_PROPOSAL') ??
        CLEVERREACH_DEFAULTS.templateName,
    },
  }
}
