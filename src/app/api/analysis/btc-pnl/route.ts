import { NextRequest, NextResponse } from 'next/server'
import { calculateBtcRealizedPnL } from '@/lib/pnl-helpers'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

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
