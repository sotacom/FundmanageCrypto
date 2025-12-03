import { db } from './src/lib/db'

async function main() {
    console.log('Resetting database...')

    // Delete in order of foreign key constraints (if any, though Prisma handles cascade usually, but explicit is safer)
    await db.fee.deleteMany({})
    await db.assetHolding.deleteMany({})
    await db.transaction.deleteMany({})
    await db.account.deleteMany({})
    await db.fund.deleteMany({})

    console.log('Database reset complete.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await db.$disconnect()
    })
