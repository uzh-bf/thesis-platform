// import { ClientSecretCredential } from '@azure/identity'
import { ProposalStatus, UserRole } from 'src/lib/constants'
// import { Client } from '@microsoft/microsoft-graph-client'
// import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import {
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import 'cross-fetch/polyfill'
import { prisma } from 'src/server/prisma'
import {
  optionalAuthedProcedure,
  publicProcedure,
  router,
} from 'src/server/trpc'

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
