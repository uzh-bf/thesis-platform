const hasMatomoTracking =
  process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF' &&
  process.env.ENABLE_DF_WEBSTATS === 'true'

const resolveAlias = hasMatomoTracking
  ? {
      'src/components/MatomoTracking': './analytics/MatomoTracking.tsx',
    }
  : {}

// Origins allowed to embed the platform in an iframe (CSP frame-ancestors).
// Override with a space-separated source list, e.g.
// FRAME_ANCESTORS="'self' https://*.uzh.ch https://partner.example.com"
const frameAncestors =
  process.env.FRAME_ANCESTORS?.trim() || "'self' https://*.uzh.ch"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactCompiler: true,
  reactStrictMode: true,
  transpilePackages: ['@uzh-bf/design-system'],
  turbopack: {
    resolveAlias,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
