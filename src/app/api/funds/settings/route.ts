import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculateFund } from '@/lib/fund-calculator'

/**
 * PUT /api/funds/settings
 * 
 * Update fund settings (e.g., earnInterestMethod)
 * Triggers recalculation after update
 */
export async function PUT(request: NextRequest) {
    try {
        const { fundId, earnInterestMethod } = await request.json()

        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required' },
                { status: 400 }
            )
        }

        if (earnInterestMethod && !['reduce_avg_price', 'keep_avg_price'].includes(earnInterestMethod)) {
            return NextResponse.json(
                { error: 'Invalid earnInterestMethod. Must be "reduce_avg_price" or "keep_avg_price"' },
                { status: 400 }
            )
        }

        // Update fund settings
        const fund = await db.fund.update({
            where: { id: fundId },
            data: {
                ...(earnInterestMethod && { earnInterestMethod })
            }
        })

        // ⚠️ QUAN TRỌNG: Recalculate toàn bộ quỹ với setting mới
        // Điều này sẽ tính lại tất cả transactions với phương pháp mới
        await recalculateFund(fundId)

        return NextResponse.json({
            success: true,
            fund,
            message: 'Settings updated and fund recalculated successfully'
        })

    } catch (error) {
        console.error('Error updating fund settings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
