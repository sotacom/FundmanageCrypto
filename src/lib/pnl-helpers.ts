import { db } from './db'

/**
 * Calculate realized PnL from BTC trading (sell_btc transactions)
 */
export async function calculateBtcRealizedPnL(fundId: string) {
    const sellTransactions = await db.transaction.findMany({
        where: {
            fundId,
            type: 'sell_btc',
            realizedPnL: { not: null }
        }
    })

    const positiveCount = sellTransactions.filter(tx => (tx.realizedPnL || 0) > 0).length
    const total = sellTransactions.reduce((sum, tx) => sum + (tx.realizedPnL || 0), 0)

    return {
        total,
        count: sellTransactions.length,
        wins: positiveCount,
        winRate: sellTransactions.length > 0 ? (positiveCount / sellTransactions.length) * 100 : 0,
        avgPerTrade: sellTransactions.length > 0 ? total / sellTransactions.length : 0
    }
}

/**
 * Calculate realized PnL from USDT P2P trading (sell_usdt transactions)
 */
export async function calculateUsdtRealizedPnL(fundId: string) {
    const sellTransactions = await db.transaction.findMany({
        where: {
            fundId,
            type: 'sell_usdt',
            realizedPnL: { not: null }
        }
    })

    const total = sellTransactions.reduce((sum, tx) => sum + (tx.realizedPnL || 0), 0)

    return {
        total,
        count: sellTransactions.length,
        avgSpread: sellTransactions.length > 0 ? total / sellTransactions.length : 0
    }
}

/**
 * Calculate unrealized forex gain from USDT holdings
 */
export function calculateForexGain(
    usdtAmount: number,
    avgPrice: number,
    currentPrice: number
): number {
    return usdtAmount * (currentPrice - avgPrice)
}

/**
 * Calculate unrealized crypto gain from BTC holdings
 */
export function calculateCryptoGain(
    btcAmount: number,
    avgPriceBtc: number,
    currentBtcPrice: number,
    currentUsdtVndPrice: number
): number {
    const usdtGain = btcAmount * (currentBtcPrice - avgPriceBtc)
    return usdtGain * currentUsdtVndPrice
}

/**
 * Count number of P2P trades (both buy and sell USDT)
 */
export async function countP2PTrades(fundId: string): Promise<number> {
    const count = await db.transaction.count({
        where: {
            fundId,
            type: {
                in: ['buy_usdt', 'sell_usdt']
            }
        }
    })
    return count
}
