import {
  createDraftMailing,
  fetchTemplateHtml,
  getAccessToken,
  renderTemplate,
  type CleverReachReplacement,
} from './client'
import {
  resolveThesisProposalCleverReachConfig,
  type CleverReachConfig,
} from './config'

const PREHEADER_MAX_LENGTH = 80

export interface ThesisProposalDraftPayload {
  proposalId: string
  title: string
  summary: string
  studyLevel: string
  languages: string[]
  timeFrame: string
  topicAreaName: string
  supervisorEmail: string
  supervisorName?: string | null
  responsibleEmail: string
  responsibleName?: string | null
  departmentName: string
  proposalUrl: string
}

export interface ThesisProposalMailingParams {
  config: CleverReachConfig
  name: string
  subject: string
  preheader: string
  replacements: CleverReachReplacement[]
  text: string
}

interface CleverReachDraftClient {
  createDraftMailing: typeof createDraftMailing
  fetchTemplateHtml: typeof fetchTemplateHtml
  getAccessToken: typeof getAccessToken
}

interface CreateThesisProposalDraftOptions {
  client?: CleverReachDraftClient
  env?: Record<string, string | undefined>
  now?: Date
}

export class CleverReachConfigError extends Error {
  constructor(public readonly missing: string[]) {
    super(`CleverReach settings incomplete: ${missing.join(', ')}`)
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeHtmlWithLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function formatContact(name: string | null | undefined, email: string): string {
  const cleanName = cleanText(name)
  const cleanEmail = cleanText(email)

  if (cleanName && cleanEmail) return `${cleanName} (${cleanEmail})`
  return cleanName || cleanEmail
}

function sentenceFromParts(parts: string[]): string {
  return `${parts.join(', ')}.`
}

function trimAtWordBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value

  const candidate = value.slice(0, maxLength - 3)
  const lastSpace = candidate.lastIndexOf(' ')
  const trimmed =
    lastSpace > 20 ? candidate.slice(0, lastSpace) : candidate.trimEnd()

  return `${trimmed.replace(/[,\s]+$/g, '')}...`
}

export function parseProposalLanguages(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown

    if (Array.isArray(parsed)) {
      return parsed.map(String).map(cleanText).filter(Boolean)
    }
  } catch {
    // Fall back to comma-separated values for older callers and test fixtures.
  }

  return value.split(',').map(cleanText).filter(Boolean)
}

export function buildThesisProposalPreheader({
  studyLevel,
  topicAreaName,
  timeFrame,
  supervisorName,
  supervisorEmail,
}: Pick<
  ThesisProposalDraftPayload,
  | 'studyLevel'
  | 'topicAreaName'
  | 'timeFrame'
  | 'supervisorName'
  | 'supervisorEmail'
>): string {
  const primaryParts = [studyLevel, topicAreaName, timeFrame]
    .map(cleanText)
    .filter(Boolean)
  const fallback = formatContact(supervisorName, supervisorEmail)
  const candidates = fallback ? [...primaryParts, fallback] : primaryParts
  const selected: string[] = []

  for (const part of candidates) {
    const candidate = sentenceFromParts([...selected, part])

    if (candidate.length <= PREHEADER_MAX_LENGTH) {
      selected.push(part)
    }
  }

  if (selected.length === 0) {
    return 'Neue Thesis Proposal Details.'
  }

  return trimAtWordBoundary(sentenceFromParts(selected), PREHEADER_MAX_LENGTH)
}

function buildPlainText(payload: ThesisProposalDraftPayload): string {
  return [
    payload.title,
    `Study level: ${payload.studyLevel}`,
    `Topic area: ${payload.topicAreaName}`,
    `Time frame: ${payload.timeFrame}`,
    `Language: ${payload.languages.join(', ')}`,
    `Supervisor: ${formatContact(payload.supervisorName, payload.supervisorEmail)}`,
    `Responsible: ${formatContact(payload.responsibleName, payload.responsibleEmail)}`,
    '',
    payload.summary,
    '',
    payload.proposalUrl,
  ]
    .filter((line) => line !== '')
    .join('\n')
}

