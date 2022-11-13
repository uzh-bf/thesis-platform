import { authOptions } from '@lib/authOptions'
import * as trpcNext from '@trpc/server/adapters/next'
import { unstable_getServerSession } from 'next-auth'

import prisma from '../../../lib/prisma'
import { appRouter } from '../../../server/routers/_app'

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: async ({ req, res }) => {
    const session = await unstable_getServerSession(req, res, authOptions)
    return {
      prisma,
      user: session?.user,
    }
  },
})
