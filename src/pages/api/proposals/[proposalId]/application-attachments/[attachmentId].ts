import {
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
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

function getSignedTestAttachmentUrl(href: string) {
  const accountName = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY
  const containerName = process.env.NEXT_PUBLIC_CONTAINER_NAME
  const storageUrl =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_URL ??
    (accountName
      ? `https://${accountName}.blob.core.windows.net`
      : undefined)

  if (!storageUrl || !accountName || !accountKey || !containerName) {
    throw new Error('Azure Storage configuration is incomplete')
  }

  const configuredStorageUrl = new URL(storageUrl)
  const canonicalPrefix = `${configuredStorageUrl.origin}/${containerName}/`
  const legacyPrefix = `undefined/${containerName}/`
  let blobName: string

  if (href.startsWith(canonicalPrefix)) {
    blobName = decodeURIComponent(href.slice(canonicalPrefix.length))
  } else if (href.startsWith(legacyPrefix)) {
    // Test applications created before the storage URL fallback was added
    // persisted this prefix because NEXT_PUBLIC_AZURE_STORAGE_URL was unset.
    blobName = decodeURIComponent(href.slice(legacyPrefix.length))
  } else {
    throw new Error('Test attachment URL does not match configured storage')
  }

  const expiresOn = new Date(Date.now() + 10 * 60 * 1000)
  const credential = new StorageSharedKeyCredential(accountName, accountKey)
  const sas = generateBlobSASQueryParameters(
    {
      blobName,
      containerName,
      expiresOn,
      permissions: BlobSASPermissions.parse('r'),
    },
    credential
  )

  const attachmentUrl = new URL(
    `${containerName}/${blobName
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    `${configuredStorageUrl.origin}/`
  )
  attachmentUrl.search = sas.toString()

  return attachmentUrl.toString()
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

  if (proposal.isTestData && session.user.role !== UserRole.DEVELOPER) {
    sendJsonError(res, 404, 'Application attachment not found')
    return
  }

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
    const targetUrl = proposal.isTestData
      ? getSignedTestAttachmentUrl(attachment.href)
      : attachment.href

    res.setHeader('Cache-Control', 'private, no-store')
    res.redirect(307, targetUrl)
  } catch (error) {
    console.error('Failed to create application attachment URL', error)
    sendJsonError(res, 500, 'Application attachment could not be opened')
  }
}
