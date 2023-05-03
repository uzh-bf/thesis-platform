import type { PrismaClient } from '@prisma/client'
import type { DefaultSession, DefaultUser } from 'next-auth'
import type { UserRole } from '../lib/constants'

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
