import { db } from '../src/lib/db'

/**
 * Data Migration: Populate new equity fields from existing data
 * 
 * This script:
 * 1. Copies initialVnd → initialCapital for all funds
 * 2. Calculates retainedEarnings from current NAV - initialCapital
 */

async function migrateEquityData() {
    console.log('🔄 Starting equity data migration...')

    const funds = await db.fund.findMany({
        include: {
            assetHoldings: true,
            transactions: true
        }
    })

    for (const fund of funds) {
        console.log(`\n📊 Processing fund: ${fund.name} (${fund.id})`)

        // Step 1: Copy initialVnd → initialCapital
        const initialCapital = fund.initialVnd
        console.log(`  ├─ Initial capital: ${initialCapital.toLocaleString()} VND`)

        // Step 2: Determine additional capital from capital_in transactions
        const capitalInTransactions = fund.transactions.filter(
            tx => tx.type === 'capital_in'
        )

        // First capital_in is initial, rest are additional
        const additionalCapital = capitalInTransactions.length > 1
            ? capitalInTransactions.slice(1).reduce((sum, tx) => sum + tx.amount, 0)
            : 0
        console.log(`  ├─ Additional capital: ${additionalCapital.toLocaleString()} VND`)

        // Step 3: Calculate withdrawn capital from capital_out transactions
        const withdrawnCapital = fund.transactions
            .filter(tx => tx.type === 'capital_out')
            .reduce((sum, tx) => sum + tx.amount, 0)
        console.log(`  ├─ Withdrawn capital: ${withdrawnCapital.toLocaleString()} VND`)

        // Step 4: Calculate current NAV
        const vndHolding = fund.assetHoldings.find(h => h.asset === 'VND')?.amount || 0
        const usdtHolding = fund.assetHoldings.find(h => h.asset === 'USDT')?.amount || 0
        const btcHolding = fund.assetHoldings.find(h => h.asset === 'BTC')?.amount || 0

        // For migration, assume current prices (you may want to fetch real prices)
        const usdtVndPrice = 27000 // Approximate
        const btcUsdtPrice = 93000  // Approximate

        const currentNav = vndHolding + (usdtHolding * usdtVndPrice) + (btcHolding * btcUsdtPrice * usdtVndPrice)
        console.log(`  ├─ Current NAV: ${currentNav.toLocaleString()} VND`)

        // Step 5: Calculate retained earnings
        const totalCapital = initialCapital + additionalCapital - withdrawnCapital
        const retainedEarnings = currentNav - totalCapital
        console.log(`  ├─ Total capital: ${totalCapital.toLocaleString()} VND`)
        console.log(`  └─ Retained earnings: ${retainedEarnings.toLocaleString()} VND`)

        // Step 6: Update fund
        await db.fund.update({
            where: { id: fund.id },
            data: {
                initialCapital,
                additionalCapital,
                withdrawnCapital,
                retainedEarnings
            }
        })

        console.log(`  ✅ Updated fund ${fund.name}`)
    }

    console.log('\n🎉 Migration completed successfully!')
}

// Run migration
migrateEquityData()
    .catch(error => {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
