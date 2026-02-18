// import { ClientSecretCredential } from '@azure/identity'
import { ProposalStatus, ApplicationStatus, ProposalType, UserRole, Department } from 'src/lib/constants'
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
  adminOnlyProcedure,
  adminProcedure,
  authedProcedure,
  optionalAuthedProcedure,
  publicProcedure,
  router,
} from 'src/server/trpc'
import { ProposalStatusFilter } from 'src/types/app'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

async function getStudentProposals({ ctx, filters }) {
  const proposals = await prisma.proposal.findMany({
    where: {
      typeKey: ProposalType.SUPERVISOR,
      statusKey: ProposalStatus.OPEN,
      department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
      department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
      department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
      department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
    }
  }

  if (filters.status === ProposalStatusFilter.ALL_PROPOSALS) {
    where = {
      ...where,
      OR: [
        {
          statusKey: {
            in: [ProposalStatus.OPEN, ProposalStatus.WAITING_FOR_STUDENT],
          },
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
      statusKey: {
        in: [ProposalStatus.OPEN, ProposalStatus.WAITING_FOR_STUDENT],
      },
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

  if (filters.status === ProposalStatusFilter.ACTIVE_PROPOSALS) {
    const sixMonthsAgo = dayjs().subtract(6, 'month').toDate();
    
    where = {
      ...where,
      OR: [
        { 
          statusKey: ProposalStatus.MATCHED,
          updatedAt: {
            gte: sixMonthsAgo
          },
          supervisedBy: {
            some: {
              supervisorEmail: ctx.user?.email
            }
          }
        },
        {
          supervisedBy: {
            some: {
              supervisorEmail: ctx.user?.email,
              createdAt: {
                gte: sixMonthsAgo
              }
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

  healthcheck: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/healthcheck',
      },
    })
    .input(z.void())
    .output(z.string())
    .query(() => 'OK'),

  getAllPersonsResponsible: optionalAuthedProcedure.query(() => {
    return prisma.responsible.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      where: {
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      orderBy: {
        email: 'asc',
      },
    })
  }),

  getAllSupervisors: optionalAuthedProcedure.query(() => {
    return prisma.user.findMany({
      select: {
        name: true,
        email: true,
      },
      where: {
        role: UserRole.SUPERVISOR,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      orderBy: {
        email: 'asc',
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
            ProposalStatusFilter.ACTIVE_PROPOSALS,
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
      try {
        console.log('Submitting application to Power Automate...')
        console.log('APPLICATION_URL:', process.env.APPLICATION_URL)
        console.log('Payload:', JSON.stringify({ ...input, cvFile: '[file]', transcriptFile: '[file]' }, null, 2))
        
        const res = await axios.post(
          process.env.APPLICATION_URL as string,
          input,
          {
            headers: {
              'Content-Type': 'application/json',
              secretkey: process.env.FLOW_SECRET as string,
            },
            timeout: 10000,
          }
        )
        
        console.log('Power Automate response:', res.status, res.statusText)
        return { success: true, data: res.data }
      } catch (error: any) {
        console.error('Error submitting application to Power Automate:')
        console.error('Error message:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to submit application: ${error.message}`,
        })
      }
    }),

  submitProposalPublish: publicProcedure
    .input(
      z.object({
        responder: z.string().email(),
        proposalTitle: z.string(),
        proposalSummary: z.string(),
        fieldOfResearch: z.string(),
        supervisor: z.string().email(),
        personResponsibleEmail: z.string().email(),
        bachelorOrMasterLevel: z.string(),
        proposalLanguage: z.string(),
        timeFrame: z.string(),
        researchProposalPDF: z.string().nullable(),
        furtherAttachments: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const submitDate = new Date().toISOString()

      const payload = {
        responder: input.responder,
        submitDate: submitDate,
        proposalSummary: input.proposalSummary,
        fieldOfResearch: input.fieldOfResearch,
        supervisor: input.supervisor,
        researchProposalPDF: input.researchProposalPDF || '',
        proposalTitle: input.proposalTitle,
        bachelorOrMasterLevel: input.bachelorOrMasterLevel,
        proposalLanguage: input.proposalLanguage,
        timeFrame: input.timeFrame,
        furtherAttachments: input.furtherAttachments || '',
        personResponsibleEmail: input.personResponsibleEmail,
      }

      if (!process.env.PROPOSAL_PUBLISH_URL) {
        return {
          success: true,
          message: 'Development mode: PROPOSAL_PUBLISH_URL not configured',
          data: payload
        }
      }

      try {
        console.log('Submitting proposal to Power Automate flow...')
        console.log('URL:', process.env.PROPOSAL_PUBLISH_URL)
        console.log('Payload:', JSON.stringify(payload, null, 2))
        
        const res = await axios.post(
          process.env.PROPOSAL_PUBLISH_URL,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              secretkey: process.env.FLOW_SECRET as string,
            },
          }
        )
        
        console.log('Successfully submitted proposal')
        return res.data
      } catch (error: any) {
        console.error('Error submitting proposal:', error)
        
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
          
          if (error.response.status === 401) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Authentication failed with Power Automate flow. Check FLOW_SECRET environment variable.',
            })
          }
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to submit proposal: ${error.message || 'Unknown error'}`,
        })
      }
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

  declineProposalApplication: authedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        proposalApplicationId: z.string(),
        applicantEmail: z.email(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Check if the user is authorized to decline this application
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          supervisedBy: {
            include: {
              supervisor: true,
              responsible: true
            }
          },
        },
      })

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        })
      }

      // Verify the user is either a supervisor or a responsible person for this proposal
      const isAuthorized = proposal.supervisedBy.some(
        supervision => 
          supervision.supervisorEmail === ctx.user.email || 
          supervision.responsible?.email === ctx.user.email
      )

      if (!isAuthorized) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to decline applications for this proposal',
        })
      }

      // Update the application status
      await prisma.proposalApplication.update({
        where: {
          id: input.proposalApplicationId,
          proposalId: input.proposalId,
          email: input.applicantEmail,
        },
        data: {
          statusKey: 'DECLINED',
        },
      })
      
      // Send the email notification
      try {
        await axios.post(
          process.env.EMAIL_NOTIFICATION_URL as string,
          {
            recipients: [input.applicantEmail],
            subject: `${process.env.NEXT_PUBLIC_DEPARTMENT_LONG_NAME} - Application Declined`,
          content: `Your application for the proposal "${proposal.title}" has been declined.`,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            secretkey: process.env.FLOW_SECRET as string,
          },
          timeout: 8000,
        }
      )
      return { success: true }
    } catch (error) {
      console.error('Error sending email notification:', error)
      return { success: false }
    }
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
                department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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
        personResponsibleName: z.string(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const responsible = await prisma.responsible.findFirst({
        where: { name: input.personResponsibleName },
      })

      if (!responsible) {
        throw new TRPCError({ code: 'NOT_FOUND' })
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
              responsibleId: responsible.id,
            },
            update: {
              supervisorEmail: input.supervisorEmail,
              responsibleId: responsible.id,
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
              department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
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

    getOpenStudentProposalsOlderThan8Weeks: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/getOpenStudentProposalsOlderThan8Weeks',
      },
    })
    .input(z.object({ flowSecret: z.string() })) // No input required
    .output(z.array(z.object({ id: z.string(), email: z.string(), proposalTitle: z.string() }))) // Expect an array of objects with id, email, and proposalTitle
    .query(async ({ input }) => {
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }
      // Calculate the date 8 weeks ago
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7); // 8 x 7 Days = 56 days
  
      try {
        // Fetch data from Prisma
        const result = await prisma.proposalApplication.findMany({
          where: {
            proposal: {
              statusKey: 'OPEN',
              updatedAt: {
                lt: eightWeeksAgo, // Proposals created more than 8 weeks ago
              },
              ownedByUserEmail: null, // Proposal must not be owned by a user (Student Proposal | otherwise it is a Supervisor Proposal)
              department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
            },
          },
          select: {
            id: true,
            email: true,
            proposal: {
              select: {
                title: true,
              },
            },
          },
        });

        // Map the result to restructure it
        const transformedResult = result.map((application) => ({
          id: application.id,
          email: application.email,
          proposalTitle: application.proposal.title, // Extract title from the nested proposal object
        }));

        return transformedResult;
      } catch (error) {
        console.error("Error fetching proposals:", error);
        throw new Error("Failed to fetch proposals");
      }
    }),

    updateProposalUpdatedAt: publicProcedure
  .meta({
    openapi: {
      method: 'GET', // GET request to handle URL parameter
      path: '/updateProposalUpdatedAt/{id}', // Accept id in the URL
    },
  })
  .input(z.object({
    id: z.string(), // Extract id from the URL
  }))
  .output(z.object({
    response: z.string(),
  }))
  .query(async ({ input }) => {
    try {
      // Update the `updatedAt` field for the proposal with the provided `id`
      const proposal = await prisma.proposal.updateMany({
        where: {
          id: input.id, // Use the `id` from the URL path parameter
          statusKey: 'WAITING_FOR_STUDENT', // Only update if the status is 'WAITING_FOR_STUDENT'
        },
        data: {
          statusKey: "OPEN",
          updatedAt: new Date(), // Set `updatedAt` to the current date/time
        },
      });

      if (proposal.count === 0) {
        return {
          response: "No Proposal was updated.",
        };
      }

      return {
        response: `Your Proposal was updated successfully! ✌️😊`,
      };
    } catch (error) {
      console.error("Error updating proposal:", error);
      throw new Error("Failed to update proposal");
    }
  }),

updateProposalStatus: publicProcedure
  .meta({
    openapi: {
      method: 'POST', // GET request to handle URL parameter
      path: '/updateProposalStatus/{id}', // Accept id in the URL
    },
  })
  .input(z.object({
    flowSecret: z.string(),
    id: z.string(), // Extract id from the URL
  }))
  .output(z.object({
    response: z.string(),
  }))
  .query(async ({ input }) => {
    if (input.flowSecret !== process.env.FLOW_SECRET) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    try {
      // Update the `statusKey` and `updatedAt` fields for the proposal with the provided `id`
      await prisma.proposal.update({
        where: { id: input.id }, // Use the `id` from the URL path parameter
        data: {
          statusKey: "WAITING_FOR_STUDENT", // Update the statusKey
        },
      });
      return {
        response: `The Proposal with the id: '${input.id}' was updated successfully! ✌️😊`,
      };
    } catch (error) {
      console.error("Error updating proposal:", error);
      throw new Error("Failed to update proposal");
    }
  }),

  updateWaitingForStudentProposalsOlderThan1Week: publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/updateWaitingForStudentProposalsOlderThan1Week',
    },
  })
  .input(z.object({ flowSecret: z.string() })) // flowSecret as input
  .output(z.object({ withdrawn_proposal_ids: z.array(z.string()) })) // Return updated proposal IDs
  .query(async ({ input }) => {

    // Calculate the date 9 weeks ago
    const oneWeeksAgo = new Date();
    oneWeeksAgo.setDate(oneWeeksAgo.getDate() - 7); // 7 Days
    if (input.flowSecret !== process.env.FLOW_SECRET) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    try {
      // Find proposals to update
      const proposalsToUpdate = await prisma.proposal.findMany({
        where: {
          statusKey: 'WAITING_FOR_STUDENT',
          updatedAt: {
            lt: oneWeeksAgo,
          },
          ownedByUserEmail: null,
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
        },
        select: {
          id: true,
        },
      });

      const updatedIds = proposalsToUpdate.map(proposal => proposal.id);

      // Update the statusKey to "WITHDRAWN"
      await prisma.proposal.updateMany({
        where: {
          id: { in: updatedIds },
        },
        data: {
          statusKey: 'WITHDRAWN',
        },
      });

      return {
        withdrawn_proposal_ids: updatedIds, // Return the IDs of updated proposals
      };
    } catch (error) {
      console.error("Error updating proposals:", error);
      throw new Error("Failed to update proposals");
    }
  }),

  processProposalAcceptance: publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/processProposalAcceptance',
    },
  })
  .input(
    z.object({
      flowSecret: z.string(),
      proposalId: z.string(),
      proposalApplicationId: z.string(),
      applicantEmail: z.string(),
    })
  )
  .output(
    z.object({
      proposal: z.object({ proposal_title: z.string(), supervisor_email: z.string() }),
      accepted_user: z.object({ accepted_email: z.string(), accepted_fullName: z.string() }),
      declined_users: z.array(z.object({ declined_email: z.string(), declined_fullName: z.string() })),
    })
  )
  .mutation(async ({ input }) => {
    if (input.flowSecret !== process.env.FLOW_SECRET) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    // Step 1: Get Proposal Info
    const proposal = await prisma.proposal.findUnique({
      where: { id: input.proposalId },
      include: {
        supervisedBy: {
          include: {
            supervisor: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Proposal not found',
      });
    }

    // Step 2: Update Proposal Matched
    await prisma.proposal.update({
      where: { id: input.proposalId },
      data: {
        statusKey: ProposalStatus.MATCHED,
        updatedAt: new Date(),
      },
    });

    // Step 3: Get User Proposal Supervision Info
    const supervisionInfo = proposal.supervisedBy[0];
    if (!supervisionInfo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Supervision information not found',
      });
    }

    // Step 4: Update User Proposal Supervision Student Email
    await prisma.userProposalSupervision.update({
      where: { id: supervisionInfo.id },
      data: {
        studentEmail: input.applicantEmail,
        updatedAt: new Date(),
      },
    });

    // Step 5: Get Proposal Application Info
    const application = await prisma.proposalApplication.findFirst({
      where: {
        id: input.proposalApplicationId,
        email: input.applicantEmail,
      },
    });

    if (!application) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Application not found',
      });
    }

    // Step 6: Update Proposal Application Accepted
    await prisma.proposalApplication.update({
      where: { id: application.id },
      data: {
        statusKey: ApplicationStatus.ACCEPTED,
        updatedAt: new Date(),
      },
    });

    // Step 7: Create Admin Table Entry
    await prisma.adminInfo.create({
      data: {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        proposalId: input.proposalId,
        status: ProposalStatus.OPEN,
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
    });

    // Step 8: Get Proposal Applications to Decline
    const applicationsToDecline = await prisma.proposalApplication.findMany({
      where: {
        proposalId: input.proposalId,
        email: { not: input.applicantEmail },
      },
    });

    // Update status of other applications to declined
    if (applicationsToDecline.length > 0) {
      await prisma.proposalApplication.updateMany({
        where: {
          id: { in: applicationsToDecline.map(app => app.id) },
        },
        data: {
          statusKey: ApplicationStatus.DECLINED,
          updatedAt: new Date(),
          supervisionId: null,
        },
      });
    }

    // return all user information of proposals that have been declined as well as the one that has been accepted with the info from above (no new prisma call needed)
    return { proposal: { proposal_title: proposal?.title, supervisor_email: supervisionInfo?.supervisorEmail }, accepted_user: {accepted_email: application?.email, accepted_fullName: application?.fullName }, declined_users: applicationsToDecline.map(app => ({declined_email: app.email, declined_fullName: app.fullName })) }
  }),

  createProposalApplication: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/createProposalApplication',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalApplication: z.object({
          email: z.string(),
          matriculationNumber: z.string(),
          fullName: z.string(),
          plannedStartAt: z.string(),
          motivation: z.string(),
          proposalId: z.string(),
          allowPublication: z.boolean(),
          allowUsage: z.boolean(),
        }),
        applicationAttachment: z.object({
          href_cv: z.string(),
          href_transcript: z.string(),
        }),
      })
    )
    .output(
      z.object({
        proposal: z.object({ title: z.string(), ownedByUserEmail: z.string() }),
        supervisor: z.object({ email: z.string() }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Step 1: Check if flowSecret is correct
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get proposal and supervision details first
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalApplication.proposalId },
        include: {
          supervisedBy: {
            include: {
              supervisor: true,
              responsible: true,
            },
          },
        },
      });

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      // Create the application with attachments in a transaction
      await prisma.$transaction(async (tx) => {
        // Create the main application
        const application = await tx.proposalApplication.create({
          data: {
            statusKey: "OPEN",
            email: input.proposalApplication.email,
            matriculationNumber: input.proposalApplication.matriculationNumber,
            fullName: input.proposalApplication.fullName,
            plannedStartAt: new Date(input.proposalApplication.plannedStartAt),
            motivation: input.proposalApplication.motivation,
            proposalId: input.proposalApplication.proposalId,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowPublication: input.proposalApplication.allowPublication,
            allowUsage: input.proposalApplication.allowUsage,
          },
        });

        // Create CV attachment
        await tx.applicationAttachment.create({
          data: {
            name: 'CV',
            href: input.applicationAttachment.href_cv,
            type: 'application/pdf',
            proposalApplicationId: application.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create transcript attachment
        await tx.applicationAttachment.create({
          data: {
            name: 'Transcript',
            href: input.applicationAttachment.href_transcript,
            type: 'application/pdf',
            proposalApplicationId: application.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      });

      return {
        proposal: {
          title: proposal?.title,
          ownedByUserEmail: proposal?.ownedByUserEmail,
        },
        supervisor: {
          email: proposal?.supervisedBy?.[0]?.supervisorEmail,
        },
      };
    }),

    getProposalAndProposalApplication: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/getProposalAndProposalApplication',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
      })
    )
    .output(
      z.object({
        proposal: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          language: z.string(),
          studyLevel: z.string(),
          timeFrame: z.string().nullable(),
          additionalStudentComment: z.string().nullable(),
          topicAreaSlug: z.string(),
          typeKey: z.string(),
          statusKey: z.string(),
          ownedByUserEmail: z.string().nullable(),
          ownedByStudent: z.string().nullable(),
          createdAt: z.date(),
          updatedAt: z.date()
        }),
        proposalApplication: z.object({
          id: z.string(),
          statusKey: z.string(),
          email: z.string(),
          matriculationNumber: z.string(),
          fullName: z.string(),
          plannedStartAt: z.date(),
          motivation: z.string(),
          supervisionId: z.string().nullable(),
          allowPublication: z.boolean().nullable(),
          allowUsage: z.boolean().nullable(),
          createdAt: z.date(),
          updatedAt: z.date()
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate flow secret
      const expectedSecret = process.env.FLOW_SECRET
      if (!expectedSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow secret not configured',
        })
      }
      
      if (input.flowSecret !== expectedSecret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid flow secret',
        })
      }

      const proposal = await prisma.proposal.findUnique({
        where: {
          id: input.proposalId,
        },
      })

      if (!proposal) {
        throw new Error('Proposal not found')
      }

      const proposalApplication = await prisma.proposalApplication.findFirst({
        where: {
          proposalId: input.proposalId,
        },
      })

      if (!proposalApplication) {
        throw new Error('Proposal application not found')
      }

      return {
        proposal,
        proposalApplication,
      }
    }),

    getAcceptedSupervisor: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/getAcceptedSupervisor',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
      })
    )
    .output(
      z.object({
        supervisor: z.object({
          email: z.string(),
        })
      })
    )
    .mutation(async ({ input }) => {
      // Validate flow secret
      const expectedSecret = process.env.FLOW_SECRET
      if (!expectedSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow secret not configured',
        })
      }
      
      if (input.flowSecret !== expectedSecret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid flow secret',
        })
      }

      const supervision = await prisma.userProposalSupervision.findUnique({
        where: {
          proposalId: input.proposalId,
        },
        select: {
          supervisorEmail: true
        }
      })

      if (!supervision) {
        return { supervisor: null }
      }

      return {
        supervisor: {
          email: supervision.supervisorEmail
        }
      }
    }),

    getProvidedFeedbackEntries: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/getProvidedFeedbackEntries',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        proposalId: z.string(),
        supervisorEmail: z.string().email(),
      })
    )
    .output(
      z.object({
        userEmail: z.string().email()
      })
    )
    .mutation(async ({ input }) => {
      // Validate flow secret
      const expectedSecret = process.env.FLOW_SECRET
      if (!expectedSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow secret not configured',
        })
      }
      
      if (input.flowSecret !== expectedSecret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid flow secret',
        })
      }

      const feedbackEntries = await prisma.userProposalFeedback.findFirst({
        where: {
          proposalId: input.proposalId,
          userEmail: input.supervisorEmail
        },
        select: {
          userEmail: true
        }
      })
      if (!feedbackEntries) {
        return null
      }
      return {
        userEmail: feedbackEntries.userEmail
      }
    }),

    checkUserExists: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/checkUserExists',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        email: z.string().email(),
      })
    )
    .output(
      z.object({
        exists: z.boolean()
      })
    )
    .mutation(async ({ input }) => {
      // Validate flow secret
      const expectedSecret = process.env.FLOW_SECRET
      if (!expectedSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow secret not configured',
        })
      }
      
      if (input.flowSecret !== expectedSecret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid flow secret',
        })
      }

      const user = await prisma.user.findUnique({
        where: {
          email: input.email,
          department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
        }
      })
      if (!user) {
        return {
          exists: false
        }
      }
      return {
        exists: true
      }
    }),

    addNewUser: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/addNewUser',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        name: z.string(),
        email: z.string().email(),
      })
    )
    .output(
      z.object({
        success: z.boolean()
        })
    )
    .mutation(async ({ input }) => {
      // Validate flow secret
      const expectedSecret = process.env.FLOW_SECRET
      if (!expectedSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow secret not configured',
        })
      }
      
      if (input.flowSecret !== expectedSecret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid flow secret',
        })
      }

      try {
        const user = await prisma.user.create({
          data: {
            id: uuidv4(),
            name: input.name,
            email: input.email,
            role: "SUPERVISOR",
            department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        return {
          success: true,
        }
      } catch (error) {
        console.error('Error creating user:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        })
      }
    }),
    
    addAttachment: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/addAttachment',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        name: z.string(),
        href: z.string(),
        type: z.string(),
        proposalId: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean()
      })
    )
    .mutation(async ({ input }) => {
      // Validate flow secret
      const expectedSecret = process.env.FLOW_SECRET
      if (!expectedSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow secret not configured',
        })
      }
      
      if (input.flowSecret !== expectedSecret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid flow secret',
        })
      }

      try {
        await prisma.proposalAttachment.create({
          data: {
            id: uuidv4(),
            name: input.name,
            href: input.href,
            type: input.type,
            proposalId: input.proposalId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })

        return {
          success: true
        }
      } catch (error) {
        console.error('Error creating attachment:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create attachment',
        })
      }
    }),
    
    addProposal: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/addProposal',
      },
    })
      .input(
        z.object({
          flowSecret: z.string(),
          id: z.string().uuid(),
          title: z.string(),
          description: z.string(),
          language: z.string(),
          studyLevel: z.string(),
          topicAreaSlug: z.string(),
          timeFrame: z.string(),
          ownedByUserEmail: z.string().email(),
        })
      )
      .output(z.object({
        success: z.boolean()
      }))
      .mutation(async ({ input }) => {
        // Validate flow secret
        const expectedSecret = process.env.FLOW_SECRET
        if (!expectedSecret) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Flow secret not configured',
          })
        }
        
        if (input.flowSecret !== expectedSecret) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid flow secret',
          })
        }
        try {
          await prisma.proposal.create({
            data: {
              id: input.id,
              title: input.title,
              description: input.description,
              language: input.language,
              studyLevel: input.studyLevel,
              topicAreaSlug: input.topicAreaSlug,
              typeKey: ProposalType.SUPERVISOR,
              statusKey: ProposalStatus.OPEN,
              timeFrame: input.timeFrame,
              ownedByUserEmail: input.ownedByUserEmail,
              department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })

          return { success: true }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create proposal',
          })
        }
      }),
    
    getResponsibleIdAndAddProposalSupervision: publicProcedure
      .meta({
        openapi: {
          method: 'POST',
          path: '/getResponsibleIdAndAddProposalSupervision',
        },
      })
      .input(
        z.object({
          flowSecret: z.string(),
          proposalId: z.string().uuid(),
          supervisorEmail: z.string().email(),
          studyLevel: z.string(),
          responsibleEmail: z.string(),
        })
      )
      .output(z.object({
        success: z.boolean()
      }))
      .mutation(async ({input }) => {
        // Validate flow secret
        const expectedSecret = process.env.FLOW_SECRET
        if (!expectedSecret) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Flow secret not configured',
          })
        }
        
        if (input.flowSecret !== expectedSecret) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid flow secret',
          })
        }
        try {
          const responsible = await prisma.responsible.findFirst({
            where: {
              email: input.responsibleEmail,
              department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
            }
          })

          if (!responsible) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Responsible person not found',
            })
          }

          await prisma.userProposalSupervision.create({
            data: {
              id: uuidv4(),
              proposalId: input.proposalId,
              supervisorEmail: input.supervisorEmail,
              studyLevel: input.studyLevel,
              responsibleId: responsible.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })

          return { success: true }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get responsible person or create proposal supervision',
          })
        }
      }),
    
  getTopicAreas: publicProcedure
    .query(async () => {
      try {
        const topicAreas = await prisma.topicArea.findMany({
          select: {
            id: true,
            slug: true,
            name: true,
          },
          where: {
            department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
          },
          orderBy: {
            name: 'asc',
          },
        })
        return topicAreas
      } catch (error) {
        console.error('Error fetching topic areas:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch topic areas',
        })
      }
    }),

  // Admin routes
  adminGetResponsiblesOverview: adminProcedure.query(async () => {
    return prisma.responsible.findMany({
      where: {
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      },
      select: {
        id: true,
        name: true,
        email: true,
        supervisions: {
          select: {
            id: true,
            studentEmail: true,
            supervisorEmail: true,
            studyLevel: true,
            proposal: {
              select: {
                id: true,
                title: true,
                statusKey: true,
                ownedByStudent: true,
                topicArea: {
                  select: {
                    name: true,
                  },
                },
                AdminInfo: {
                  select: {
                    id: true,
                    status: true,
                    olatCapturedDate: true,
                    latestSubmissionDate: true,
                    submissionDate: true,
                    olatGradeDate: true,
                    grade: true,
                    comment: true,
                    capturedOnZora: true,
                  },
                },
                applications: {
                  where: {
                    statusKey: 'ACCEPTED',
                  },
                  select: {
                    statusKey: true,
                    email: true,
                    fullName: true,
                    matriculationNumber: true,
                    allowPublication: true,
                    allowUsage: true,
                  },
                  take: 1,
                },
              },
            },
            supervisor: {
              select: {
                email: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        email: 'asc',
      },
    })
  }),

  adminUpdateAdminInfo: adminProcedure
    .input(
      z.object({
        adminInfoId: z.string(),
        olatCapturedDate: z.string().nullable().optional(),
        latestSubmissionDate: z.string().nullable().optional(),
        submissionDate: z.string().nullable().optional(),
        olatGradeDate: z.string().nullable().optional(),
        grade: z.number().nullable().optional(),
        comment: z.string().nullable().optional(),
        capturedOnZora: z.boolean().nullable().optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const adminInfo = await prisma.adminInfo.findUnique({
        where: { id: input.adminInfoId },
        select: {
          id: true,
          department: true,
          status: true,
          olatCapturedDate: true,
          latestSubmissionDate: true,
          submissionDate: true,
          grade: true,
        },
      })

      if (!adminInfo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'AdminInfo entry not found' })
      }

      const envDepartment = process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department
      if (adminInfo.department && adminInfo.department !== envDepartment) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const parseDate = (value: string | null | undefined) => {
        if (value === undefined) return undefined
        if (value === null || value === '') return null
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid date: ${value}` })
        }
        return date
      }

      const getStatusStepRank = (status: string | null | undefined) => {
        switch (status) {
          case 'OPEN':
            return 0
          case 'IN_PROGRESS':
            return 1
          case 'GRADING':
            return 2
          case 'COMPLETED':
            return 3
          default:
            return -1
        }
      }

      const hasCurrentOlatCapturedDate = adminInfo.olatCapturedDate !== null
      const hasCurrentLatestSubmissionDate = adminInfo.latestSubmissionDate !== null
      const hasCurrentSubmissionDate = adminInfo.submissionDate !== null
      const hasCurrentGrade = adminInfo.grade !== null && adminInfo.grade !== undefined

      let fieldStepRank = 0
      if (hasCurrentGrade) {
        fieldStepRank = 3
      } else if (hasCurrentSubmissionDate) {
        fieldStepRank = 2
      } else if (hasCurrentOlatCapturedDate && hasCurrentLatestSubmissionDate) {
        fieldStepRank = 1
      }

      const workflowStepRank = Math.max(getStatusStepRank(adminInfo.status), fieldStepRank)
      const currentWorkflowStep =
        workflowStepRank >= 3
          ? 'COMPLETED'
          : workflowStepRank === 2
            ? 'GRADING'
            : workflowStepRank === 1
              ? 'IN_PROGRESS'
              : 'OPEN'

      const nextOlatCapturedDate =
        'olatCapturedDate' in input
          ? parseDate(input.olatCapturedDate)
          : adminInfo.olatCapturedDate
      const nextLatestSubmissionDate =
        'latestSubmissionDate' in input
          ? parseDate(input.latestSubmissionDate)
          : adminInfo.latestSubmissionDate
      const nextSubmissionDate =
        'submissionDate' in input
          ? parseDate(input.submissionDate)
          : adminInfo.submissionDate
      const nextOlatGradeDate =
        'olatGradeDate' in input
          ? parseDate(input.olatGradeDate)
          : undefined
      const nextGrade = 'grade' in input ? input.grade : adminInfo.grade

      const hasOlatCapturedDate =
        nextOlatCapturedDate !== null && nextOlatCapturedDate !== undefined
      const hasLatestSubmissionDate =
        nextLatestSubmissionDate !== null && nextLatestSubmissionDate !== undefined
      const hasSubmissionDate = nextSubmissionDate !== null && nextSubmissionDate !== undefined
      const hasOlatGradeDate = nextOlatGradeDate !== null && nextOlatGradeDate !== undefined
      const hasGrade = nextGrade !== null && nextGrade !== undefined

      if ('capturedOnZora' in input && input.capturedOnZora !== null && !hasGrade) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Captured on Zora can only be set after Grade is provided.',
        })
      }

      if (
        (currentWorkflowStep === 'OPEN' || currentWorkflowStep === 'IN_PROGRESS') &&
        hasOlatGradeDate
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'OLAT Grade Date can only be set after Submission Date is saved.',
        })
      }

      if (currentWorkflowStep === 'OPEN') {
        if (!hasOlatCapturedDate || !hasLatestSubmissionDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'OLAT Captured Date and Latest Submission Date are required.',
          })
        }

        if (hasSubmissionDate || hasGrade) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Submission Date and Grade are locked until step 1 is completed.',
          })
        }
      }

      if (currentWorkflowStep === 'IN_PROGRESS') {
        if (!hasOlatCapturedDate || !hasLatestSubmissionDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'OLAT Captured Date and Latest Submission Date must stay filled.',
          })
        }

        if (!hasSubmissionDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Submission Date is required before saving this step.',
          })
        }

        if (hasGrade) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Grade is locked until the grading step.',
          })
        }
      }

      if (currentWorkflowStep === 'GRADING') {
        if (!hasOlatCapturedDate || !hasLatestSubmissionDate || !hasSubmissionDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Previous workflow fields must stay filled.',
          })
        }

        if (!hasGrade || !hasOlatGradeDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Grade and OLAT Grade Date are required before saving this step.',
          })
        }
      }

      if (currentWorkflowStep === 'COMPLETED') {
        if (
          !hasOlatCapturedDate ||
          !hasLatestSubmissionDate ||
          !hasSubmissionDate ||
          !hasOlatGradeDate ||
          !hasGrade
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Completed entries must keep all required workflow fields filled.',
          })
        }
      }

      const data: any = {}
      if ('olatCapturedDate' in input) data.olatCapturedDate = nextOlatCapturedDate
      if ('latestSubmissionDate' in input) data.latestSubmissionDate = nextLatestSubmissionDate
      if ('submissionDate' in input) data.submissionDate = nextSubmissionDate
      if ('olatGradeDate' in input) data.olatGradeDate = nextOlatGradeDate
      if ('grade' in input) data.grade = input.grade
      if ('comment' in input) data.comment = input.comment
      if ('capturedOnZora' in input) data.capturedOnZora = input.capturedOnZora

      data.status =
        currentWorkflowStep === 'OPEN'
          ? 'IN_PROGRESS'
          : currentWorkflowStep === 'IN_PROGRESS'
            ? 'GRADING'
            : 'COMPLETED'

      await prisma.adminInfo.update({
        where: { id: input.adminInfoId },
        data,
      })

      return { success: true }
    }),

  adminCreateAdminInfoEntry: adminProcedure
    .input(
      z.object({
        responsibleId: z.string(),
        supervisorEmail: z.string().email(),
        studentEmail: z.string().email(),
        studentName: z.string().min(1),
        matriculationNumber: z.string().min(1),
        title: z.string().min(1),
        language: z.enum(['English', 'German']),
        studyLevel: z.string().min(1),
        topicAreaSlug: z.string().min(1),
        allowPublication: z.boolean(),
        allowUsage: z.boolean(),
      })
    )
    .output(z.object({ success: z.boolean(), proposalId: z.string() }))
    .mutation(async ({ input }) => {
      const envDepartment = process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department

      const [responsible, supervisor, topicArea] = await Promise.all([
        prisma.responsible.findFirst({
          where: {
            id: input.responsibleId,
            department: envDepartment,
          },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: {
            email: input.supervisorEmail,
            role: UserRole.SUPERVISOR,
            department: envDepartment,
          },
          select: { email: true },
        }),
        prisma.topicArea.findFirst({
          where: {
            slug: input.topicAreaSlug,
            department: envDepartment,
          },
          select: { slug: true },
        }),
      ])

      if (!responsible) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Responsible not found' })
      }

      if (!supervisor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Supervisor not found' })
      }

      if (!topicArea) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Topic area not found' })
      }

      const proposalId = uuidv4()
      const supervisionId = uuidv4()
      const applicationId = uuidv4()
      const adminInfoId = uuidv4()

      await prisma.$transaction(async (tx) => {
        await tx.proposal.create({
          data: {
            id: proposalId,
            title: input.title,
            description: 'Created via admin panel',
            language: JSON.stringify([input.language]),
            studyLevel: input.studyLevel,
            topicAreaSlug: input.topicAreaSlug,
            typeKey: ProposalType.SUPERVISOR,
            statusKey: ProposalStatus.MATCHED,
            ownedByUserEmail: input.supervisorEmail,
            ownedByStudent: input.studentEmail,
            department: envDepartment,
          },
        })

        await tx.userProposalSupervision.create({
          data: {
            id: supervisionId,
            proposalId,
            responsibleId: responsible.id,
            supervisorEmail: supervisor.email,
            studentEmail: input.studentEmail,
            studyLevel: input.studyLevel,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        await tx.proposalApplication.create({
          data: {
            id: applicationId,
            statusKey: ApplicationStatus.ACCEPTED,
            email: input.studentEmail,
            matriculationNumber: input.matriculationNumber,
            fullName: input.studentName,
            plannedStartAt: new Date(),
            motivation: 'Created via admin panel',
            proposalId,
            supervisionId,
            allowPublication: input.allowPublication,
            allowUsage: input.allowUsage,
          },
        })

        await tx.adminInfo.create({
          data: {
            id: adminInfoId,
            proposalId,
            status: 'OPEN',
            department: envDepartment,
          },
        })
      })

      return { success: true, proposalId }
    }),

  adminGetAllProposals: adminOnlyProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusFilter: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = {
        department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
      }

      if (input.search) {
        where.OR = [
          { title: { contains: input.search } },
          { ownedByUserEmail: { contains: input.search } },
          { ownedByStudent: { contains: input.search } },
        ]
      }

      if (input.statusFilter && input.statusFilter !== 'ALL') {
        where.statusKey = input.statusFilter
      }

      const proposals = await prisma.proposal.findMany({
        where,
        include: {
          topicArea: true,
          ownedByUser: true,
          supervisedBy: {
            include: {
              supervisor: true,
            },
          },
          applications: {
            include: {
              status: true,
            },
          },
          status: true,
          type: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return proposals
    }),

  adminGetSupervisionStats: adminOnlyProcedure
    .input(z.object({ year: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const envDepartment = process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department

      const supervisionDates = await prisma.userProposalSupervision.findMany({
        where: {
          proposal: {
            department: envDepartment,
          },
        },
        select: {
          createdAt: true,
        },
      })

      const years = Array.from(
        new Set(supervisionDates.map((d) => d.createdAt.getFullYear()))
      ).sort((a, b) => b - a)

      const defaultYear = years[0] ?? new Date().getFullYear()
      const selectedYear =
        input?.year && years.includes(input.year) ? input.year : defaultYear

      const start = new Date(selectedYear, 0, 1)
      const end = new Date(selectedYear + 1, 0, 1)

      const [supervisions, supervisors, responsibles] = await Promise.all([
        prisma.userProposalSupervision.findMany({
          where: {
            createdAt: {
              gte: start,
              lt: end,
            },
            proposal: {
              department: envDepartment,
            },
          },
          select: {
            supervisorEmail: true,
            responsibleId: true,
          },
        }),
        prisma.user.findMany({
          where: {
            department: envDepartment,
            role: {
              in: [UserRole.SUPERVISOR, UserRole.DEVELOPER],
            },
          },
          select: {
            email: true,
            name: true,
            role: true,
          },
          orderBy: [{ name: 'asc' }, { email: 'asc' }],
        }),
        prisma.responsible.findMany({
          where: {
            department: envDepartment,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: [{ name: 'asc' }, { email: 'asc' }],
        }),
      ])

      return {
        year: selectedYear,
        years,
        supervisions,
        supervisors,
        responsibles,
      }
    }),

  adminWithdrawProposal: adminOnlyProcedure
    .input(
      z.object({
        proposalId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const proposal = await prisma.proposal.findUnique({
          where: { id: input.proposalId },
        })

        if (!proposal) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Proposal not found',
          })
        }

        await prisma.proposal.update({
          where: { id: input.proposalId },
          data: {
            statusKey: ProposalStatus.WITHDRAWN,
          },
        })

        return {
          success: true,
          message: 'Proposal withdrawn successfully',
        }
      } catch (error) {
        console.error('Error withdrawing proposal:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to withdraw proposal',
        })
      }
    }),

  adminGetAllUsers: adminOnlyProcedure.query(async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    })
  }),

  adminUpdateUserRoles: adminOnlyProcedure
    .input(
      z
        .object({
          userId: z.string(),
          role: z.enum(['UNSET', 'STUDENT', 'SUPERVISOR', 'DEVELOPER']).optional(),
          adminRole: z.enum(['UNSET', 'COORDINATOR', 'ADMIN']).optional(),
        })
        .refine((data) => data.role !== undefined || data.adminRole !== undefined, {
          message: 'At least one of role or adminRole must be provided',
        })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.sub) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      if (input.userId === ctx.user.sub) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot change your own role/admin role',
        })
      }

      const existing = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      const data: any = {}
      if (input.role !== undefined) data.role = input.role
      if (input.adminRole !== undefined) data.adminRole = input.adminRole

      await prisma.user.update({
        where: { id: input.userId },
        data,
      })

      return { success: true }
    }),

  createUserWithSupervisorRole: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/createUserWithSupervisorRole',
      },
    })
    .input(
      z.object({
        flowSecret: z.string(),
        name: z.string(),
        email: z.string().email()
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          role: z.string(),
          department: z.string().nullable(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate flowSecret
      if (input.flowSecret !== process.env.FLOW_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        // Check if user exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: input.email },
        })

        if (existingUser) {
            const updatedUser = await prisma.user.update({
              where: { email: input.email },
              data: { name: input.name, role: UserRole.SUPERVISOR },
            })

            return {
              success: true,
              message: 'User already exists. Name has been updated.',
              user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                department: updatedUser.department,
              },
            }
        } else {
          // Create new user with SUPERVISOR role
          const newUser = await prisma.user.create({
            data: {
              name: input.name,
              email: input.email,
              role: UserRole.SUPERVISOR,
              department: process.env.NEXT_PUBLIC_DEPARTMENT_NAME as Department,
            },
          })

          return {
            success: true,
            message: 'User created successfully with SUPERVISOR role.',
            user: {
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              department: newUser.department,
            },
          }
        }
      } catch (error) {
        console.error('Error creating/updating user:', error)
        return {
          success: false,
          message: 'Failed to create or update user.',
        }
      }
    }),
});

export type AppRouter = typeof appRouter
