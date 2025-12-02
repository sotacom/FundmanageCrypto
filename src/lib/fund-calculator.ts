import { db } from '@/lib/db'

interface AssetState {
    amount: number
    avgPrice: number
}

interface LocationState {
    [key: string]: number // location -> amount
}

export async function recalculateFund(fundId: string) {
    // 1. Fetch all transactions sorted by date
    const transactions = await db.transaction.findMany({
        where: { fundId },
        orderBy: { createdAt: 'asc' }
    })

    // 2. Initialize state
    const portfolio: Record<string, AssetState> = {} // asset -> { amount, avgPrice }
    const holdings: Record<string, LocationState> = {} // asset -> { location -> amount }

    // Helper to get or init asset state
    const getAssetState = (asset: string): AssetState => {
        if (!portfolio[asset]) {
            portfolio[asset] = { amount: 0, avgPrice: 0 }
        }
        return portfolio[asset]
    }

    // Helper to update location holding
    const updateLocation = (asset: string, location: string | null, change: number) => {
        if (!holdings[asset]) holdings[asset] = {}
        const locKey = location || 'Unassigned'
        holdings[asset][locKey] = (holdings[asset][locKey] || 0) + change
    }

    // 3. Process transactions
    for (const tx of transactions) {
        let costBasis = 0
        let realizedPnL = 0

        // Logic per transaction type
        switch (tx.type) {
            case 'capital_in':
                // Góp vốn: Tăng VND
                updateLocation('VND', null, tx.amount)
                getAssetState('VND').amount += tx.amount
                // VND luôn có giá 1
                getAssetState('VND').avgPrice = 1
                break

            case 'capital_out':
                // Rút vốn: Giảm VND
                updateLocation('VND', null, -tx.amount)
                getAssetState('VND').amount -= tx.amount
                break

            case 'buy_usdt':
                // Mua USDT bằng VND
                // 1. Giảm VND
                updateLocation('VND', null, -(tx.amount * (tx.price || 0)))
                getAssetState('VND').amount -= (tx.amount * (tx.price || 0))

                // 2. Tăng USDT & Tính lại AvgPrice
                const usdtState = getAssetState('USDT')
                const totalUsdtCost = (usdtState.amount * usdtState.avgPrice) + (tx.amount * (tx.price || 0))
                const totalUsdtAmount = usdtState.amount + tx.amount

                usdtState.avgPrice = totalUsdtCost / totalUsdtAmount
                usdtState.amount = totalUsdtAmount

                updateLocation('USDT', tx.toLocation, tx.amount)
                break

            case 'sell_usdt':
                // Bán USDT thu về VND
                // 1. Tính PnL
                const sellUsdtState = getAssetState('USDT')
                costBasis = sellUsdtState.avgPrice
                realizedPnL = (tx.amount * (tx.price || 0)) - (tx.amount * costBasis)

                // 2. Giảm USDT
                sellUsdtState.amount -= tx.amount
                updateLocation('USDT', tx.fromLocation, -tx.amount)

                // 3. Tăng VND
                updateLocation('VND', null, tx.amount * (tx.price || 0))
                getAssetState('VND').amount += (tx.amount * (tx.price || 0))
                break

            case 'buy_btc':
                // Mua BTC bằng USDT
                // 1. Giảm USDT
                updateLocation('USDT', tx.fromLocation, -(tx.amount * (tx.price || 0)))
                getAssetState('USDT').amount -= (tx.amount * (tx.price || 0))

                // 2. Tăng BTC & Tính lại AvgPrice
                const btcState = getAssetState('BTC')
                const totalBtcCost = (btcState.amount * btcState.avgPrice) + (tx.amount * (tx.price || 0))
                const totalBtcAmount = btcState.amount + tx.amount

                btcState.avgPrice = totalBtcCost / totalBtcAmount
                btcState.amount = totalBtcAmount

                updateLocation('BTC', tx.toLocation, tx.amount)
                break

            case 'sell_btc':
                // Bán BTC thu về USDT
                // 1. Tính PnL
                const sellBtcState = getAssetState('BTC')
                costBasis = sellBtcState.avgPrice
                realizedPnL = ((tx.price || 0) - costBasis) * tx.amount // PnL tính theo USDT

                // 2. Giảm BTC
                sellBtcState.amount -= tx.amount
                updateLocation('BTC', tx.fromLocation, -tx.amount)

                // 3. Tăng USDT
                updateLocation('USDT', tx.toLocation, tx.amount * (tx.price || 0))
                getAssetState('USDT').amount += (tx.amount * (tx.price || 0))
                break

            case 'transfer_usdt':
                updateLocation('USDT', tx.fromLocation, -tx.amount)
                updateLocation('USDT', tx.toLocation, tx.amount)
                break

            case 'transfer_btc':
                updateLocation('BTC', tx.fromLocation, -tx.amount)
                updateLocation('BTC', tx.toLocation, tx.amount)
                break

            case 'earn_interest':
                // Lãi suất USDT: Tăng USDT, giá vốn = 0 (hoặc coi như mua giá 0)
                // Cách tính: Coi như mua thêm USDT với giá 0
                const earnState = getAssetState('USDT')
                const earnCost = (earnState.amount * earnState.avgPrice) + (tx.amount * 0)
                const earnAmount = earnState.amount + tx.amount

                earnState.avgPrice = earnCost / earnAmount
                earnState.amount = earnAmount

                updateLocation('USDT', tx.toLocation || tx.fromLocation, tx.amount) // Usually toLocation
                break
        }

        // Update transaction with calculated metrics
        await db.transaction.update({
            where: { id: tx.id },
            data: {
                costBasis: costBasis > 0 ? costBasis : null,
                realizedPnL: realizedPnL !== 0 ? realizedPnL : null
            }
        })
    }

    // 4. Update Database State

    // Clear old holdings
    await db.assetHolding.deleteMany({
        where: { fundId }
    })

    // Create new holdings
    for (const [asset, locs] of Object.entries(holdings)) {
        for (const [location, amount] of Object.entries(locs)) {
            // Skip if amount is negligible (floating point errors)
            if (Math.abs(amount) < 0.00000001) continue

            // Find avgPrice for this asset
            const avgPrice = portfolio[asset]?.avgPrice || 0

            await db.assetHolding.create({
                data: {
                    fundId,
                    asset,
                    location: location === 'Unassigned' ? null : location,
                    amount,
                    avgPrice // Optional field in schema? Let's check. 
                    // Schema has avgPrice Float? in AssetHolding.
                }
            })
        }
    }
}
