import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const fundId = searchParams.get('fundId')

        if (!fundId) {
            return NextResponse.json({ error: 'Fund ID is required' }, { status: 400 })
        }

        const access = await checkFundAccess(user.id, fundId, 'viewer')
        if (!access.hasAccess) {
            return NextResponse.json({ error: 'Bạn không có quyền truy cập quỹ này' }, { status: 403 })
        }

        // ===== SPOT TRADES =====
        // Lấy tất cả sell_btc có realizedPnL (mỗi sell = 1 trade đã chốt)
        const sellBtcTransactions = await db.transaction.findMany({
            where: { fundId, type: 'sell_btc' },
            include: { account: true },
            orderBy: { createdAt: 'desc' }
        })

        const spotTrades = sellBtcTransactions.map(tx => ({
            id: tx.id,
            type: 'spot' as const,
            date: tx.createdAt,
            asset: 'BTC',
            amount: tx.amount,
            sellPrice: tx.price || 0,
            costBasis: tx.costBasis || 0,
            pnl: tx.realizedPnL || 0,
            fee: tx.fee || 0,
            feeCurrency: tx.feeCurrency || 'USDT',
            account: tx.account?.name || null,
            note: tx.note
        }))

        // Tổng hợp spot
        const spotSummary = {
            totalTrades: spotTrades.length,
            totalPnL: spotTrades.reduce((sum, t) => sum + t.pnl, 0),
            totalFees: spotTrades.reduce((sum, t) => sum + t.fee, 0),
            wins: spotTrades.filter(t => t.pnl > 0).length,
            losses: spotTrades.filter(t => t.pnl <= 0).length,
        }

        // ===== FUTURES TRADES =====
        const futuresTransactions = await db.transaction.findMany({
            where: { fundId, type: 'futures_pnl' },
            include: { account: true },
            orderBy: { createdAt: 'desc' }
        })

        const futuresTrades = futuresTransactions.map(tx => ({
            id: tx.id,
            type: 'futures' as const,
            date: tx.createdAt,
            asset: 'BTC',
            amount: 0, // Futures không track size trong amount
            pnl: tx.amount, // amount = PnL cho futures_pnl
            fee: tx.fee || 0,
            feeCurrency: tx.feeCurrency || 'USDT',
            account: tx.account?.name || null,
            note: tx.note
        }))

        const futuresSummary = {
            totalTrades: futuresTrades.length,
            totalPnL: futuresTrades.reduce((sum, t) => sum + t.pnl, 0),
            totalFees: futuresTrades.reduce((sum, t) => sum + t.fee, 0),
            totalNet: futuresTrades.reduce((sum, t) => sum + t.pnl - t.fee, 0),
            wins: futuresTrades.filter(t => t.pnl > 0).length,
            losses: futuresTrades.filter(t => t.pnl <= 0).length,
        }

        return NextResponse.json({
            spot: { trades: spotTrades, summary: spotSummary },
            futures: { trades: futuresTrades, summary: futuresSummary }
        })
    } catch (error) {
        console.error('Error fetching trade book:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
