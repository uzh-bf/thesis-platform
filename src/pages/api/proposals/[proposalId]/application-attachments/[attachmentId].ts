import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'src/lib/authOptions'
import { Department, ProposalType, UserRole } from 'src/lib/constants'
import prisma from 'src/server/prisma'

function sendJsonError(
  res: NextApiResponse,
  statusCode: number,
  message: string
) {
  res.status(statusCode).json({ message })
}

function isAuthorized({
  role,
  email,
  ownedByUserEmail,
  supervisorEmails,
}: {
  role?: string
  email?: string | null
  ownedByUserEmail?: string | null
  supervisorEmails: (string | null)[]
}) {
  if (role === UserRole.DEVELOPER) return true
  if (role !== UserRole.SUPERVISOR || !email) return false

  const normalizedEmail = email.toLowerCase()

  return (
    ownedByUserEmail?.toLowerCase() === normalizedEmail ||
    supervisorEmails.some(
      (supervisorEmail) =>
        supervisorEmail?.toLowerCase() === normalizedEmail
    )
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    sendJsonError(res, 405, 'Method not allowed')
    return
  }

  const proposalId = req.query.proposalId
  const attachmentId = req.query.attachmentId

  if (typeof proposalId !== 'string' || typeof attachmentId !== 'string') {
    sendJsonError(res, 400, 'Proposal ID and attachment ID are required')
    return
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.sub) {
    sendJsonError(res, 401, 'Authentication required')
    return
  }

  const attachment = await prisma.applicationAttachment.findFirst({
    where: {
      id: attachmentId,
      proposalApplication: {
        proposalId,
        proposal: {
          typeKey: ProposalType.SUPERVISOR,
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
        },
      },
    },
    include: {
      proposalApplication: {
        include: {
          proposal: {
            include: {
              supervisedBy: {
                select: { supervisorEmail: true },
              },
            },
          },
        },
      },
    },
  })

  if (!attachment) {
    sendJsonError(res, 404, 'Application attachment not found')
    return
  }

  const proposal = attachment.proposalApplication.proposal

  if (
    !isAuthorized({
      role: session.user.role,
      email: session.user.email,
      ownedByUserEmail: proposal.ownedByUserEmail,
      supervisorEmails: proposal.supervisedBy.map(
        (supervision) => supervision.supervisorEmail
      ),
    })
  ) {
    sendJsonError(res, 403, 'Not allowed to view this attachment')
    return
  }

  try {
    res.setHeader('Cache-Control', 'private, no-store')
    res.redirect(307, attachment.href)
  } catch (error) {
    console.error('Failed to create application attachment URL', error)
    sendJsonError(res, 500, 'Application attachment could not be opened')
  }
}
