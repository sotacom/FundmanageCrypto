import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculateFund } from '@/lib/fund-calculator'
import { getCurrentUser, checkFundAccess } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fundId, transactions } = await request.json()

    if (!fundId) {
      return NextResponse.json({ error: 'Fund ID is required' }, { status: 400 })
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Transactions array is required and must not be empty' }, { status: 400 })
    }

    if (transactions.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 transactions per import' }, { status: 400 })
    }

    // Check fund access (need editor role)
    const access = await checkFundAccess(user.id, fundId, 'editor')
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền tạo giao dịch trong quỹ này' },
        { status: 403 }
      )
    }

    const validTypes = [
      'capital_in', 'capital_out', 'buy_usdt', 'sell_usdt', 'transfer_usdt',
      'buy_btc', 'sell_btc', 'transfer_btc', 'earn_interest', 'futures_pnl'
    ]

    // Validate all transactions before inserting
    const errors: string[] = []
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]
      const row = i + 1

      if (!tx.type || !validTypes.includes(tx.type)) {
        errors.push(`Hàng ${row}: Loại giao dịch không hợp lệ: "${tx.type}"`)
      }

      if (tx.amount === undefined || tx.amount === null || isNaN(tx.amount)) {
        errors.push(`Hàng ${row}: Số lượng không hợp lệ`)
      }

      // futures_pnl allows negative amount (loss)
      if (tx.type !== 'futures_pnl' && tx.amount <= 0) {
        errors.push(`Hàng ${row}: Số lượng phải lớn hơn 0`)
      }

      if (!tx.transactionDate) {
        errors.push(`Hàng ${row}: Ngày giao dịch không hợp lệ`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Bulk insert all transactions
    let imported = 0
    for (const tx of transactions) {
      await db.transaction.create({
        data: {
          fundId,
          accountId: tx.accountId || null,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency || 'USDT',
          price: tx.price || null,
          fee: tx.fee || null,
          feeCurrency: tx.feeCurrency || null,
          fromLocation: tx.fromLocation || null,
          toLocation: tx.toLocation || null,
          note: tx.note || null,
          createdAt: new Date(tx.transactionDate)
        }
      })
      imported++
    }

    // Recalculate fund state ONCE after all inserts
    await recalculateFund(fundId)

    return NextResponse.json({
      success: true,
      imported,
      message: `Đã import thành công ${imported} giao dịch`
    })

  } catch (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json(
      { error: 'Lỗi server khi import giao dịch' },
      { status: 500 }
    )
  }
}
