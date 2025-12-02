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

    // Tạo quỹ mẫu
    const fund = await db.fund.create({
      data: {
        name: 'Quỹ Đầu Tư Cá Nhân',
        description: 'Quỹ đầu tư cá nhân demo',
        initialVnd: 100000000 // 100 triệu VND
      }
    })

    // Tạo các tài khoản
    const binanceAccount = await db.account.create({
      data: {
        fundId: fund.id,
        name: 'Binance Spot',
        type: 'binance',
        platform: 'binance',
        isActive: true
      }
    })

    const earnAccount = await db.account.create({
      data: {
        fundId: fund.id,
        name: 'Binance Earn',
        type: 'earn',
        platform: 'binance',
        isActive: true
      }
    })

    const coldWallet = await db.account.create({
      data: {
        fundId: fund.id,
        name: 'Ví lạnh 1',
        type: 'cold_wallet',
        platform: 'trust_wallet',
        isActive: true
      }
    })

    // Tạo các holding ban đầu
    await db.assetHolding.create({
      data: {
        fundId: fund.id,
        asset: 'VND',
        amount: 100000000 // Vốn ban đầu
      }
    })

    // Ghi nhận giao dịch góp vốn ban đầu
    await db.transaction.create({
      data: {
        fundId: fund.id,
        type: 'capital_in',
        amount: 100000000,
        currency: 'VND',
        note: 'Vốn ban đầu khi tạo quỹ'
      }
    })

    // Tạo các giao dịch mẫu
    const transactions = [
      // Mua USDT
      {
        fundId: fund.id,
        accountId: binanceAccount.id,
        type: 'buy_usdt',
        amount: 2000,
        currency: 'USDT',
        price: 25500,
        note: 'Mua USDT qua Binance P2P'
      },
      // Mua BTC
      {
        fundId: fund.id,
        accountId: binanceAccount.id,
        type: 'buy_btc',
        amount: 0.03,
        currency: 'BTC',
        price: 43000,
        fee: 0.00003,
        feeCurrency: 'BTC',
        note: 'Mua BTC spot'
      },
      // Chuyển USDT sang Earn
      {
        fundId: fund.id,
        type: 'transfer_usdt',
        amount: 1000,
        currency: 'USDT',
        fromLocation: 'Binance Spot',
        toLocation: 'Binance Earn',
        note: 'Chuyển USDT sang Earn để hưởng lãi'
      },
      // Lãi suất từ Earn
      {
        fundId: fund.id,
        accountId: earnAccount.id,
        type: 'earn_interest',
        amount: 50,
        currency: 'USDT',
        note: 'Lãi suất USDT Earn tháng 1'
      }
    ]

    for (const tx of transactions) {
      await db.transaction.create({ data: tx })
    }

    // Cập nhật holdings sau các giao dịch
    await db.assetHolding.updateMany({
      where: { fundId: fund.id, asset: 'VND' },
      data: { amount: 49000000 } // 100M - 2000*25500 = 49M
    })

    await db.assetHolding.create({
      data: {
        fundId: fund.id,
        accountId: binanceAccount.id,
        asset: 'USDT',
        amount: 1000, // 2000 - 1000 chuyển đi
        location: 'Binance Spot'
      }
    })

    await db.assetHolding.create({
      data: {
        fundId: fund.id,
        accountId: earnAccount.id,
        asset: 'USDT',
        amount: 1050, // 1000 + 50 lãi
        location: 'Binance Earn'
      }
    })

    await db.assetHolding.create({
      data: {
        fundId: fund.id,
        accountId: binanceAccount.id,
        asset: 'BTC',
        amount: 0.02997, // 0.03 - 0.00003 fee
        location: 'Binance Spot'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Demo data initialized successfully',
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