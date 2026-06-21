import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Health check endpoint for Coolify / Docker health checks
 * GET /api/health
 * 
 * Returns:
 * - 200: { status: "ok", db: "connected", timestamp: "..." }
 * - 503: { status: "error", db: "disconnected", error: "...", timestamp: "..." }
 */
export async function GET() {
    const timestamp = new Date().toISOString()

    try {
        // Test database connectivity with a simple query
        await db.$queryRaw`SELECT 1`

        return NextResponse.json(
            {
                status: 'ok',
                db: 'connected',
                timestamp,
                version: process.env.npm_package_version || '0.1.0',
            },
            { status: 200 }
        )
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error'

        return NextResponse.json(
            {
                status: 'error',
                db: 'disconnected',
                error: errorMessage,
                timestamp,
            },
            { status: 503 }
        )
    }
}
