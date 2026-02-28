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
        // Lấy buy_btc để tính phí mua (BTC fee → USDT)
        const buyBtcTransactions = await db.transaction.findMany({
            where: { fundId, type: 'buy_btc' },
            orderBy: { createdAt: 'asc' }
        })

        // Tính tổng phí mua quy đổi USDT và tổng BTC đã mua
        let totalBuyFeeUsdt = 0
        let totalBtcBought = 0
        for (const tx of buyBtcTransactions) {
            const buyPrice = tx.price || 0
            const fee = tx.fee || 0
            if (tx.feeCurrency === 'BTC') {
                // Phí BTC × giá mua = phí USDT
                totalBuyFeeUsdt += fee * buyPrice
            } else if (tx.feeCurrency === 'USDT') {
                totalBuyFeeUsdt += fee
            }
            totalBtcBought += tx.amount
        }

        // Phí mua TB trên mỗi BTC (USDT)
        const avgBuyFeePerBtc = totalBtcBought > 0 ? totalBuyFeeUsdt / totalBtcBought : 0

        // Lấy sell_btc (mỗi sell = 1 trade đã chốt)
        const sellBtcTransactions = await db.transaction.findMany({
            where: { fundId, type: 'sell_btc' },
            include: { account: true },
            orderBy: { createdAt: 'desc' }
        })

        const spotTrades = sellBtcTransactions.map(tx => {
            // Phí bán (USDT)
            let sellFeeUsdt = 0
            if ((tx.fee || 0) > 0) {
                if (tx.feeCurrency === 'BTC') {
                    sellFeeUsdt = (tx.fee || 0) * (tx.price || 0)
                } else {
                    sellFeeUsdt = tx.fee || 0
                }
            }
            // Phí mua phân bổ theo lượng BTC bán
            const buyFeeUsdt = tx.amount * avgBuyFeePerBtc
            const totalFeeUsdt = sellFeeUsdt + buyFeeUsdt

            return {
                id: tx.id,
                type: 'spot' as const,
                date: tx.createdAt,
                asset: 'BTC',
                amount: tx.amount,
                sellPrice: tx.price || 0,
                costBasis: tx.costBasis || 0,
                pnl: tx.realizedPnL || 0,
                fee: totalFeeUsdt, // Phí mua + bán (USDT)
                sellFee: sellFeeUsdt,
                buyFee: buyFeeUsdt,
                feeCurrency: 'USDT',
                account: tx.account?.name || null,
                note: tx.note
            }
        })

        // Tổng hợp spot
        const spotSummary = {
            totalTrades: spotTrades.length,
            totalPnL: spotTrades.reduce((sum, t) => sum + t.pnl, 0),
            totalFees: spotTrades.reduce((sum, t) => sum + t.fee, 0),
            totalBuyFees: totalBuyFeeUsdt,
            totalSellFees: spotTrades.reduce((sum, t) => sum + t.sellFee, 0),
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
