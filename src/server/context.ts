import * as trpc from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'src/lib/authOptions'

export const createContext = async (ctx: trpcNext.CreateNextContextOptions) => {
  const { req, res } = ctx

  const session = await getServerSession(req, res, authOptions)

  return { session }
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>
