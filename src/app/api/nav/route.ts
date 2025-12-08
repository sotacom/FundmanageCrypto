import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentPrices } from '@/lib/binance-price-service'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fundId, currentPrices } = await request.json()

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

    // Lấy giá hiện tại - ưu tiên từ params, nếu không có thì fetch từ Binance
    let usdtVndPrice = currentPrices?.usdtVnd
    let btcUsdtPrice = currentPrices?.btcUsdt

    if (!usdtVndPrice || !btcUsdtPrice) {
      const livePrices = await getCurrentPrices()
      usdtVndPrice = usdtVndPrice || livePrices.usdtVnd
      btcUsdtPrice = btcUsdtPrice || livePrices.btcUsdt
    }

    // Tính NAV theo VND
    const navVnd = vndCash + (usdtBalance * usdtVndPrice) + (btcBalance * btcUsdtPrice * usdtVndPrice)

    // Tính NAV theo USDT
    const navUsdt = (vndCash / usdtVndPrice) + usdtBalance + (btcBalance * btcUsdtPrice)

    // Tính uPNL (chưa hiện thực)
    const unrealizedPnLVnd = navVnd - fund.initialVnd
    const unrealizedPnLPercentage = fund.initialVnd > 0 ? (unrealizedPnLVnd / fund.initialVnd) * 100 : 0

    // Tính PnL đã hiện thực
    const realizedPnL = await calculateRealizedPnL(fundId)

    // Lấy thông tin metrics
    const usdtMetrics = await getAssetMetrics(fundId, 'USDT')
    const btcMetrics = await getAssetMetrics(fundId, 'BTC')

    return NextResponse.json({
      fund: {
        id: fund.id,
        name: fund.name,
        earnInterestMethod: fund.earnInterestMethod,
        // Equity breakdown
        equity: {
          initialCapital: fund.initialCapital,
          additionalCapital: fund.additionalCapital,
          withdrawnCapital: fund.withdrawnCapital,
          totalCapital: fund.initialCapital + fund.additionalCapital - fund.withdrawnCapital,
          retainedEarnings: fund.retainedEarnings,
          totalEquity: fund.initialCapital + fund.additionalCapital - fund.withdrawnCapital + fund.retainedEarnings
        }
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
        usdt: usdtMetrics,
        btc: btcMetrics
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
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Check fund access (need at least viewer role)
    const access = await checkFundAccess(user.id, fundId, 'viewer')
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập quỹ này' },
        { status: 403 }
      )
    }

    // Create a mock request for the POST handler
    const mockRequest = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        fundId,
        currentPrices: {
          usdtVnd: usdtVndPrice ? parseFloat(usdtVndPrice) : undefined,
          btcUsdt: btcUsdtPrice ? parseFloat(btcUsdtPrice) : undefined
        }
      })
    })

    return POST(mockRequest)
  } catch (error) {
    console.error('Error in GET nav:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

async function getAssetMetrics(fundId: string, asset: string) {
  // Get buy transactions
  const buyTransactions = await db.transaction.findMany({
    where: {
      fundId,
      type: asset === 'BTC' ? 'buy_btc' : 'buy_usdt',
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  // Get earn interest transactions (only for USDT currently)
  const earnTransactions = await db.transaction.findMany({
    where: {
      fundId,
      type: 'earn_interest',
      currency: asset
    }
  })

  let totalAmount = 0
  let totalCost = 0
  let totalEarn = 0

  for (const transaction of buyTransactions) {
    totalAmount += transaction.amount
    totalCost += transaction.amount * (transaction.price || 0)
  }

  for (const transaction of earnTransactions) {
    totalEarn += transaction.amount
  }

  // ✨ Get avgPrice from AssetHolding (calculated by fund-calculator with earnInterestMethod)
  const assetHolding = await db.assetHolding.findFirst({
    where: {
      fundId,
      asset
    }
  })

  // Use avgPrice from database (respects earnInterestMethod) 
  const avgPrice = assetHolding?.avgPrice || 0

  return {
    avgPrice, // ← This now comes from fund-calculator!
    totalBought: totalAmount,
    totalSpent: totalCost,
    totalEarn
  }
}