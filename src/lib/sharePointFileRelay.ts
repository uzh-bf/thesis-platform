interface SharePointUploadInput {
  // Path of the source blob including its container, e.g. "uploads/<name>".
  blobPath: string
  // Folder inside the proposals document library, e.g. "Proposals/<email>".
  folder: string
  fileName: string
}

export interface SharePointUploadResult {
  // Organization-scoped view link to the uploaded file.
  webUrl: string
  mediaType: string
}

// A stalled relay fails the upload instead of blocking the request.
const RELAY_TIMEOUT_MS = 60_000

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function isFileRelayConfigured(): boolean {
  return readEnv('FILE_RELAY_HTTP_URL') !== null
}

// Characters SharePoint does not allow in file or folder names.
export function toSharePointName(value: string): string {
  return value.replace(/["*:<>?/\\|#%]/g, '_')
}

// Copies a blob into the thesis SharePoint library through the
// "SharePoint File Relay" Power Automate flow. The relay shares the Mail
// Relay's secret, so both flows read the same environment variable.
export async function uploadToSharePoint(
  input: SharePointUploadInput
): Promise<SharePointUploadResult> {
  const triggerUrl = readEnv('FILE_RELAY_HTTP_URL')
  const secret = readEnv('MAIL_SENDING_FLOW_SECRET')

  if (!triggerUrl || !secret) {
    throw new Error(
      'uploadToSharePoint: FILE_RELAY_HTTP_URL or MAIL_SENDING_FLOW_SECRET missing'
    )
  }

  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ ...input, secret }),
    signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`uploadToSharePoint status=${response.status}`)
  }

  const body = (await response.json()) as Partial<SharePointUploadResult>

  if (!body.webUrl) {
    throw new Error('uploadToSharePoint: relay response has no webUrl')
  }

  return {
    webUrl: body.webUrl,
    mediaType: body.mediaType || 'application/pdf',
  }
}
