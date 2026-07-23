import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isIpAllowed, parseIpRanges } from 'src/lib/ipAllowlist'

/**
 * Restricts the admin area to requests originating from allowed networks
 * (e.g. the UZH network / VPN). The allowed ranges are configured via the
 * ADMIN_ALLOWED_IP_RANGES environment variable as a comma-separated list of
 * CIDR ranges, e.g. "130.60.0.0/16". If the variable is unset or empty, no
 * network restriction is applied (local development).
 *
 * Covers both the admin pages (/admin, /admin/*) and all admin tRPC
 * procedures (named admin*), which are called via /api/trpc.
 */

const allowedRanges = parseIpRanges(process.env.ADMIN_ALLOWED_IP_RANGES)

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/trpc/:path*'],
}

function getClientIp(request: NextRequest): string | null {
  // Set by the ingress / reverse proxy in front of the app
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  return null
}

function isAdminTrpcRequest(pathname: string): boolean {
  const procedures = pathname.replace(/^\/api\/trpc\//, '')
  // Batched requests address multiple procedures as a comma-separated list
  return procedures
    .split(',')
    .some((procedure) => procedure.trim().startsWith('admin'))
}

export function middleware(request: NextRequest) {
  if (allowedRanges.length === 0) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const isApiRequest = pathname.startsWith('/api/trpc/')
  if (isApiRequest && !isAdminTrpcRequest(pathname)) {
    return NextResponse.next()
  }

  const clientIp = getClientIp(request)
  if (clientIp && isIpAllowed(clientIp, allowedRanges)) {
    return NextResponse.next()
  }

  if (isApiRequest) {
    return NextResponse.json(
      {
        error: {
          message:
            'The admin area is only accessible from within the UZH network. Please connect to the UZH VPN and try again.',
          code: 'FORBIDDEN',
        },
      },
      { status: 403 }
    )
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Access restricted</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f4f4f5; color: #18181b; }
      main { max-width: 28rem; padding: 2.5rem; background: #fff; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
      h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
      p { margin: 0; line-height: 1.6; color: #52525b; }
    </style>
  </head>
  <body>
    <main>
      <h1>Access restricted</h1>
      <p>The admin area is only accessible from within the UZH network. Please connect to the UZH VPN and reload this page.</p>
    </main>
  </body>
</html>`,
    {
      status: 403,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  )
}
