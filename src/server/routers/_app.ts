// import { ClientSecretCredential } from '@azure/identity'
import { ProposalStatus, ProposalType, UserRole } from 'src/lib/constants'
// import { Client } from '@microsoft/microsoft-graph-client'
// import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import {
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import axios from 'axios'
import 'cross-fetch/polyfill'
import { prisma } from 'src/server/prisma'
import {
  authedProcedure,
  optionalAuthedProcedure,
  publicProcedure,
  router,
} from 'src/server/trpc'
import { ProposalStatusFilter } from 'src/types/app'
import { z } from 'zod'

async function getStudentProposals({ ctx, filters }) {
  const proposals = await prisma.proposal.findMany({
    where: {
      typeKey: ProposalType.SUPERVISOR,
      statusKey: ProposalStatus.OPEN,
    },
    include: {
      attachments: true,
      topicArea: true,
      supervisedBy: {
        include: {
          supervisor: true,
        },
      },
    },
  })

  return proposals.map((p) => ({
    ...p,
    supervisedBy: p.supervisedBy?.[0]?.supervisor,
  }))
}

async function getSupervisorProposals({ ctx, filters }) {
  const proposals = await prisma.proposal.findMany({
    where: {
      typeKey: {
        in:
          ctx.user?.role === UserRole.SUPERVISOR ||
          ctx.user?.role === UserRole.ADMIN
            ? ['SUPERVISOR', 'STUDENT']
            : ['SUPERVISOR'],
      },
      statusKey:
        filters.status === ProposalStatusFilter.OPEN_PROPOSALS
          ? ProposalStatus.OPEN
          : undefined,
    },
    include: {
      attachments: true,
      topicArea: true,
      ownedByUser: true,
      supervisedBy: {
        include: {
          supervisor: true,
        },
      },
      applications:
        ctx.user?.role === UserRole.SUPERVISOR
          ? {
              include: {
                attachments: true,
                status: true,
              },
            }
          : undefined,
      receivedFeedbacks: ctx.user?.role
        ? [UserRole.SUPERVISOR, UserRole.ADMIN].includes(ctx.user.role) && {
            where:
              ctx.user.role === UserRole.SUPERVISOR && ctx.user.email
                ? {
                    user: {
                      email: ctx.user.email,
                    },
                  }
                : undefined,
          }
        : undefined,
    },
  })

  return proposals
    .map((p) => ({
      ...p,
      supervisedBy: p.supervisedBy?.[0]?.supervisor,
      ownedBy: p.ownedByUser,
      isSupervisedProposal:
        p.supervisedBy && p.supervisedBy[0]?.supervisor?.id === ctx.user?.sub,
      isOwnProposal: p.ownedByUser && p.ownedByUser.id === ctx.user?.sub,
      receivedFeedbacks: p.receivedFeedbacks,
    }))
    .filter((p) => {
      return (
        ctx.user?.role === UserRole.ADMIN ||
        p.statusKey === ProposalStatus.OPEN ||
        p.isOwnProposal ||
        p.isSupervisedProposal
      )
    })
}

export const appRouter = router({
  generateSasQueryToken: optionalAuthedProcedure.mutation(() => {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME!,
      process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY!
    )
    const permissions = BlobSASPermissions.parse('w')
    const startDate = new Date()
    const expiryDate = new Date(startDate)
    expiryDate.setMinutes(startDate.getMinutes() + 100)
    const queryParams = generateBlobSASQueryParameters(
      {
        containerName: process.env.NEXT_PUBLIC_CONTAINER_NAME!,
        permissions: permissions,
        expiresOn: expiryDate,
      },
      sharedKeyCredential
    )
    return {
      SAS_STRING: queryParams.toString(),
      CONTAINER_NAME: process.env.NEXT_PUBLIC_CONTAINER_NAME!,
      URL: process.env.NEXT_PUBLIC_AZURE_STORAGE_URL,
    }
  }),

  healthcheck: publicProcedure.query(() => 'OK'),

  proposals: optionalAuthedProcedure
    .input(
      z.object({
        filters: z.object({
          status: z.enum([
            ProposalStatusFilter.ALL_PROPOSALS,
            ProposalStatusFilter.OPEN_PROPOSALS,
          ]),
        }),
      })
    )
    .query(({ input, ctx }) => {
      if ([UserRole.ADMIN, UserRole.SUPERVISOR].includes(ctx.user?.role)) {
        return getSupervisorProposals({ ctx, filters: input.filters })
      }

      return getStudentProposals({ ctx, filters: input.filters })
    }),

  submitProposalFeedback: authedProcedure
    .input(
      z.object({
        proposalName: z.string(),
        comment: z.string(),
        proposalId: z.string(),
        supervisorEmail: z.string().email(),
        actionType: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await axios.post(
        process.env.PROPOSAL_FEEDBACK_URL as string,
        input
      )
    }),

  submitProposalApplication: publicProcedure
    .input(
      z.object({
        proposalTitle: z.string(),
        uzhemail: z.string().email(),
        matriculationNumber: z.string(),
        fullName: z.string(),
        startingDate: z.string(),
        motivation: z.string(),
        proposalId: z.string(),
        cvFile: z.any(),
        transcriptFile: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await axios.post(process.env.APPLICATION_URL as string, input)
    }),
})

export type AppRouter = typeof appRouter
