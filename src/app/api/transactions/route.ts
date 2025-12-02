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