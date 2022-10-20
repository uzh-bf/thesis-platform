import type { PrismaClient } from '@prisma/client'

interface Context extends BaseContext {
  prisma: PrismaClient
}

interface ContextWithOptionalUser extends Context {
  user?: {
    sub: string
  }
}

interface ContextWithUser extends Context {
  user: {
    sub: string
  }
}
