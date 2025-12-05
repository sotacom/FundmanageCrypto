#!/usr/bin/env tsx

/**
 * Migration Script: SQLite → Supabase (PostgreSQL)
 * 
 * This script migrates all data from SQLite database to Supabase PostgreSQL.
 * 
 * Usage:
 *   1. Ensure SQLite database exists at prisma/dev.db
 *   2. Set SUPABASE_URL in .env to your Supabase connection string
 *   3. Run: npm run db:migrate:supabase
 * 
 * The script will:
 *   - Read all data from SQLite
 *   - Connect to Supabase
 *   - Migrate data preserving IDs and relationships
 *   - Verify data integrity
 */

import { PrismaClient as SQLitePrismaClient } from '@prisma/client'

// Read SQLite data
console.log('📖 Reading data from SQLite...')
const sqliteDb = new SQLitePrismaClient({
    datasources: {
        db: {
            url: 'file:./prisma/dev.db'
        }
    }
})

// Read Supabase connection from env
const supabaseUrl = process.env.DATABASE_URL

if (!supabaseUrl || !supabaseUrl.startsWith('postgresql://')) {
    console.error('❌ Error: DATABASE_URL must be set to a PostgreSQL connection string')
    console.error('   Example: DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"')
    process.exit(1)
}

// Connect to Supabase
console.log('🔗 Connecting to Supabase...')
const { PrismaClient: PostgresPrismaClient } = await import('@prisma/client')
const supabaseDb = new PostgresPrismaClient()

async function migrate() {
    try {
        // Test connections
        await sqliteDb.$connect()
        await supabaseDb.$connect()
        console.log('✅ Connections established\n')

        // Read all data from SQLite
        console.log('📊 Fetching SQLite data...')
        const funds = await sqliteDb.fund.findMany()
        const accounts = await sqliteDb.account.findMany()
        const transactions = await sqliteDb.transaction.findMany()
        const assetHoldings = await sqliteDb.assetHolding.findMany()
        const fees = await sqliteDb.fee.findMany()

        console.log(`   Found:`)
        console.log(`   - ${funds.length} Funds`)
        console.log(`   - ${accounts.length} Accounts`)
        console.log(`   - ${transactions.length} Transactions`)
        console.log(`   - ${assetHoldings.length} Asset Holdings`)
        console.log(`   - ${fees.length} Fees\n`)

        if (funds.length === 0) {
            console.log('⚠️  No data found in SQLite database. Nothing to migrate.')
            return
        }

        // Migrate Funds
        console.log('📤 Migrating Funds...')
        for (const fund of funds) {
            await supabaseDb.fund.create({
                data: fund
            })
            console.log(`   ✓ ${fund.name}`)
        }

        // Migrate Accounts
        console.log('📤 Migrating Accounts...')
        for (const account of accounts) {
            await supabaseDb.account.create({
                data: account
            })
            console.log(`   ✓ ${account.name}`)
        }

        // Migrate Transactions
        console.log('📤 Migrating Transactions...')
        for (const transaction of transactions) {
            await supabaseDb.transaction.create({
                data: transaction
            })
        }
        console.log(`   ✓ ${transactions.length} transactions`)

        // Migrate Asset Holdings
        console.log('📤 Migrating Asset Holdings...')
        for (const holding of assetHoldings) {
            await supabaseDb.assetHolding.create({
                data: holding
            })
        }
        console.log(`   ✓ ${assetHoldings.length} holdings`)

        // Migrate Fees
        console.log('📤 Migrating Fees...')
        for (const fee of fees) {
            await supabaseDb.fee.create({
                data: fee
            })
        }
        console.log(`   ✓ ${fees.length} fees\n`)

        // Verify migration
        console.log('🔍 Verifying migration...')
        const verifyFunds = await supabaseDb.fund.count()
        const verifyAccounts = await supabaseDb.account.count()
        const verifyTransactions = await supabaseDb.transaction.count()
        const verifyHoldings = await supabaseDb.assetHolding.count()
        const verifyFees = await supabaseDb.fee.count()

        const success =
            verifyFunds === funds.length &&
            verifyAccounts === accounts.length &&
            verifyTransactions === transactions.length &&
            verifyHoldings === assetHoldings.length &&
            verifyFees === fees.length

        if (success) {
            console.log('✅ Migration completed successfully!')
            console.log('\n📊 Summary:')
            console.log(`   Funds:        ${verifyFunds}`)
            console.log(`   Accounts:     ${verifyAccounts}`)
            console.log(`   Transactions: ${verifyTransactions}`)
            console.log(`   Holdings:     ${verifyHoldings}`)
            console.log(`   Fees:         ${verifyFees}`)
            console.log('\n🎉 All data migrated to Supabase!')
        } else {
            console.error('❌ Verification failed! Data count mismatch.')
            console.error(`   Expected: Funds=${funds.length}, Accounts=${accounts.length}, Transactions=${transactions.length}`)
            console.error(`   Got:      Funds=${verifyFunds}, Accounts=${verifyAccounts}, Transactions=${verifyTransactions}`)
        }

    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    } finally {
        await sqliteDb.$disconnect()
        await supabaseDb.$disconnect()
    }
}

// Run migration
migrate()
    .then(() => {
        console.log('\n✨ Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Migration failed with error:', error)
        process.exit(1)
    })
