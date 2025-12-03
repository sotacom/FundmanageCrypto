import { NextResponse } from 'next/server'
import { getCurrentPrices } from '@/lib/binance-price-service'

/**
 * GET /api/prices/current
 * 
 * Returns current USDT/VND and BTC/USDT prices from Binance
 */
export async function GET() {
    try {
        const prices = await getCurrentPrices()

        return NextResponse.json({
            usdtVnd: prices.usdtVnd,
            btcUsdt: prices.btcUsdt,
            timestamp: prices.timestamp,
            sources: prices.sources
        })

    } catch (error) {
        console.error('Error in /api/prices/current:', error)

        // Return error but with fallback prices
        return NextResponse.json(
            {
                error: 'Failed to fetch prices',
                usdtVnd: 25500,
                btcUsdt: 43000,
                timestamp: new Date(),
                sources: {
                    usdtVnd: 'default',
                    btcUsdt: 'default'
                }
            },
            { status: 500 }
        )
    }
}
