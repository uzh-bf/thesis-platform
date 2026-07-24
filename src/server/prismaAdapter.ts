import { PrismaPg } from '@prisma/adapter-pg'

export function createPrismaPgAdapter(
  connectionString = process.env.DATABASE_URL
) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Prisma PostgreSQL access')
  }

  return new PrismaPg({ connectionString })
}
