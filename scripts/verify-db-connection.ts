#!/usr/bin/env tsx

/**
 * Database Connection Verification Script
 * 
 * Tests connection to the configured database (SQLite or Supabase)
 * Usage: tsx scripts/verify-db-connection.ts
 */

import { db } from '../src/lib/db'

async function verifyConnection() {
    const dbUrl = process.env.DATABASE_URL || ''
    const isSQLite = dbUrl.startsWith('file:')
    const isPostgres = dbUrl.startsWith('postgresql://')

    console.log('🔍 Database Connection Verification\n')
    console.log(`📊 Database Type: ${isSQLite ? 'SQLite' : isPostgres ? 'PostgreSQL (Supabase)' : 'Unknown'}`)
    console.log(`🔗 Connection URL: ${dbUrl.replace(/:[^@]+@/, ':***@')}\n`) // Hide password

    try {
        // Test connection
        console.log('⏳ Testing connection...')
        await db.$connect()
        console.log('✅ Connection successful!\n')

        // Test queries
        console.log('⏳ Testing database queries...')

        const fundCount = await db.fund.count()
        const accountCount = await db.account.count()
        const transactionCount = await db.transaction.count()

        console.log('✅ Queries successful!\n')

        console.log('📊 Database Statistics:')
        console.log(`   - Funds: ${fundCount}`)
        console.log(`   - Accounts: ${accountCount}`)
        console.log(`   - Transactions: ${transactionCount}\n`)

        // Check if empty
        if (fundCount === 0) {
            console.log('💡 Tip: Database is empty. Run the app to initialize, or use:')
            console.log('   curl http://localhost:3000/api/init -X POST\n')
        }

        console.log('🎉 Database is ready to use!')

    } catch (error) {
        console.error('❌ Connection failed!\n')
        console.error('Error details:', error)

        if (isPostgres) {
            console.error('\n💡 Troubleshooting for Supabase:')
            console.error('   1. Check your connection string in .env')
            console.error('   2. Verify password is correct')
            console.error('   3. Run: npm run db:generate')
            console.error('   4. Run: npm run db:push')
            console.error('   5. See: docs/SUPABASE_SETUP.md\n')
        } else if (isSQLite) {
            console.error('\n💡 Troubleshooting for SQLite:')
            console.error('   1. Run: npm run db:push')
            console.error('   2. Check if prisma/dev.db exists\n')
        }

        throw error
    } finally {
        await db.$disconnect()
    }
}

// Run verification
verifyConnection()
    .then(() => {
        console.log('\n✨ Verification complete!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Verification failed!')
        process.exit(1)
    })
