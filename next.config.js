/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  publicRuntimeConfig: {
    // These will be available on both server and client at runtime
    // Note: We use non-NEXT_PUBLIC_ vars here because we want runtime values
    FAQ_URL_STUDENT: process.env.FAQ_URL_STUDENT || '',
    FAQ_URL_SUPERVISOR: process.env.FAQ_URL_SUPERVISOR || '',
  },
}

module.exports = nextConfig
