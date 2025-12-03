import { db } from '@/lib/db'

interface AssetState {
    amount: number
    avgPrice: number
}

interface LocationState {
    [key: string]: number // location -> amount
}

export async function recalculateFund(fundId: string) {
    // 1. Fetch fund settings to know earnInterestMethod
    // Fetch fund with equity fields
    const fund = await db.fund.findUnique({
        where: { id: fundId },
        select: {
            id: true,
            name: true,
            earnInterestMethod: true,
            initialCapital: true,
            additionalCapital: true,
            withdrawnCapital: true,
            retainedEarnings: true,
        }
    })

    // 2. Fetch all transactions sorted by date
    const transactions = await db.transaction.findMany({
        where: { fundId },
        orderBy: { createdAt: 'asc' }
    })

    // 3. Initialize state
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

    // 4. Process transactions
    for (const tx of transactions) {
        let costBasis = 0
        let realizedPnL = 0

        // Logic per transaction type
        switch (tx.type) {
            case 'capital_in':
                // Góp vốn
                // Nếu là " initial" hoặc chưa có initialCapital => vốn ban đầu
                if (tx.note?.includes('initial') || fund?.initialCapital === 0) {
                    await db.fund.update({
                        where: { id: fundId },
                        data: { initialCapital: { increment: tx.amount } }
                    })
                    console.log(`Capital In (Initial): +${tx.amount} VND`)
                } else {
                    // Vốn góp thêm
                    await db.fund.update({
                        where: { id: fundId },
                        data: { additionalCapital: { increment: tx.amount } }
                    })
                    console.log(`Capital In (Additional): +${tx.amount} VND`)
                }

                // Góp vốn: Tăng VND
                updateLocation('VND', null, tx.amount)
                getAssetState('VND').amount += tx.amount
                // VND luôn có giá 1
                getAssetState('VND').avgPrice = 1
                break

            case 'capital_out':
                // Rút vốn/lợi nhuận
                await db.fund.update({
                    where: { id: fundId },
                    data: { withdrawnCapital: { increment: tx.amount } }
                })
                console.log(`Capital Out: -${tx.amount} VND`)

                // Rút vốn: Giảm VND
                updateLocation('VND', null, -tx.amount)
                getAssetState('VND').amount -= tx.amount
                break

            case 'buy_usdt':
                // Mua USDT bằng VND
                const usdtPurchaseAmount = tx.amount
                const usdtPrice = tx.price || 0

                // ✨ Xử lý phí giao dịch P2P
                let usdtBuyReceived = usdtPurchaseAmount
                let vndSpent = usdtPurchaseAmount * usdtPrice

                if (tx.fee && tx.fee > 0) {
                    if (tx.feeCurrency === 'USDT') {
                        // Phí thu bằng USDT → giảm USDT nhận được
                        usdtBuyReceived -= tx.fee
                        console.log(`Buy USDT: Fee ${tx.fee} USDT deducted from received`)
                    } else if (tx.feeCurrency === 'VND') {
                        // Phí thu bằng VND → tăng VND phải chi
                        vndSpent += tx.fee
                        console.log(`Buy USDT: Fee ${tx.fee} VND added to cost`)
                    }
                }

                // 1. Giảm VND
                updateLocation('VND', null, -vndSpent)
                getAssetState('VND').amount -= vndSpent

                // 2. Tăng USDT & Tính lại AvgPrice (dùng số thực tế nhận được)
                const usdtState = getAssetState('USDT')
                const totalUsdtCost = (usdtState.amount * usdtState.avgPrice) + vndSpent
                const totalUsdtAmount = usdtState.amount + usdtBuyReceived

                usdtState.avgPrice = totalUsdtCost / totalUsdtAmount
                usdtState.amount = totalUsdtAmount

                updateLocation('USDT', tx.toLocation, usdtBuyReceived)
                break

            case 'sell_usdt':
                // Bán USDT thu về VND
                const usdtSellAmount = tx.amount
                const usdtSellPrice = tx.price || 0

                // ✨ Xử lý phí giao dịch P2P
                let vndReceived = usdtSellAmount * usdtSellPrice
                let usdtSellFeeAmount = 0

                if (tx.fee && tx.fee > 0) {
                    if (tx.feeCurrency === 'VND') {
                        // Phí thu bằng VND → giảm VND nhận được
                        vndReceived -= tx.fee
                        console.log(`Sell USDT: Fee ${tx.fee} VND deducted from proceeds`)
                    } else if (tx.feeCurrency === 'USDT') {
                        // Phí thu bằng USDT → tracking riêng
                        usdtSellFeeAmount = tx.fee
                        console.log(`Sell USDT: Fee ${tx.fee} USDT charged separately`)
                    }
                }

                // 1. Tính realized PnL (dùng VND thực tế nhận được)
                const sellUsdtState = getAssetState('USDT')
                costBasis = sellUsdtState.avgPrice
                realizedPnL = vndReceived - (usdtSellAmount * costBasis)

                // 2. Giảm USDT
                sellUsdtState.amount -= usdtSellAmount
                updateLocation('USDT', tx.fromLocation, -usdtSellAmount)

                // 2a. Trừ phí USDT nếu có
                if (usdtSellFeeAmount > 0) {
                    sellUsdtState.amount -= usdtSellFeeAmount
                    updateLocation('USDT', tx.fromLocation, -usdtSellFeeAmount)
                }

                // 3. Tăng VND (số thực tế nhận được)
                updateLocation('VND', null, vndReceived)
                getAssetState('VND').amount += vndReceived
                break

            case 'buy_btc':
                // Mua BTC bằng USDT
                const btcPurchaseAmount = tx.amount
                const btcPrice = tx.price || 0

                // ✨ Xử lý phí giao dịch
                let btcReceived = btcPurchaseAmount
                let usdtSpent = btcPurchaseAmount * btcPrice

                if (tx.fee && tx.fee > 0) {
                    if (tx.feeCurrency === 'BTC') {
                        // Phí thu bằng BTC → giảm số BTC nhận được
                        btcReceived = btcPurchaseAmount - tx.fee
                        console.log(`Buy BTC: Fee ${tx.fee} BTC deducted from received amount`)
                    } else if (tx.feeCurrency === 'USDT') {
                        // Phí thu bằng USDT → tăng USDT phải chi
                        usdtSpent += tx.fee
                        console.log(`Buy BTC: Fee ${tx.fee} USDT added to cost`)
                    }
                }

                // 1. Giảm USDT
                updateLocation('USDT', tx.fromLocation, -usdtSpent)
                getAssetState('USDT').amount -= usdtSpent

                // 2. Tăng BTC với weighted average (dùng số thực tế nhận được)
                const btcState = getAssetState('BTC')
                const totalBtcCost = (btcState.amount * btcState.avgPrice) + usdtSpent
                const totalBtcAmount = btcState.amount + btcReceived

                btcState.avgPrice = totalBtcCost / totalBtcAmount
                btcState.amount = totalBtcAmount

                updateLocation('BTC', tx.toLocation, btcReceived)
                break

            case 'sell_btc':
                // Bán BTC thu về USDT
                const btcSellAmount = tx.amount
                const btcSellPrice = tx.price || 0

                // ✨ Xử lý phí giao dịch
                let usdtReceived = btcSellAmount * btcSellPrice
                let btcFeeAmount = 0

                if (tx.fee && tx.fee > 0) {
                    if (tx.feeCurrency === 'USDT') {
                        // Phí thu bằng USDT → giảm USDT nhận được
                        usdtReceived -= tx.fee
                        console.log(`Sell BTC: Fee ${tx.fee} USDT deducted from proceeds`)
                    } else if (tx.feeCurrency === 'BTC') {
                        // Phí thu bằng BTC → tracking riêng
                        btcFeeAmount = tx.fee
                        console.log(`Sell BTC: Fee ${tx.fee} BTC charged separately`)
                    }
                }

                // 1. Tính realized PnL (dùng USDT thực tế nhận được)
                const sellBtcState = getAssetState('BTC')
                costBasis = sellBtcState.avgPrice
                realizedPnL = usdtReceived - (btcSellAmount * costBasis)

                // 2. Giảm BTC
                sellBtcState.amount -= btcSellAmount
                updateLocation('BTC', tx.fromLocation, -btcSellAmount)

                // 2a. Trừ phí BTC nếu có
                if (btcFeeAmount > 0) {
                    sellBtcState.amount -= btcFeeAmount
                    updateLocation('BTC', tx.fromLocation, -btcFeeAmount)
                }

                // 3. Tăng USDT (số thực tế nhận được)
                updateLocation('USDT', tx.toLocation, usdtReceived)
                getAssetState('USDT').amount += usdtReceived
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
                // Lãi suất USDT: 2 cách tính
                const earnState = getAssetState('USDT')

                const earnMethod = fund?.earnInterestMethod || 'reduce_avg_price';
                if (earnMethod === 'keep_avg_price') {
                    // ✨ CÁCH 2: Giữ nguyên giá TB
                    // Không thay đổi avgPrice, chỉ tăng amount
                    earnState.amount += tx.amount
                    console.log(`Earn ${tx.amount} USDT - kept avg price at ${earnState.avgPrice}`)

                } else {
                    // CÁCH 1: Giảm giá TB (mặc định)
                    // Coi như mua USDT với giá 0
                    const earnCost = (earnState.amount * earnState.avgPrice) + (tx.amount * 0)
                    const earnAmount = earnState.amount + tx.amount

                    earnState.avgPrice = earnCost / earnAmount
                    earnState.amount = earnAmount
                    console.log(`Earn ${tx.amount} USDT - new avg price: ${earnState.avgPrice}`)
                }

                updateLocation('USDT', tx.toLocation || tx.fromLocation, tx.amount)
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