export function buildThesisProposalMailingParams({
  payload,
  env = process.env,
  now = new Date(),
}: {
  payload: ThesisProposalDraftPayload
  env?: Record<string, string | undefined>
  now?: Date
}): ThesisProposalMailingParams | null {
  const resolvedConfig = resolveThesisProposalCleverReachConfig(env)

  if (!resolvedConfig.ok) {
    return null
  }

  const preheader = buildThesisProposalPreheader(payload)
  const subject = resolvedConfig.config.subjectTemplate.replaceAll(
    '{title}',
    payload.title
  )

  return {
    config: resolvedConfig.config,
    name: [
      resolvedConfig.config.mailingNamePrefix,
      `thesis-proposal-${payload.proposalId}`,
      now.toISOString(),
    ].join(' '),
    subject,
    preheader,
    replacements: [
      { placeholder: 'PREHEADER', replacement: escapeHtml(preheader) },
      { placeholder: 'PROPOSAL_TITLE', replacement: escapeHtml(payload.title) },
      {
        placeholder: 'PROPOSAL_SUMMARY',
        replacement: escapeHtmlWithLineBreaks(payload.summary),
      },
      {
        placeholder: 'PROPOSAL_SUPERVISOR',
        replacement: escapeHtml(
          formatContact(payload.supervisorName, payload.supervisorEmail)
        ),
      },
      {
        placeholder: 'PROPOSAL_RESPONSIBLE',
        replacement: escapeHtml(
          formatContact(payload.responsibleName, payload.responsibleEmail)
        ),
      },
      {
        placeholder: 'PROPOSAL_TYPE',
        replacement: escapeHtml(payload.studyLevel),
      },
      {
        placeholder: 'PROPOSAL_LANGUAGE',
        replacement: escapeHtml(payload.languages.join(', ')),
      },
      {
        placeholder: 'PROPOSAL_TIMEFRAME',
        replacement: escapeHtml(payload.timeFrame),
      },
      {
        placeholder: 'PROPOSAL_AREA',
        replacement: escapeHtml(payload.topicAreaName),
      },
      {
        placeholder: 'PROPOSAL_LINK',
        replacement: escapeHtml(payload.proposalUrl),
      },
      {
        placeholder: 'DEPARTMENT_NAME',
        replacement: escapeHtml(payload.departmentName),
      },
    ],
    text: buildPlainText(payload),
  }
}

export async function createThesisProposalCleverReachDraft(
  payload: ThesisProposalDraftPayload,
  options: CreateThesisProposalDraftOptions = {}
): Promise<{ mailingId: string }> {
  const client = options.client ?? {
    createDraftMailing,
    fetchTemplateHtml,
    getAccessToken,
  }
  const params = buildThesisProposalMailingParams({
    payload,
    env: options.env,
    now: options.now,
  })

  if (!params) {
    const resolvedConfig = resolveThesisProposalCleverReachConfig(options.env)

    if ('missing' in resolvedConfig) {
      throw new CleverReachConfigError(resolvedConfig.missing)
    }

    throw new CleverReachConfigError([])
  }

  const token = await client.getAccessToken({
    clientId: params.config.clientId,
    clientSecret: params.config.clientSecret,
  })
  const templateHtml = await client.fetchTemplateHtml(
    params.config.templateName,
    token
  )
  const html = renderTemplate(templateHtml, params.replacements)
  const mailingId = await client.createDraftMailing({
    token,
    name: params.name,
    subject: params.subject,
    senderName: params.config.senderName,
    senderEmail: params.config.senderEmail,
    html,
    text: params.text,
    filterId: params.config.filterId,
  })

  console.log(
    `CleverReach thesis proposal draft created for ${payload.proposalId}`,
    {
      mailingId,
    }
  )

  return { mailingId }
}
