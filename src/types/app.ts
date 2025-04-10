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

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

export type ProposalsOutput = RouterOutput['proposals']
export type ProposalDetails = IterableElement<ProposalsOutput>
export type ApplicationDetails = IterableElement<
  ProposalDetails['applications']
>

export enum ProposalStatusFilter {
  OPEN_PROPOSALS = 'OPEN_PROPOSALS',
  ALL_PROPOSALS = 'ALL_PROPOSALS',
  MY_PROPOSALS = 'MY_PROPOSALS',
  ACTIVE_PROPOSALS = 'ACTIVE_PROPOSALS',
  REJECTED_AND_DECLINED_PROPOSALS = 'REJECTED_AND_DECLINED_PROPOSALS',
}
