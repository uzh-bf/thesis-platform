const CLEVERREACH_BASE = 'https://rest.cleverreach.com'

export interface CleverReachReplacement {
  placeholder: string
  replacement: string
}

export async function getAccessToken({
  clientId,
  clientSecret,
}: {
  clientId: string
  clientSecret: string
}): Promise<string> {
  const response = await fetch(`${CLEVERREACH_BASE}/oauth/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!response.ok) {
    throw new Error(`CleverReach OAuth failed: status=${response.status}`)
  }

  const data = (await response.json()) as { access_token?: string }

  if (!data.access_token) {
    throw new Error('CleverReach OAuth returned no access_token')
  }

  return data.access_token
}

interface CleverReachTemplate {
  name: string
  file: string
}

export async function fetchTemplateHtml(
  templateName: string,
  token: string
): Promise<string> {
  const response = await fetch(
    `${CLEVERREACH_BASE}/v3/mailings/templates/user.json?token=${encodeURIComponent(
      token
    )}`
  )

  if (!response.ok) {
    throw new Error(
      `CleverReach template list failed: status=${response.status}`
    )
  }

  const data = (await response.json()) as { templates?: CleverReachTemplate[] }
  const template = data.templates?.find((item) => item.name === templateName)

  if (!template?.file) {
    throw new Error(`CleverReach template not found: ${templateName}`)
  }

  const htmlResponse = await fetch(template.file)

  if (!htmlResponse.ok) {
    throw new Error(
      `CleverReach template content fetch failed: status=${htmlResponse.status}`
    )
  }

  return htmlResponse.text()
}

export function renderTemplate(
  html: string,
  replacements: CleverReachReplacement[]
): string {
  const values = new Map(
    replacements.map(({ placeholder, replacement }) => [
      placeholder,
      replacement,
    ])
  )

  return html.replace(
    /\[\[(\w+)\]\]/g,
    (token, key) => values.get(key) ?? token
  )
}

export async function createDraftMailing({
  token,
  name,
  subject,
  senderName,
  senderEmail,
  html,
  text,
  filterId,
}: {
  token: string
  name: string
  subject: string
  senderName: string
  senderEmail: string
  html: string
  text: string
  filterId: string
}): Promise<string> {
  const response = await fetch(
    `${CLEVERREACH_BASE}/v3/mailings.json?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject,
        sender_name: senderName,
        sender_email: senderEmail,
        content: { type: 'html', html, text },
        receivers: { filter: filterId },
      }),
    }
  )

  if (!response.ok) {
    const body = (await response.text()).replace(
      /token=[^&\s"']+/gi,
      'token=REDACTED'
    )
    throw new Error(
      `CleverReach mailing create failed: status=${response.status} body=${body}`
    )
  }

  const data = (await response.json()) as { id?: string | number }

  if (!data.id) {
    throw new Error('CleverReach mailing create returned no id')
  }

  return String(data.id)
}
