import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculateFund } from '@/lib/fund-calculator'

export async function POST(request: NextRequest) {
  try {
    const transactionData = await request.json()

    const {
      fundId,
      accountId,
      type,
      amount,
      currency,
      price,
      fee,
      feeCurrency,
      fromLocation,
      toLocation,
      note
    } = transactionData

    // Validate required fields
    if (!fundId || !type || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: fundId, type, amount, currency' },
        { status: 400 }
      )
    }

    // Balance validation - check if source account has sufficient balance
    if (['transfer_usdt', 'transfer_btc', 'sell_usdt', 'sell_btc', 'buy_btc'].includes(type)) {
      const sourceAccountId = fromLocation // fromLocation now contains accountId

      if (sourceAccountId) {
        // Get current holdings for this account
        const holdings = await db.assetHolding.findMany({
          where: {
            fundId,
            accountId: sourceAccountId
          }
        })

        // Determine which asset to check
        let assetToCheck = ''
        let requiredAmount = amount

        if (type === 'transfer_usdt' || type === 'sell_usdt') {
          assetToCheck = 'USDT'
        } else if (type === 'transfer_btc' || type === 'sell_btc') {
          assetToCheck = 'BTC'
        } else if (type === 'buy_btc') {
          assetToCheck = 'USDT'
          requiredAmount = amount * (price || 0) + (feeCurrency === 'USDT' ? (fee || 0) : 0)
        }

        const holding = holdings.find(h => h.asset === assetToCheck)
        const currentBalance = holding?.amount || 0

        if (currentBalance < requiredAmount) {
          return NextResponse.json(
            {
              error: `Số dư ${assetToCheck} không đủ. Có sẵn: ${currentBalance.toLocaleString('vi-VN', {
                minimumFractionDigits: assetToCheck === 'BTC' ? 8 : 2,
                maximumFractionDigits: assetToCheck === 'BTC' ? 8 : 2
              })}, Cần: ${requiredAmount.toLocaleString('vi-VN', {
                minimumFractionDigits: assetToCheck === 'BTC' ? 8 : 2,
                maximumFractionDigits: assetToCheck === 'BTC' ? 8 : 2
              })}`
            },
            { status: 400 }
          )
        }
      }
    }

    // VND balance validation for buy_usdt
    if (type === 'buy_usdt') {
      const vndHoldings = await db.assetHolding.findFirst({
        where: {
          fundId,
          asset: 'VND'
        }
      })

      const vndBalance = vndHoldings?.amount || 0
      const vndRequired = amount * (price || 0) + (feeCurrency === 'VND' ? (fee || 0) : 0)

      if (vndBalance < vndRequired) {
        return NextResponse.json(
          {
            error: `Số dư VND không đủ. Có sẵn: ${vndBalance.toLocaleString('vi-VN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })} VND, Cần: ${vndRequired.toLocaleString('vi-VN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })} VND`
          },
          { status: 400 }
        )
      }
    }

    // Prevent transfer to same account
    if (['transfer_usdt', 'transfer_btc'].includes(type) && fromLocation && toLocation && fromLocation === toLocation) {
      return NextResponse.json(
        { error: 'Không thể chuyển đến cùng tài khoản. Vui lòng chọn tài khoản đích khác' },
        { status: 400 }
      )
    }

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        fundId,
        accountId: accountId || null,
        type,
        amount,
        currency,
        price: price || null,
        fee: fee || null,
        feeCurrency: feeCurrency || null,
        fromLocation: fromLocation || null,
        toLocation: toLocation || null,
        note: note || null
      }
    })

    // Recalculate fund state
    await recalculateFund(fundId)

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction created successfully'
    })

  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const transactionData = await request.json()

    const {
      id,
      fundId,
      accountId,
      type,
      amount,
      currency,
      price,
      fee,
      feeCurrency,
      fromLocation,
      toLocation,
      note
    } = transactionData

    if (!id || !fundId) {
      return NextResponse.json(
        { error: 'Transaction ID and Fund ID are required' },
        { status: 400 }
      )
    }

    // Update transaction
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        accountId: accountId || null,
        type,
        amount,
        currency,
        price: price || null,
        fee: fee || null,
        feeCurrency: feeCurrency || null,
        fromLocation: fromLocation || null,
        toLocation: toLocation || null,
        note: note || null
      }
    })

    // Recalculate fund state
    await recalculateFund(fundId)

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction updated successfully'
    })

  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const fundId = searchParams.get('fundId')

    if (!id || !fundId) {
      return NextResponse.json(
        { error: 'Transaction ID and Fund ID are required' },
        { status: 400 }
      )
    }

    // Delete transaction
    await db.transaction.delete({
      where: { id }
    })

    // Recalculate fund state
    await recalculateFund(fundId)

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!fundId) {
      return NextResponse.json(
        { error: 'Fund ID is required' },
        { status: 400 }
      )
    }

    const transactions = await db.transaction.findMany({
      where: { fundId },
      include: {
        account: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await db.transaction.count({
      where: { fundId }
    })

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}