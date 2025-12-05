import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const fundId = searchParams.get('fundId')
        const activeOnly = searchParams.get('activeOnly') === 'true'

        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required' },
                { status: 400 }
            )
        }

        const accounts = await db.account.findMany({
            where: {
                fundId,
                ...(activeOnly ? { isActive: true } : {})
            },
            include: {
                assetHoldings: {
                    select: {
                        asset: true,
                        amount: true
                    }
                }
            },
            orderBy: [
                { isActive: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        // Transform to include USDT and BTC balances
        const accountsWithBalances = accounts.map(account => {
            const usdtHolding = account.assetHoldings.find(h => h.asset === 'USDT')
            const btcHolding = account.assetHoldings.find(h => h.asset === 'BTC')

            return {
                ...account,
                balances: {
                    usdt: usdtHolding?.amount || 0,
                    btc: btcHolding?.amount || 0
                }
            }
        })

        return NextResponse.json({
            accounts: accountsWithBalances,
            total: accountsWithBalances.length
        })

    } catch (error) {
        console.error('Error fetching accounts:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const accountData = await request.json()

        const {
            fundId,
            name,
            type,
            platform,
            isActive
        } = accountData

        // Validate required fields
        if (!fundId || !name || !type) {
            return NextResponse.json(
                { error: 'Missing required fields: fundId, name, type' },
                { status: 400 }
            )
        }

        // Validate account type
        const validTypes = ['cex', 'earn_lending', 'cold_wallet', 'other']
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Invalid account type' },
                { status: 400 }
            )
        }

        // Create account
        const account = await db.account.create({
            data: {
                fundId,
                name,
                type,
                platform: platform || null,
                isActive: isActive !== undefined ? isActive : true
            }
        })

        return NextResponse.json({
            success: true,
            account,
            message: 'Account created successfully'
        })

    } catch (error) {
        console.error('Error creating account:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const accountData = await request.json()

        const {
            id,
            fundId,
            name,
            type,
            platform,
            isActive
        } = accountData

        if (!id || !fundId) {
            return NextResponse.json(
                { error: 'Account ID and Fund ID are required' },
                { status: 400 }
            )
        }

        // Validate account type if provided
        if (type) {
            const validTypes = ['cex', 'earn_lending', 'cold_wallet', 'other']
            if (!validTypes.includes(type)) {
                return NextResponse.json(
                    { error: 'Invalid account type' },
                    { status: 400 }
                )
            }
        }

        // Update account
        const account = await db.account.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(type && { type }),
                ...(platform !== undefined && { platform: platform || null }),
                ...(isActive !== undefined && { isActive })
            }
        })

        return NextResponse.json({
            success: true,
            account,
            message: 'Account updated successfully'
        })

    } catch (error) {
        console.error('Error updating account:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const fundId = searchParams.get('fundId')

        if (!id || !fundId) {
            return NextResponse.json(
                { error: 'Account ID and Fund ID are required' },
                { status: 400 }
            )
        }

        // Check if account has associated transactions
        const transactionCount = await db.transaction.count({
            where: { accountId: id }
        })

        if (transactionCount > 0) {
            // Soft delete by setting isActive to false to preserve historical data
            await db.account.update({
                where: { id },
                data: { isActive: false }
            })

            return NextResponse.json({
                success: true,
                message: 'Account deactivated successfully (has associated transactions)'
            })
        } else {
            // Hard delete if no transactions
            await db.account.delete({
                where: { id }
            })

            return NextResponse.json({
                success: true,
                message: 'Account deleted successfully'
            })
        }

    } catch (error) {
        console.error('Error deleting account:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
