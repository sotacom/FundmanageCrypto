import { NextRequest, NextResponse } from 'next/server'
import { recalculateFund } from '@/lib/fund-calculator'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { fundId } = body

        if (!fundId) {
            return NextResponse.json({ error: 'Fund ID is required' }, { status: 400 })
        }

        // Check access (owner or editor can trigger recalc)
        const access = await checkFundAccess(user.id, fundId, 'editor')
        if (!access.hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await recalculateFund(fundId)

        return NextResponse.json({ success: true, message: 'Recalculation complete' })
    } catch (error) {
        console.error('Error recalculating fund:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
