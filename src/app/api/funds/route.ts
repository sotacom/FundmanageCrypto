import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserFunds, createFundWithOwner, claimOrphanedFund } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, description, initialVnd, timezone } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      )
    }

    // Create fund with current user as owner
    const fund = await db.fund.create({
      data: {
        name,
        description: description || null,
        timezone: timezone || 'Asia/Ho_Chi_Minh',
        initialVnd: initialVnd || 0,
        ownerId: user.id,
      }
    })

    // Create FundMember entry for owner
    await db.fundMember.create({
      data: {
        fundId: fund.id,
        userId: user.id,
        role: 'owner',
      }
    })

    // Tạo holding ban đầu cho VND nếu có vốn ban đầu
    if (initialVnd && initialVnd > 0) {
      await db.assetHolding.create({
        data: {
          fundId: fund.id,
          asset: 'VND',
          amount: initialVnd
        }
      })

      // Ghi nhận giao dịch góp vốn ban đầu
      await db.transaction.create({
        data: {
          fundId: fund.id,
          type: 'capital_in',
          amount: initialVnd,
          currency: 'VND',
          note: 'Vốn ban đầu khi tạo quỹ'
        }
      })
    }

    return NextResponse.json({
      success: true,
      fund,
      message: 'Fund created successfully'
    })

  } catch (error) {
    console.error('Error creating fund:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get funds accessible by this user
    const userFunds = await getUserFunds(user.id)

    // If user has no funds, check for orphaned funds and claim the first one
    if (userFunds.length === 0) {
      const orphanedFunds = await db.fund.findMany({
        where: { ownerId: null },
        take: 1,
      })

      if (orphanedFunds.length > 0) {
        // Claim the first orphaned fund
        await claimOrphanedFund(user.id, orphanedFunds[0].id)
        // Refresh the list
        const updatedFunds = await getUserFunds(user.id)
        return NextResponse.json({
          funds: updatedFunds
        })
      }
    }

    return NextResponse.json({
      funds: userFunds
    })

  } catch (error) {
    console.error('Error fetching funds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}