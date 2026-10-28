import type { Department } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash, timingSafeEqual } from 'node:crypto'
import { getAppBaseUrl } from 'src/lib/appUrl'
import {
  createPrismaStudentReminderStore,
  runStudentProposalReminders,
} from 'src/lib/studentReminder'
import prisma from 'src/server/prisma'

function hasValidSecret(header: string | undefined, secret: string) {
  // Hashing gives both sides the same length for timingSafeEqual.
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(header ?? ''), digest(`Bearer ${secret}`))
}

/**
 * Sends the daily student proposal reminders. Called by the
 * student-reminder CronJob in deploy/chart_new with
 * `Authorization: Bearer $FLOW_SECRET`. Responds 500 when any reminder
 * failed, so the Job run is marked as failed.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const secret = process.env.FLOW_SECRET?.trim()
  if (!secret) {
    return res.status(503).json({ message: 'FLOW_SECRET is not configured' })
  }
  if (!hasValidSecret(req.headers.authorization, secret)) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const department = process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department

  try {
    const result = await runStudentProposalReminders({
      store: createPrismaStudentReminderStore(prisma, department),
      appUrl: getAppBaseUrl(),
    })
    console.info('Student proposal reminders finished', result)
    return res
      .status(result.failedProposalIds.length > 0 ? 500 : 200)
      .json(result)
  } catch (error) {
    console.error('Student proposal reminders failed', error)
    return res
      .status(500)
      .json({ message: 'Student proposal reminders failed' })
  }
}
