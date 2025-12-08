import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculateFund } from '@/lib/fund-calculator'
import { validateBackupFile, checkBackupCompatibility } from '@/lib/backup-utils'
import type { BackupData } from '@/lib/backup-utils'

/**
 * POST /api/restore
 * Restore fund data from backup file
 * 
 * Process:
 * 1. Validate backup file format and version
 * 2. Create automatic backup of current data
 * 3. Delete all current data in transaction
 * 4. Import backup data in transaction
 * 5. Recalculate fund metrics
 * 6. Rollback if any error occurs
 */
export async function POST(request: NextRequest) {
    let autoBackup: any = null

    try {
        // Parse request body
        const backupData: BackupData = await request.json()

        // Step 1: Validate backup file structure
        const validation = validateBackupFile(backupData)
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            )
        }

        // Step 2: Check version compatibility
        const compatibility = checkBackupCompatibility(backupData.version)
        if (!compatibility.compatible) {
            return NextResponse.json(
                { error: compatibility.warning },
                { status: 400 }
            )
        }

        const fundId = backupData.data.fund.id

        // Step 3: Create automatic backup of current data before restore
        console.log('Creating automatic backup before restore...')
        const [currentFund, currentAccounts, currentTransactions, currentAssetHoldings, currentFees] = await Promise.all([
            db.fund.findUnique({ where: { id: fundId } }),
            db.account.findMany({ where: { fundId } }),
            db.transaction.findMany({ where: { fundId } }),
            db.assetHolding.findMany({ where: { fundId } }),
            db.fee.findMany({ where: { fundId } })
        ])

        if (currentFund) {
            autoBackup = {
                version: backupData.version,
                exportedAt: new Date().toISOString(),
                fundName: currentFund.name,
                fundId: currentFund.id,
                isAutoBackup: true,
                stats: {
                    totalAccounts: currentAccounts.length,
                    totalTransactions: currentTransactions.length,
                    totalAssetHoldings: currentAssetHoldings.length,
                    totalFees: currentFees.length
                },
                data: {
                    fund: currentFund,
                    accounts: currentAccounts,
                    transactions: currentTransactions,
                    assetHoldings: currentAssetHoldings,
                    fees: currentFees
                }
            }
            console.log('Auto backup created successfully')
        }

        // Step 4: Restore data in a transaction (all-or-nothing)
        await db.$transaction(async (tx) => {
            console.log('Starting restore transaction...')

            // Delete all existing data (in correct order due to foreign keys)
            await tx.fee.deleteMany({ where: { fundId } })
            await tx.assetHolding.deleteMany({ where: { fundId } })
            await tx.transaction.deleteMany({ where: { fundId } })
            await tx.account.deleteMany({ where: { fundId } })
            await tx.fund.delete({ where: { id: fundId } })

            console.log('Deleted old data successfully')

            // Import backup data (in correct order)
            // 1. Fund
            await tx.fund.create({
                data: {
                    ...backupData.data.fund,
                    createdAt: new Date(backupData.data.fund.createdAt),
                    updatedAt: new Date(backupData.data.fund.updatedAt)
                }
            })

            // 2. Accounts
            if (backupData.data.accounts.length > 0) {
                await tx.account.createMany({
                    data: backupData.data.accounts.map(account => ({
                        ...account,
                        createdAt: new Date(account.createdAt),
                        updatedAt: new Date(account.updatedAt)
                    }))
                })
            }

            // 3. Transactions
            if (backupData.data.transactions.length > 0) {
                await tx.transaction.createMany({
                    data: backupData.data.transactions.map(transaction => ({
                        ...transaction,
                        createdAt: new Date(transaction.createdAt)
                    }))
                })
            }

            // 4. Asset Holdings
            if (backupData.data.assetHoldings.length > 0) {
                await tx.assetHolding.createMany({
                    data: backupData.data.assetHoldings.map(holding => ({
                        ...holding,
                        createdAt: new Date(holding.createdAt),
                        updatedAt: new Date(holding.updatedAt)
                    }))
                })
            }

            // 5. Fees
            if (backupData.data.fees.length > 0) {
                await tx.fee.createMany({
                    data: backupData.data.fees.map(fee => ({
                        ...fee,
                        createdAt: new Date(fee.createdAt)
                    }))
                })
            }

            console.log('Imported backup data successfully')
        })

        // Step 5: Recalculate fund metrics
        console.log('Recalculating fund metrics...')
        await recalculateFund(fundId)
        console.log('Fund recalculation completed')

        // Success response
        return NextResponse.json({
            success: true,
            message: 'Dữ liệu đã được phục hồi thành công',
            stats: {
                fundName: backupData.fundName,
                exportedAt: backupData.exportedAt,
                accountsRestored: backupData.data.accounts.length,
                transactionsRestored: backupData.data.transactions.length,
                assetHoldingsRestored: backupData.data.assetHoldings.length,
                feesRestored: backupData.data.fees.length
            },
            autoBackupCreated: autoBackup !== null
        })

    } catch (error) {
        console.error('Error restoring backup:', error)

        // If we have an auto backup and the restore failed, inform user
        if (autoBackup) {
            console.error('Restore failed, but auto-backup was created before operation')
            return NextResponse.json(
                {
                    error: 'Phục hồi dữ liệu thất bại. Dữ liệu cũ đã được sao lưu tự động.',
                    details: error instanceof Error ? error.message : 'Unknown error',
                    autoBackup: autoBackup // Return the auto backup so user can attempt manual restore
                },
                { status: 500 }
            )
        }

        // No auto backup means the error happened before we could create it
        return NextResponse.json(
            {
                error: 'Không thể phục hồi dữ liệu',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
