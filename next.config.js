const hasMatomoTracking =
  process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF' &&
  process.env.ENABLE_DF_WEBSTATS === 'true'

const resolveAlias = hasMatomoTracking
  ? {
      'src/components/MatomoTracking': './analytics/MatomoTracking.tsx',
    }
  : {}

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
}

module.exports = nextConfig
