import { NextRequest, NextResponse } from 'next/server'
import { calculateBtcRealizedPnL } from '@/lib/pnl-helpers'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')

    if (!fundId) {
        return NextResponse.json(
            { error: 'Fund ID is required' },
            { status: 400 }
        )
    }

    try {
        const data = await calculateBtcRealizedPnL(fundId)
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error calculating BTC PnL:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
