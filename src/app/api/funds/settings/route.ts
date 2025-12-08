import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculateFund } from '@/lib/fund-calculator'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

/**
 * PUT /api/funds/settings
 * 
 * Update fund settings (name, description, timezone, earnInterestMethod)
 * Triggers recalculation after earnInterestMethod change
 * Requires owner role
 */
export async function PUT(request: NextRequest) {
    try {
        // Check authentication
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fundId, name, description, timezone, earnInterestMethod } = await request.json()

        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required' },
                { status: 400 }
            )
        }

        // Check fund access (need owner role to change settings)
        const access = await checkFundAccess(user.id, fundId, 'owner')
        if (!access.hasAccess) {
            return NextResponse.json(
                { error: 'Chỉ chủ sở hữu quỹ mới có thể thay đổi cài đặt' },
                { status: 403 }
            )
        }

        if (earnInterestMethod && !['reduce_avg_price', 'keep_avg_price'].includes(earnInterestMethod)) {
            return NextResponse.json(
                { error: 'Invalid earnInterestMethod. Must be "reduce_avg_price" or "keep_avg_price"' },
                { status: 400 }
            )
        }

        // Build update data
        const updateData: Record<string, unknown> = {}
        if (name !== undefined && name.trim()) {
            updateData.name = name.trim()
        }
        if (description !== undefined) {
            updateData.description = description?.trim() || null
        }
        if (timezone) {
            updateData.timezone = timezone
        }
        if (earnInterestMethod) {
            updateData.earnInterestMethod = earnInterestMethod
        }

        // Update fund settings
        const fund = await db.fund.update({
            where: { id: fundId },
            data: updateData
        })

        // Only recalculate if earnInterestMethod changed
        if (earnInterestMethod) {
            await recalculateFund(fundId)
        }

        return NextResponse.json({
            success: true,
            fund,
            message: earnInterestMethod
                ? 'Settings updated and fund recalculated successfully'
                : 'Fund settings updated successfully'
        })

    } catch (error) {
        console.error('Error updating fund settings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
