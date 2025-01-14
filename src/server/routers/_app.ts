// import { ClientSecretCredential } from '@azure/identity'
import { ProposalStatus, ProposalType, UserRole } from 'src/lib/constants'
// import { Client } from '@microsoft/microsoft-graph-client'
// import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import {
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import { TRPCError } from '@trpc/server'
import axios from 'axios'
import 'cross-fetch/polyfill'
import dayjs from 'dayjs'
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
          responsible: true,
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
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
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
        personResponsible: z.string().optional(),
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
        allowUsage: z.boolean(),
        allowPublication: z.boolean(),
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

  persistProposalSubmission: publicProcedure
    .meta({
      openapi: { method: 'POST', path: '/persistProposalSubmission' },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposal: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          language: z.string(),
          studyLevel: z.string(),
          topicAreaSlug: z.string(),
          additionalStudentComment: z.string().optional(),
        }),
        application: z.object({
          email: z.string(),
          matriculationNumber: z.string(),
          fullName: z.string(),
          plannedStartAt: z.string(),
          motivation: z.string(),
          allowUsage: z.boolean(),
          allowPublication: z.boolean(),
        }),
        attachments: z.object({
          proposalFile: z.object({
            href: z.string().url(),
            type: z.string(),
          }),
          cvFile: z.object({
            href: z.string().url(),
            type: z.string(),
          }),
          transcriptFile: z.object({
            href: z.string().url(),
            type: z.string(),
          }),
          other: z.array(
            z.object({
              name: z.string(),
              href: z.string().url(),
              type: z.string(),
            })
          ),
        }),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        await prisma.$transaction(
          [
            prisma.proposal.create({
              data: {
                id: input.proposal.id,
                title: input.proposal.title,
                description: input.proposal.description,
                language: input.proposal.language,
                studyLevel: input.proposal.studyLevel,
                topicAreaSlug: input.proposal.topicAreaSlug,
                additionalStudentComment:
                  input.proposal.additionalStudentComment,
                typeKey: 'STUDENT',
                statusKey: 'OPEN',
              },
            }),
            prisma.proposalApplication.create({
              data: {
                id: input.proposal.id,
                statusKey: 'OPEN',
                email: input.application.email,
                matriculationNumber: input.application.matriculationNumber,
                fullName: input.application.fullName,
                plannedStartAt: dayjs(
                  input.application.plannedStartAt
                ).toDate(),
                motivation: input.application.motivation,
                proposalId: input.proposal.id,
                allowUsage: input.application.allowUsage,
                allowPublication: input.application.allowPublication,
              },
            }),
            prisma.proposalAttachment.create({
              data: {
                name: 'Proposal',
                href: input.attachments.proposalFile.href,
                type: input.attachments.proposalFile.type,
                proposalId: input.proposal.id,
              },
            }),
            prisma.proposalAttachment.create({
              data: {
                name: 'CV',
                href: input.attachments.cvFile.href,
                type: input.attachments.cvFile.type,
                proposalId: input.proposal.id,
              },
            }),
            prisma.proposalAttachment.create({
              data: {
                name: 'Transcript',
                href: input.attachments.transcriptFile.href,
                type: input.attachments.transcriptFile.type,
                proposalId: input.proposal.id,
              },
            }),
            input.attachments.other?.length > 0
              ? [
                  prisma.proposalAttachment.createMany({
                    data: input.attachments.other.map((attachment) => ({
                      name: 'Attachment',
                      href: attachment.href,
                      type: attachment.type,
                      proposalId: input.proposal.id,
                    })),
                  }),
                ]
              : [],
          ].flat()
        )
      } catch (e) {
        console.error(e)
        return {
          success: false,
        }
      }

      return {
        success: true,
      }
    }),

  persistProposalFeedbackAccept: publicProcedure
    .meta({
      openapi: { method: 'POST', path: '/persistProposalFeedbackAccept' },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
        supervisorEmail: z.string().email(),
        responsibleId: z.string(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        await prisma.$transaction([
          prisma.proposal.update({
            where: { id: input.proposalId },
            data: {
              statusKey: 'MATCHED',
            },
          }),
          prisma.userProposalSupervision.upsert({
            where: { id: input.proposalId },
            create: {
              id: input.proposalId,
              proposalId: input.proposalId,
              supervisorEmail: input.supervisorEmail,
              responsibleId: input.responsibleId,
            },
            update: {
              supervisorEmail: input.supervisorEmail,
              responsibleId: input.responsibleId,
            },
          }),
          prisma.proposalApplication.update({
            where: { id: input.proposalId },
            data: {
              statusKey: 'ACCEPTED',
            },
          }),
          prisma.adminInfo.create({
            data: {
              proposalId: input.proposalId,
              status: 'OPEN',
            },
          }),
        ])
      } catch (e) {
        console.error(e)
        return {
          success: false,
        }
      }

      return {
        success: true,
      }
    }),

  persistProposalFeedbackAcceptTentative: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/persistProposalFeedbackAcceptTentative',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
        supervisorEmail: z.string().email(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        await prisma.$transaction([
          prisma.proposal.update({
            where: { id: input.proposalId },
            data: {
              statusKey: 'MATCHED_TENTATIVE',
            },
          }),
          prisma.userProposalSupervision.create({
            data: {
              id: input.proposalId,
              proposalId: input.proposalId,
              supervisorEmail: input.supervisorEmail,
            },
          }),
          prisma.proposalApplication.update({
            where: { id: input.proposalId },
            data: {
              statusKey: 'ACCEPTED_TENTATIVE',
            },
          }),
        ])
      } catch (e) {
        console.error(e)
        return {
          success: false,
        }
      }

      return {
        success: true,
      }
    }),

  persistProposalFeedbackDecline: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/persistProposalFeedbackDecline',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
        supervisorEmail: z.string().email(),
        reason: z.string(),
        comment: z.string(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        await prisma.$transaction([
          prisma.userProposalFeedback.create({
            data: {
              proposalId: input.proposalId,
              userEmail: input.supervisorEmail,
              reason: `DECLINED_${input.reason}`,
              typeKey: 'DECLINED',
              comment: input.comment,
            },
          }),
        ])
      } catch (e) {
        console.error(e)
        return {
          success: false,
        }
      }

      return {
        success: true,
      }
    }),

  persistProposalFeedbackReject: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/persistProposalFeedbackReject',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
        supervisorEmail: z.string().email(),
        reason: z.string(),
        comment: z.string(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        const proposal = await prisma.proposal.findUnique({
          where: { id: input.proposalId },
        })

        if (!proposal) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        await prisma.$transaction(
          [
            proposal.statusKey === 'MATCHED_TENTATIVE'
              ? [
                  prisma.userProposalSupervision.delete({
                    where: { id: input.proposalId },
                  }),
                  prisma.proposalApplication.update({
                    where: { id: input.proposalId },
                    data: {
                      statusKey: 'OPEN',
                    },
                  }),
                  prisma.proposal.update({
                    where: { id: input.proposalId },
                    data: {
                      statusKey: 'OPEN',
                    },
                  }),
                ]
              : [],
            prisma.userProposalFeedback.create({
              data: {
                proposalId: input.proposalId,
                userEmail: input.supervisorEmail,
                reason: `REJECTED_${input.reason}`,
                typeKey: 'REJECTED',
                comment: input.comment,
              },
            }),
          ].flat()
        )
      } catch (e) {
        console.error(e)
        return {
          success: false,
        }
      }

      return {
        success: true,
      }
    }),

    getEmailsForOpenStudentProposalsOlderThan8Weeks: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/getEmailsForOpenStudentProposalsOlderThan8Weeks',
      },
    })
    .input(z.object({})) // No input required
    .output(z.array(z.object({ id: z.string(), email: z.string() }))) // Expect an array of objects with id and email fields
    .query(async () => {
      // Calculate the date 8 weeks ago
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7); // 8 x 7 Days = 56 days
  
      try {
        // Fetch data from Prisma
        const result = await prisma.proposalApplication.findMany({
          where: {
            proposal: {
              statusKey: 'OPEN',
              createdAt: {
                lt: eightWeeksAgo, // Proposals created more than 8 weeks ago
              },
              ownedByUserEmail: null, // Proposal must not be owned by a user (Student Proposal | otherwise it is a Supervisor Proposal)
            },
          },
          select: {
            id: true,
            email: true,
          },
        });
        // Return the result directly as it already matches the required structure
        return result;
      } catch (error) {
        console.error("Error fetching proposals:", error);
        throw new Error("Failed to fetch proposals");
      }
    }),
  

})

export type AppRouter = typeof appRouter
