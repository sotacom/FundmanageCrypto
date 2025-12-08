import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculateFund } from '@/lib/fund-calculator'
import { validateBackupFile, checkBackupCompatibility } from '@/lib/backup-utils'
import type { BackupData } from '@/lib/backup-utils'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

/**
 * POST /api/restore
 * Restore fund data from backup file
 * 
 * Process:
 * 1. Validate authentication and fund access
 * 2. Validate backup file format and version
 * 3. Create automatic backup of current data
 * 4. Delete all current data in transaction
 * 5. Import backup data into TARGET fund (not original fund from backup)
 * 6. Recalculate fund metrics
 * 7. Rollback if any error occurs
 */
export async function POST(request: NextRequest) {
    let autoBackup: any = null

    try {
        // Check authentication
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Parse request body
        const body = await request.json()
        const { targetFundId, backupData: rawBackupData } = body as {
            targetFundId: string
            backupData: BackupData
        }

        // If targetFundId is provided, use it; otherwise fall back to backup's fundId
        const fundId = targetFundId || rawBackupData.data.fund.id

        // Check if user has owner access to the target fund
        const access = await checkFundAccess(user.id, fundId, 'owner')
        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Bạn không có quyền khôi phục quỹ này. Chỉ chủ sở hữu mới có thể thực hiện.' },
                { status: 403 }
            )
        }

        // Step 1: Validate backup file structure
        const validation = validateBackupFile(rawBackupData)
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            )
        }

        // Step 2: Check version compatibility
        const compatibility = checkBackupCompatibility(rawBackupData.version)
        if (!compatibility.compatible) {
            return NextResponse.json(
                { error: compatibility.warning },
                { status: 400 }
            )
        }

        // Get current target fund data for auto backup
        console.log('Creating automatic backup before restore...')
        const [currentFund, currentAccounts, currentTransactions, currentAssetHoldings, currentFees] = await Promise.all([
            db.fund.findUnique({ where: { id: fundId } }),
            db.account.findMany({ where: { fundId } }),
            db.transaction.findMany({ where: { fundId } }),
            db.assetHolding.findMany({ where: { fundId } }),
            db.fee.findMany({ where: { fundId } })
        ])

        if (!currentFund) {
            return NextResponse.json(
                { error: 'Không tìm thấy quỹ đích' },
                { status: 404 }
            )
        }

        // Create auto backup of current data
        autoBackup = {
            version: rawBackupData.version,
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

        // Create ID mapping for accounts (old ID -> new ID)
        const accountIdMap = new Map<string, string>()

        // Step 4: Restore data in a transaction (all-or-nothing)
        await db.$transaction(async (tx) => {
            console.log('Starting restore transaction...')

            // Delete all existing data (in correct order due to foreign keys)
            await tx.fee.deleteMany({ where: { fundId } })
            await tx.assetHolding.deleteMany({ where: { fundId } })
            await tx.transaction.deleteMany({ where: { fundId } })
            await tx.account.deleteMany({ where: { fundId } })

            console.log('Deleted old data successfully')

            // Import backup data (in correct order)
            // 1. Update Fund with backup settings (keep current fund ID and ownership)
            await tx.fund.update({
                where: { id: fundId },
                data: {
                    name: rawBackupData.data.fund.name,
                    description: rawBackupData.data.fund.description,
                    initialVnd: rawBackupData.data.fund.initialVnd,
                    initialCapital: rawBackupData.data.fund.initialCapital,
                    additionalCapital: rawBackupData.data.fund.additionalCapital,
                    withdrawnCapital: rawBackupData.data.fund.withdrawnCapital,
                    retainedEarnings: rawBackupData.data.fund.retainedEarnings,
                    earnInterestMethod: rawBackupData.data.fund.earnInterestMethod,
                    updatedAt: new Date()
                }
            })

            // 2. Accounts - create with new IDs and map old to new
            for (const account of rawBackupData.data.accounts) {
                const newAccount = await tx.account.create({
                    data: {
                        fundId: fundId, // Use target fund ID
                        name: account.name,
                        type: account.type,
                        platform: account.platform,
                        isActive: account.isActive,
                        createdAt: new Date(account.createdAt),
                        updatedAt: new Date(account.updatedAt)
                    }
                })
                accountIdMap.set(account.id, newAccount.id)
            }

            // 3. Transactions - update references
            if (rawBackupData.data.transactions.length > 0) {
                for (const transaction of rawBackupData.data.transactions) {
                    await tx.transaction.create({
                        data: {
                            fundId: fundId, // Use target fund ID
                            accountId: transaction.accountId ? accountIdMap.get(transaction.accountId) || null : null,
                            type: transaction.type,
                            amount: transaction.amount,
                            currency: transaction.currency,
                            price: transaction.price,
                            fee: transaction.fee,
                            feeCurrency: transaction.feeCurrency,
                            fromLocation: transaction.fromLocation,
                            toLocation: transaction.toLocation ?
                                (accountIdMap.get(transaction.toLocation) || transaction.toLocation) : null,
                            note: transaction.note,
                            costBasis: transaction.costBasis || 0,
                            realizedPnL: transaction.realizedPnL || 0,
                            createdAt: new Date(transaction.createdAt)
                        }
                    })
                }
            }

            // 4. Asset Holdings - update references
            if (rawBackupData.data.assetHoldings.length > 0) {
                for (const holding of rawBackupData.data.assetHoldings) {
                    await tx.assetHolding.create({
                        data: {
                            fundId: fundId, // Use target fund ID
                            accountId: holding.accountId ? accountIdMap.get(holding.accountId) || null : null,
                            asset: holding.asset,
                            amount: holding.amount,
                            avgPrice: holding.avgPrice,
                            location: holding.location,
                            createdAt: new Date(holding.createdAt),
                            updatedAt: new Date(holding.updatedAt)
                        }
                    })
                }
            }

            // 5. Fees - update references
            if (rawBackupData.data.fees.length > 0) {
                for (const fee of rawBackupData.data.fees) {
                    await tx.fee.create({
                        data: {
                            fundId: fundId, // Use target fund ID
                            transactionId: fee.transactionId,
                            type: fee.type,
                            amount: fee.amount,
                            currency: fee.currency,
                            description: fee.description,
                            createdAt: new Date(fee.createdAt)
                        }
                    })
                }
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
                fundName: rawBackupData.fundName,
                exportedAt: rawBackupData.exportedAt,
                accountsRestored: rawBackupData.data.accounts.length,
                transactionsRestored: rawBackupData.data.transactions.length,
                assetHoldingsRestored: rawBackupData.data.assetHoldings.length,
                feesRestored: rawBackupData.data.fees.length
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
                    autoBackup: autoBackup
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
