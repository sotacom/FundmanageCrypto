import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

/**
 * Accounting Reports API - Vietnamese Standards (VAS)
 * Provides balance sheet and income statement data
 * Requires at least viewer access
 */

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const fundId = searchParams.get('fundId')

        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required' },
                { status: 400 }
            )
        }

        // Check fund access (need at least viewer role)
        const access = await checkFundAccess(user.id, fundId, 'viewer')
        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Bạn không có quyền truy cập quỹ này' },
                { status: 403 }
            )
        }

        // Fetch fund with equity
        const fund = await db.fund.findUnique({
            where: { id: fundId },
            include: {
                assetHoldings: true,
                transactions: true
            }
        })

        if (!fund) {
            return NextResponse.json(
                { error: 'Fund not found' },
                { status: 404 }
            )
        }

        // Get current holdings
        const vndHolding = fund.assetHoldings.find(h => h.asset === 'VND')
        const usdtHolding = fund.assetHoldings.find(h => h.asset === 'USDT')
        const btcHolding = fund.assetHoldings.find(h => h.asset === 'BTC')

        // Use approximate prices (should fetch real prices in production)
        const usdtVndPrice = 27360
        const btcUsdtPrice = 92890

        const vndAmount = vndHolding?.amount || 0
        const usdtAmount = usdtHolding?.amount || 0
        const btcAmount = btcHolding?.amount || 0

        const usdtValueVnd = usdtAmount * usdtVndPrice
        const btcValueVnd = btcAmount * btcUsdtPrice * usdtVndPrice

        const totalAssets = vndAmount + usdtValueVnd + btcValueVnd

        // Calculate equity
        const totalCapital = fund.initialCapital + fund.additionalCapital - fund.withdrawnCapital
        const retainedEarnings = totalAssets - totalCapital

        // Calculate realized income
        const realizedTransactions = fund.transactions.filter(tx => tx.realizedPnL !== null)
        const totalRealizedPnL = realizedTransactions.reduce((sum, tx) => sum + (tx.realizedPnL || 0), 0)

        // Calculate interest income from Earn
        const earnTransactions = fund.transactions.filter(tx => tx.type === 'earn_interest')
        const totalEarnInterest = earnTransactions.reduce((sum, tx) => sum + tx.amount, 0) * usdtVndPrice

        // Unrealized income
        const unrealizedIncome = retainedEarnings - totalRealizedPnL

        // Balance Sheet (Bảng cân đối kế toán)
        const balanceSheet = {
            assets: {
                cash_vnd: {
                    amount: vndAmount,
                    percentage: totalAssets > 0 ? (vndAmount / totalAssets) * 100 : 0
                },
                foreign_currency_usdt: {
                    amount_usdt: usdtAmount,
                    exchange_rate: usdtVndPrice,
                    amount_vnd: usdtValueVnd,
                    percentage: totalAssets > 0 ? (usdtValueVnd / totalAssets) * 100 : 0
                },
                crypto_investment_btc: {
                    amount_btc: btcAmount,
                    price_usdt: btcUsdtPrice,
                    price_vnd: btcValueVnd,
                    percentage: totalAssets > 0 ? (btcValueVnd / totalAssets) * 100 : 0
                },
                total_assets: totalAssets
            },
            equity: {
                initial_capital: fund.initialCapital,
                additional_capital: fund.additionalCapital,
                withdrawn_capital: fund.withdrawnCapital,
                total_contributed_capital: totalCapital,
                retained_earnings: retainedEarnings,
                total_equity: totalAssets
            }
        }

        // Income Statement (Báo cáo kết quả kinh doanh)
        const incomeStatement = {
            realized_income: {
                trading_income: totalRealizedPnL,
                interest_income_from_earn: totalEarnInterest,
                total_realized: totalRealizedPnL + totalEarnInterest
            },
            unrealized_income: {
                forex_revaluation: unrealizedIncome * 0.3, // Approximate
                crypto_revaluation: unrealizedIncome * 0.7, // Approximate
                total_unrealized: unrealizedIncome
            },
            total_comprehensive_income: retainedEarnings
        }

        // Breakdown for analysis
        const breakdown = {
            usdt_position: {
                balance: usdtAmount,
                avg_cost_rate: usdtHolding?.avgPrice || 0,
                current_rate: usdtVndPrice,
                cost_basis_vnd: usdtAmount * (usdtHolding?.avgPrice || 0),
                current_value_vnd: usdtValueVnd,
                unrealized_gain_vnd: usdtValueVnd - (usdtAmount * (usdtHolding?.avgPrice || 0))
            },
            btc_position: {
                balance: btcAmount,
                avg_cost_price_usdt: btcHolding?.avgPrice || 0,
                current_price_usdt: btcUsdtPrice,
                cost_basis_usdt: btcAmount * (btcHolding?.avgPrice || 0),
                current_value_usdt: btcAmount * btcUsdtPrice,
                unrealized_gain_usdt: btcAmount * (btcUsdtPrice - (btcHolding?.avgPrice || 0)),
                unrealized_gain_vnd: btcAmount * (btcUsdtPrice - (btcHolding?.avgPrice || 0)) * usdtVndPrice
            }
        }

        return NextResponse.json({
            balance_sheet: balanceSheet,
            income_statement: incomeStatement,
            breakdown
        })

    } catch (error) {
        console.error('Error generating accounting reports:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
