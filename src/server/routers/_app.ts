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
  let where = {}
  let applications = undefined
  let receivedFeedbacks = undefined

  if (ctx.user?.role === UserRole.SUPERVISOR) {
    where = {
      ...where,
      typeKey: {
        in: ['SUPERVISOR', 'STUDENT'],
      },
    }
    applications = {
      where: {
        proposal: {
          OR: [
            {
              typeKey: {
                in: ['STUDENT'],
              },
            },
            {
              ownedByUserEmail: ctx.user?.email,
            },
            {
              supervisedBy: {
                some: {
                  supervisorEmail: ctx.user?.email,
                },
              },
            },
          ],
        },
      },
      include: {
        attachments: true,
        status: true,
      },
    }
    receivedFeedbacks = {
      where: {
        user: {
          email: ctx.user.email,
        },
      },
    }
  } else if (ctx.user?.role === UserRole.DEVELOPER) {
    where = {
      ...where,
      typeKey: {
        in: ['SUPERVISOR', 'STUDENT'],
      },
    }
    applications = {
      include: {
        attachments: true,
        status: true,
      },
    }
    receivedFeedbacks = {}
  } else {
    where = {
      ...where,
      typeKey: {
        in: ['SUPERVISOR'],
      },
    }
  }

  if (filters.status === ProposalStatusFilter.ALL_PROPOSALS) {
    where = {
      ...where,
      OR: [
        {
          statusKey: ProposalStatus.OPEN,
          typeKey: {
            in: ['STUDENT', 'SUPERVISOR'],
          },
        },
        { ownedByUserEmail: ctx.user?.email },
        {
          supervisedBy: {
            some: {
              supervisorEmail: ctx.user?.email,
            },
          },
        },
        {
          receivedFeedbacks: {
            some: {
              userEmail: ctx.user?.email,
            },
          },
        },
      ],
    }
  }

  if (filters.status === ProposalStatusFilter.OPEN_PROPOSALS) {
    where = {
      ...where,
      statusKey: ProposalStatus.OPEN,
      NOT: {
        receivedFeedbacks: {
          some: {
            userEmail: ctx.user?.email,
          },
        },
      },
    }
  }

  if (filters.status === ProposalStatusFilter.MY_PROPOSALS) {
    where = {
      ...where,
      OR: [
        { ownedByUserEmail: ctx.user?.email },
        {
          supervisedBy: {
            some: {
              supervisorEmail: ctx.user?.email,
            },
          },
        },
      ],
    }
  }

  if (filters.status === ProposalStatusFilter.REJECTED_AND_DECLINED_PROPOSALS) {
    where = {
      ...where,
      OR: [
        {
          receivedFeedbacks: {
            some: {
              userEmail: ctx.user?.email,
              typeKey: { startsWith: 'REJECTED' },
            },
          },
        },
        {
          receivedFeedbacks: {
            some: {
              userEmail: ctx.user?.email,
              typeKey: { startsWith: 'DECLINED' },
            },
          },
        },
      ],
    }
  }

  const proposals = await prisma.proposal.findMany({
    where,
    include: {
      attachments: true,
      topicArea: true,
      ownedByUser: true,
      supervisedBy: {
        include: {
          supervisor: true,
        },
      },
      applications,
      receivedFeedbacks,
    },
  })

  return proposals
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

  getAllPersonsResponsible: optionalAuthedProcedure.query(() => {
    return prisma.responsible.findMany({
      select:{
        name: true,
      }
    })
  }),

  proposals: optionalAuthedProcedure
    .input(
      z.object({
        filters: z.object({
          status: z.enum([
            ProposalStatusFilter.ALL_PROPOSALS,
            ProposalStatusFilter.OPEN_PROPOSALS,
            ProposalStatusFilter.MY_PROPOSALS,
            ProposalStatusFilter.REJECTED_AND_DECLINED_PROPOSALS,
          ]),
        }),
      })
    )
    .query(({ input, ctx }) => {
      if (
        ctx.user?.role &&
        [UserRole.SUPERVISOR, UserRole.DEVELOPER].includes(ctx.user.role)
      ) {
        return getSupervisorProposals({ ctx, filters: input.filters })
      }

      return getStudentProposals({ ctx, filters: input.filters })
    }),

  submitProposalFeedback: authedProcedure
    .input(
      z.object({
        proposalName: z.string(),
        personResponsible: z.string(),
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
        input,
        {
          headers: {
            'Content-Type': 'application/json',
            secretkey: process.env.FLOW_SECRET as string,
          },
        }
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
      const res = await axios.post(
        process.env.APPLICATION_URL as string,
        input,
        {
          headers: {
            'Content-Type': 'application/json',
            secretkey: process.env.FLOW_SECRET as string,
          },
        }
      )
    }),

  acceptProposalApplication: publicProcedure
    .input(
      z.object({
        proposalId: z.string(),
        proposalApplicationId: z.string(),
        applicantEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await axios.post(
        process.env.APPLICATION_ACCEPTANCE_URL as string,
        input,
        {
          headers: {
            'Content-Type': 'application/json',
            secretkey: process.env.FLOW_SECRET as string,
          },
        }
      )
      return res.data
    }),
})

export type AppRouter = typeof appRouter
