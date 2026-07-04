/** @type {import('next').NextConfig} */
const path = require('path')

const hasMatomoTracking =
  process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF' &&
  process.env.ENABLE_DF_WEBSTATS === 'true'

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@uzh-bf/design-system'],
  typescript: {
    ignoreBuildErrors: true,
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
