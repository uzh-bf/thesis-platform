interface SendMailInput {
  to: string[]
  subject: string
  bodyAsHtml: string
  from?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  sensitivity?: 'Normal' | 'Personal' | 'Private' | 'Confidential'
  importance?: 'Low' | 'Normal' | 'High'
  // Aborts the relay request after this many milliseconds; unset waits as
  // long as the relay takes.
  timeoutMs?: number
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

// Resolves to false when the mail was skipped because the relay is not
// configured or there are no recipients.
export async function sendMail(input: SendMailInput): Promise<boolean> {
  const triggerUrl = readEnv('MAIL_SENDING_HTTP_URL')
  const secret = readEnv('MAIL_SENDING_FLOW_SECRET')
  const from = input.from ?? readEnv('MAIL_SENDING_FROM')

  if (!triggerUrl || !secret || !from) {
    console.warn(
      'sendMail skipped: MAIL_SENDING_HTTP_URL, MAIL_SENDING_FLOW_SECRET, or MAIL_SENDING_FROM missing'
    )
    return false
  }

  if (input.to.length === 0) {
    console.warn('sendMail skipped: empty recipient list')
    return false
  }

  const body = {
    from,
    to: input.to,
    subject: input.subject,
    bodyAsHtml: input.bodyAsHtml,
    secret,
    ...(input.cc && input.cc.length > 0 ? { cc: input.cc } : {}),
    ...(input.bcc && input.bcc.length > 0 ? { bcc: input.bcc } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.sensitivity ? { sensitivity: input.sensitivity } : {}),
    ...(input.importance ? { importance: input.importance } : {}),
  }

  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    ...(input.timeoutMs
      ? { signal: AbortSignal.timeout(input.timeoutMs) }
      : {}),
  })

  if (!response.ok) {
    throw new Error(`sendMail status=${response.status}`)
  }

  return true
}
