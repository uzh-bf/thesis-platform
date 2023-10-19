import type { PrismaClient } from '@prisma/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { DefaultSession, DefaultUser } from 'next-auth'
import type { IterableElement } from 'type-fest'
import type { UserRole } from '../lib/constants'
import type { AppRouter } from '../server/routers/_app'

interface Context extends BaseContext {
  prisma: PrismaClient
}

interface ContextWithOptionalUser extends Context {
  user?: {
    sub: string
    role: UserRole
  }
}

interface ContextWithUser extends Context {
  user: {
    sub: string
    role: UserRole
  }
}

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: UserRole
  }
  interface Session {
    user?: {
      sub: string
      role: UserRole
    } & DefaultSession['user']
  }
}

type RouterInput = inferRouterInputs<AppRouter>
type RouterOutput = inferRouterOutputs<AppRouter>

type ProposalsOutput = RouterOutput['proposals']
type ProposalDetails = IterableElement<ProposalsOutput>
