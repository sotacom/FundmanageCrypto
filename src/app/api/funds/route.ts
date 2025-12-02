import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, description, initialVnd } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      )
    }

    const fund = await db.fund.create({
      data: {
        name,
        description: description || null,
        initialVnd: initialVnd || 0
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
    const funds = await db.fund.findMany({
      include: {
        assetHoldings: true,
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      funds
    })

  } catch (error) {
    console.error('Error fetching funds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}