// import { ClientSecretCredential } from '@azure/identity'
import { ProposalStatus, ApplicationStatus, ProposalType, UserRole } from 'src/lib/constants'
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
import { v4 as uuidv4 } from 'uuid'

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
  .mutation(async ({ ctx, input }) => {
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
            plannedStartAt: new Date(input.proposalApplication.plannedStartAt + "T00:00:00Z"),
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

});

export type AppRouter = typeof appRouter
