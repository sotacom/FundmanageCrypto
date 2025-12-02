import { db } from './src/lib/db'
import { recalculateFund } from './src/lib/fund-calculator'

async function main() {
    console.log('Starting verification...')

    // 1. Create a test fund
    const fund = await db.fund.create({
        data: {
            name: 'Test Fund',
            initialVnd: 100000000
        }
    })
    console.log('Created fund:', fund.id)

    // 2. Buy 1 BTC @ 10,000 USDT
    await db.transaction.create({
        data: {
            fundId: fund.id,
            type: 'buy_btc',
            amount: 1,
            currency: 'BTC',
            price: 10000, // USDT
            note: 'Buy 1'
        }
    })
    await recalculateFund(fund.id)

    // 3. Buy 1 BTC @ 20,000 USDT
    await db.transaction.create({
        data: {
            fundId: fund.id,
            type: 'buy_btc',
            amount: 1,
            currency: 'BTC',
            price: 20000, // USDT
            note: 'Buy 2'
        }
    })
    await recalculateFund(fund.id)

    // Check Avg Price (should be 15,000)
    let holding = await db.assetHolding.findFirst({
        where: { fundId: fund.id, asset: 'BTC' }
    })
    console.log('Avg Price after 2 buys (expected 15000):', holding?.avgPrice)

    // 4. Sell 1 BTC @ 30,000 USDT
    const sellTx = await db.transaction.create({
        data: {
            fundId: fund.id,
            type: 'sell_btc',
            amount: 1,
            currency: 'BTC',
            price: 30000,
            note: 'Sell 1'
        }
    })
    await recalculateFund(fund.id)

    // Check Realized PnL (should be 15,000)
    const updatedSellTx = await db.transaction.findUnique({
        where: { id: sellTx.id }
    })
    console.log('Realized PnL (expected 15000):', updatedSellTx?.realizedPnL)

    // 5. Retroactive Insert: Buy 1 BTC @ 5,000 USDT *before* the sell
    // We need to set createdAt to be before the sell.
    // Actually, recalculateFund sorts by createdAt.
    // Let's create a transaction with createdAt = now - 1 hour (assuming previous ones were just created)
    // Wait, previous ones were created just now.
    // I'll update the previous ones to be older, or just make this one older?
    // Let's make the previous ones older.

    // Actually, just create one with a timestamp in the past?
    // But the previous ones have default(now()).
    // I'll explicitly set createdAt for all of them to be safe, or just update the new one to be very old.
    // But wait, if I make it very old (older than Buy 1), it affects the avg price from the start.

    // Let's just insert a Buy @ 5000 with a timestamp older than the Sell but newer than Buy 2?
    // Or just older than everything.
    // Let's insert it as the *first* transaction.

    const oldDate = new Date()
    oldDate.setFullYear(2020)

    await db.transaction.create({
        data: {
            fundId: fund.id,
            type: 'buy_btc',
            amount: 1,
            currency: 'BTC',
            price: 5000,
            createdAt: oldDate,
            note: 'Retroactive Buy'
        }
    })

    console.log('Inserted retroactive buy @ 5000')
    await recalculateFund(fund.id)

    // New Avg Price calculation:
    // Buy 1 @ 5000 (1)
    // Buy 2 @ 10000 (1) -> Avg = 7500, Total 2
    // Buy 3 @ 20000 (1) -> Avg = (15000 + 20000)/3 = 11666.66, Total 3
    // Sell 1 @ 30000. Cost Basis = 11666.66.
    // PnL = 30000 - 11666.66 = 18333.33

    const finalSellTx = await db.transaction.findUnique({
        where: { id: sellTx.id }
    })
    console.log('New Realized PnL (expected ~18333.33):', finalSellTx?.realizedPnL)

    // Cleanup
    await db.transaction.deleteMany({ where: { fundId: fund.id } })
    await db.assetHolding.deleteMany({ where: { fundId: fund.id } })
    await db.fund.delete({ where: { id: fund.id } })
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await db.$disconnect()
    })
