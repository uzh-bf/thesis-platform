/** @type {import('next').NextConfig} */
const path = require('path')

const hasMatomoTracking =
  process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF' &&
  process.env.ENABLE_DF_WEBSTATS === 'true'

// Origins allowed to embed the platform in an iframe (CSP frame-ancestors).
// Override with a space-separated source list, e.g.
// FRAME_ANCESTORS="'self' https://*.uzh.ch https://partner.example.com"
const frameAncestors =
  process.env.FRAME_ANCESTORS?.trim() || "'self' https://*.uzh.ch"

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
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
  webpack(config) {
    if (hasMatomoTracking) {
      config.resolve.alias['src/components/MatomoTracking$'] = path.resolve(
        __dirname,
        'analytics/MatomoTracking.tsx'
      )
    }

    return config
  },
}

module.exports = nextConfig
