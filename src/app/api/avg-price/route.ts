import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fundId, asset } = await request.json()

    if (!fundId || !asset) {
      return NextResponse.json(
        { error: 'Fund ID and asset are required' },
        { status: 400 }
      )
    }

    // Lấy tất cả các giao dịch mua cho asset cụ thể
    const buyTransactions = await db.transaction.findMany({
      where: {
        fundId,
        type: asset === 'BTC' ? 'buy_btc' : 'buy_usdt',
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (buyTransactions.length === 0) {
      return NextResponse.json({
        avgPrice: 0,
        totalAmount: 0,
        totalCost: 0
      })
    }

    // Tính giá mua trung bình theo bình quân gia quyền
    let totalAmount = 0
    let totalCost = 0

    for (const transaction of buyTransactions) {
      const amount = transaction.amount
      const price = transaction.price || 0
      
      totalAmount += amount
      totalCost += amount * price
    }

    const avgPrice = totalAmount > 0 ? totalCost / totalAmount : 0

    return NextResponse.json({
      avgPrice,
      totalAmount,
      totalCost,
      transactionCount: buyTransactions.length
    })

  } catch (error) {
    console.error('Error calculating average price:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fundId = searchParams.get('fundId')
  const asset = searchParams.get('asset')

  if (!fundId || !asset) {
    return NextResponse.json(
      { error: 'Fund ID and asset are required' },
      { status: 400 }
    )
  }

  return POST(new NextRequest('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ fundId, asset })
  }))
}