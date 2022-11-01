import type { PrismaClient } from '@prisma/client'
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
