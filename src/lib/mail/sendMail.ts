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
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export async function sendMail(input: SendMailInput): Promise<void> {
  const triggerUrl = readEnv('MAIL_SENDING_HTTP_URL')
  const secret = readEnv('FLOW_SECRET')
  const from = input.from ?? readEnv('MAIL_SENDING_FROM')

  if (!triggerUrl || !secret || !from) {
    console.warn(
      'sendMail skipped: MAIL_SENDING_HTTP_URL, FLOW_SECRET, or MAIL_SENDING_FROM missing'
    )
    return
  }

  if (input.to.length === 0) {
    console.warn('sendMail skipped: empty recipient list')
    return
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
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`sendMail status=${response.status} body=${errorText}`)
  }
}
