import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Check if fund already exists
    const existingFund = await db.fund.findFirst()

    if (existingFund) {
      return NextResponse.json({
        success: true,
        message: 'Fund already exists',
        fundId: existingFund.id,
        fund: existingFund
      })
    }

    // Tạo quỹ mẫu (Empty)
    const fund = await db.fund.create({
      data: {
        name: 'Quỹ Đầu Tư Cá Nhân',
        description: 'Quỹ đầu tư cá nhân',
        initialVnd: 0
      }
    })

    // Tạo các tài khoản mặc định (Empty)
    // We can keep these or remove them. Let's keep them as basic setup but without balances.
    await db.account.create({
      data: {
        fundId: fund.id,
        name: 'Binance Spot',
        type: 'binance',
        platform: 'binance',
        isActive: true
      }
    })

    await db.account.create({
      data: {
        fundId: fund.id,
        name: 'Binance Earn',
        type: 'earn',
        platform: 'binance',
        isActive: true
      }
    })

    await db.account.create({
      data: {
        fundId: fund.id,
        name: 'Ví lạnh 1',
        type: 'cold_wallet',
        platform: 'trust_wallet',
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Empty fund initialized successfully',
      fundId: fund.id,
      fund: fund
    })

  } catch (error) {
    console.error('Error initializing demo data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}