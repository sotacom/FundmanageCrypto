import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fundId, currentPrices } = await request.json()

    if (!fundId) {
      return NextResponse.json(
        { error: 'Fund ID is required' },
        { status: 400 }
      )
    }

    // Lấy thông tin quỹ
    const fund = await db.fund.findUnique({
      where: { id: fundId },
      include: {
        assetHoldings: true,
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    // Lấy số dư hiện tại của từng tài sản
    const holdings = fund.assetHoldings.reduce((acc, holding) => {
      acc[holding.asset] = (acc[holding.asset] || 0) + holding.amount
      return acc
    }, {} as Record<string, number>)

    const vndCash = holdings['VND'] || 0
    const usdtBalance = holdings['USDT'] || 0
    const btcBalance = holdings['BTC'] || 0

    // Giá hiện tại (mặc định nếu không cung cấp)
    const usdtVndPrice = currentPrices?.usdtVnd || 25500
    const btcUsdtPrice = currentPrices?.btcUsdt || 43000

    // Tính NAV theo VND
    const navVnd = vndCash + (usdtBalance * usdtVndPrice) + (btcBalance * btcUsdtPrice * usdtVndPrice)

    // Tính NAV theo USDT
    const navUsdt = (vndCash / usdtVndPrice) + usdtBalance + (btcBalance * btcUsdtPrice)

    // Tính uPNL (chưa hiện thực)
    const unrealizedPnLVnd = navVnd - fund.initialVnd
    const unrealizedPnLPercentage = fund.initialVnd > 0 ? (unrealizedPnLVnd / fund.initialVnd) * 100 : 0

    // Tính PnL đã hiện thực
    const realizedPnL = await calculateRealizedPnL(fundId)

    // Lấy giá mua trung bình
    const avgUsdtPrice = await getAveragePrice(fundId, 'USDT')
    const avgBtcPrice = await getAveragePrice(fundId, 'BTC')

    return NextResponse.json({
      fund: {
        id: fund.id,
        name: fund.name,
        initialVnd: fund.initialVnd
      },
      holdings: {
        vnd: vndCash,
        usdt: usdtBalance,
        btc: btcBalance
      },
      currentNav: {
        vnd: navVnd,
        usdt: navUsdt
      },
      unrealizedPnL: {
        vnd: unrealizedPnLVnd,
        usdt: unrealizedPnLVnd / usdtVndPrice,
        percentage: unrealizedPnLPercentage
      },
      realizedPnL,
      avgPrices: {
        usdtPerVnd: avgUsdtPrice,
        btcPerUsdt: avgBtcPrice
      },
      currentPrices: {
        usdtVnd: usdtVndPrice,
        btcUsdt: btcUsdtPrice
      }
    })

  } catch (error) {
    console.error('Error calculating NAV:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fundId = searchParams.get('fundId')
  const usdtVndPrice = searchParams.get('usdtVndPrice')
  const btcUsdtPrice = searchParams.get('btcUsdtPrice')

  if (!fundId) {
    return NextResponse.json(
      { error: 'Fund ID is required' },
      { status: 400 }
    )
  }

  return POST(new NextRequest('http://localhost', {
    method: 'POST',
    body: JSON.stringify({
      fundId,
      currentPrices: {
        usdtVnd: usdtVndPrice ? parseFloat(usdtVndPrice) : undefined,
        btcUsdt: btcUsdtPrice ? parseFloat(btcUsdtPrice) : undefined
      }
    })
  }))
}

async function calculateRealizedPnL(fundId: string) {
  const transactions = await db.transaction.findMany({
    where: {
      fundId,
      realizedPnL: { not: null }
    }
  })

  let realizedPnLUsdt = 0
  let realizedPnLVnd = 0

  for (const tx of transactions) {
    if (tx.type === 'sell_usdt') {
      realizedPnLVnd += tx.realizedPnL || 0
    } else if (tx.type === 'sell_btc') {
      realizedPnLUsdt += tx.realizedPnL || 0
    }
  }

  return {
    vnd: realizedPnLVnd,
    usdt: realizedPnLUsdt
  }
}

async function getAveragePrice(fundId: string, asset: string): Promise<number> {
  const buyTransactions = await db.transaction.findMany({
    where: {
      fundId,
      type: asset === 'BTC' ? 'buy_btc' : 'buy_usdt',
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  if (buyTransactions.length === 0) return 0

  let totalAmount = 0
  let totalCost = 0

  for (const transaction of buyTransactions) {
    totalAmount += transaction.amount
    totalCost += transaction.amount * (transaction.price || 0)
  }

  return totalAmount > 0 ? totalCost / totalAmount : 0
}