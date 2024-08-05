import { initTRPC, TRPCError } from '@trpc/server'
import { OpenApiMeta } from 'trpc-openapi'
import { Context } from './context'

const t = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    errorFormatter({ shape }) {
      return shape
    },
  })

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
export const mergeRouters = t.mergeRouters

const isOptionalAuthed = middleware(({ next, ctx }) => {
  const user = ctx.session?.user

  return next({
    ctx: { user },
  })
})

export const optionalAuthedProcedure = t.procedure.use(isOptionalAuthed)

const isAuthed = middleware(({ next, ctx }) => {
  const user = ctx.session?.user

  if (!user?.name) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: { user },
  })
})

export const authedProcedure = t.procedure.use(isAuthed)
