import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database configuration based on provider
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql')

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isPostgres
      ? ['error', 'warn'] // Less verbose for production PostgreSQL
      : ['query'], // Verbose for local SQLite development
    // PostgreSQL-specific optimizations
    ...(isPostgres && {
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db