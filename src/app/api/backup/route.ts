import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { BACKUP_VERSION } from '@/lib/backup-utils'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

/**
 * GET /api/backup?fundId={fundId}
 * Export all fund data as JSON backup file
 * Requires authentication and at least viewer access
 */
export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const fundId = searchParams.get('fundId')

        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required' },
                { status: 400 }
            )
        }

        // Check if user has access to the fund (at least viewer)
        const access = await checkFundAccess(user.id, fundId, 'viewer')
        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Bạn không có quyền truy cập quỹ này' },
                { status: 403 }
            )
        }

        // Fetch fund data
        const fund = await db.fund.findUnique({
            where: { id: fundId }
        })

        if (!fund) {
            return NextResponse.json(
                { error: 'Fund not found' },
                { status: 404 }
            )
        }

        // Fetch all related data
        const [accounts, transactions, assetHoldings, fees] = await Promise.all([
            db.account.findMany({
                where: { fundId },
                orderBy: { createdAt: 'asc' }
            }),
            db.transaction.findMany({
                where: { fundId },
                orderBy: { createdAt: 'asc' }
            }),
            db.assetHolding.findMany({
                where: { fundId },
                orderBy: { createdAt: 'asc' }
            }),
            db.fee.findMany({
                where: { fundId },
                orderBy: { createdAt: 'asc' }
            })
        ])

        // Create backup data structure (exclude sensitive fields like ownerId)
        const fundDataForBackup = {
            id: fund.id,
            name: fund.name,
            description: fund.description,
            timezone: fund.timezone, // v2.0: Added timezone
            initialVnd: fund.initialVnd,
            initialCapital: fund.initialCapital,
            additionalCapital: fund.additionalCapital,
            withdrawnCapital: fund.withdrawnCapital,
            retainedEarnings: fund.retainedEarnings,
            earnInterestMethod: fund.earnInterestMethod,
            createdAt: fund.createdAt,
            updatedAt: fund.updatedAt
            // Note: ownerId is intentionally excluded from backup
        }

        const backupData = {
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            fundName: fund.name,
            fundId: fund.id,
            stats: {
                totalAccounts: accounts.length,
                totalTransactions: transactions.length,
                totalAssetHoldings: assetHoldings.length,
                totalFees: fees.length
            },
            data: {
                fund: fundDataForBackup,
                accounts,
                transactions,
                assetHoldings,
                fees
            }
        }

        // Return JSON response with appropriate headers for file download
        const jsonString = JSON.stringify(backupData, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })

        // Create safe filename (no Vietnamese chars in Content-Disposition header)
        const timestamp = new Date().toISOString().slice(0, 10)
        const safeFilename = `fundmanage-backup-${timestamp}.json`

        return new Response(blob, {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="${safeFilename}"`
            }
        })

    } catch (error) {
        console.error('Error creating backup:', error)
        return NextResponse.json(
            { error: 'Failed to create backup. Please try again.' },
            { status: 500 }
        )
    }
}
