import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from 'src/server/prisma'

/**
 * Health check endpoint for uptime monitoring (e.g. Better Stack). Returns
 * 200 when the app is up and can reach the database, 503 otherwise, so
 * monitors can alert on both app and database outages.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res
      .status(405)
      .json({ status: 'error', message: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  try {
    await prisma.$queryRaw`SELECT 1`
    return res.status(200).json({
      status: 'ok',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    })
  } catch {
    return res
      .status(503)
      .json({ status: 'error', message: 'Database unreachable' })
  }
}
