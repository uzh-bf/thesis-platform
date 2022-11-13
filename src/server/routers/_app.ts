import { UserRole } from '@lib/constants'
import { publicProcedure, router } from '../trpc'

export const appRouter = router({
  proposals: publicProcedure.query(async ({ ctx }) => {
    const proposals = await ctx.prisma.proposal.findMany({
      where: {
        typeKey: {
          in:
            ctx.user?.role === UserRole.SUPERVISOR
              ? ['SUPERVISOR', 'STUDENT']
              : ['SUPERVISOR'],
        },
      },
      include: {
        attachments: true,
        topicAreas: true,
        ownedBy: {
          include: { user: true },
        },
        supervisedBy: {
          include: { user: true },
        },
      },
    })

    console.log(JSON.stringify(proposals, null, 2))

    return proposals.map((p) => ({
      ...p,
      ownedBy: p.ownedBy[0].user,
      supervisedBy: p.supervisedBy?.[0]?.user,
    }))
  }),
})

export type AppRouter = typeof appRouter
