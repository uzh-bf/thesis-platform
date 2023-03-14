// import { ClientSecretCredential } from '@azure/identity'
import { ProposalStatus, UserRole } from '@lib/constants'
// import { Client } from '@microsoft/microsoft-graph-client'
// import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import 'cross-fetch/polyfill'
import { prisma } from '../prisma'
import { optionalAuthedProcedure, publicProcedure, router } from '../trpc'

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'OK'),

  proposals: optionalAuthedProcedure.query(async ({ ctx }) => {
    const proposals = await prisma.proposal.findMany({
      where: {
        typeKey: {
          in:
            ctx.user?.role === UserRole.SUPERVISOR ||
            ctx.user?.role === UserRole.ADMIN
              ? ['SUPERVISOR', 'STUDENT']
              : ['SUPERVISOR'],
        },
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
        receivedFeedbacks: [UserRole.SUPERVISOR, UserRole.ADMIN].includes(
          ctx.user?.role,
        ) && {
          where:
            ctx.user?.role === UserRole.SUPERVISOR && ctx.user.email
              ? {
                  user: {
                    email: ctx.user.email,
                  },
                }
              : undefined,
        },
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
  }),

  // supervisors: optionalAuthedProcedure.query(async ({ ctx }) => {
  //   // Create an instance of the TokenCredential class that is imported
  //   const tokenCredential = new ClientSecretCredential(
  //     process.env.AZURE_AD_TENANT_ID,
  //     process.env.AZURE_AD_CLIENT_ID,
  //     process.env.AZURE_AD_CLIENT_SECRET,
  //   )

  //   // Create an instance of the TokenCredentialAuthenticationProvider by passing the tokenCredential instance and options to the constructor
  //   const authProvider = new TokenCredentialAuthenticationProvider(
  //     tokenCredential,
  //     {
  //       scopes: ['https://graph.microsoft.com/.default'],
  //       getTokenOptions: { tenantId: process.env.AZURE_AD_TENANT_ID },
  //     },
  //   )
  //   const client = Client.initWithMiddleware({
  //     debugLogging: true,
  //     authProvider: authProvider,
  //   })
  //   const res = await client
  //     .api('/sites/UZHBFThesisMarket/lists/Supervisors/items')
  //     .get()

  //   console.log(res)
  // }),
})

export type AppRouter = typeof appRouter
