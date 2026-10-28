function trimTrailingSlashes(url: string): string {
  let end = url.length
  while (end > 0 && url[end - 1] === '/') end--
  return url.slice(0, end)
}

// Absolute base URL for links in emails, without a trailing slash.
export function getAppBaseUrl(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim()

  if (nextAuthUrl) {
    return trimTrailingSlashes(nextAuthUrl)
  }

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (publicAppUrl) {
    const url = publicAppUrl.startsWith('http')
      ? publicAppUrl
      : `https://${publicAppUrl}`
    return trimTrailingSlashes(url)
  }

  return 'http://localhost:3000'
}
