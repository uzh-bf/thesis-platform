// Absolute base URL for links in emails, without a trailing slash.
export function getAppBaseUrl(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim()

  if (nextAuthUrl) {
    return nextAuthUrl.replace(/\/+$/g, '')
  }

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (publicAppUrl) {
    const url = publicAppUrl.startsWith('http')
      ? publicAppUrl
      : `https://${publicAppUrl}`
    return url.replace(/\/+$/g, '')
  }

  return 'http://localhost:3000'
}
