import { db } from './db'

interface PortfolioState {
    amount: number
    avgPrice: number    // Price in quote currency (VND for USDT, USDT for BTC)
    avgPriceVnd: number // Price in VND (Cost Basis)
}

interface HoldingsByAccount {
    [accountId: string]: number
}

export async function recalculateFund(fundId: string) {
    // 1. Fetch fund with equity fields
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

    // 3. Initialize portfolio state
    const portfolio: { [asset: string]: PortfolioState } = {}
    const holdings: { [asset: string]: HoldingsByAccount } = {}

    const getAssetState = (asset: string): PortfolioState => {
        if (!portfolio[asset]) {
            portfolio[asset] = {
                amount: 0,
                avgPrice: 0,
                avgPriceVnd: asset === 'VND' ? 1 : 0
            }
        }
        return portfolio[asset]
    }

    const updateAccount = (asset: string, accountId: string | null, delta: number) => {
        const accId = accountId || 'unassigned'
        if (!holdings[asset]) holdings[asset] = {}
        if (!holdings[asset][accId]) holdings[asset][accId] = 0
        holdings[asset][accId] += delta
    }

    // 4. Process transactions
    for (const tx of transactions) {
        let costBasis = 0
        let realizedPnL = 0

        // Logic per transaction type
        switch (tx.type) {
            case 'capital_in':
                // Góp vốn
                // Track if this is the FIRST capital_in transaction we've seen
                const existingCapitalIns = transactions.filter((t, idx) =>
                    t.type === 'capital_in' && transactions.indexOf(tx) > idx
                )

                const isFirstCapitalIn = existingCapitalIns.length === 0

                if (isFirstCapitalIn || tx.note?.includes('initial')) {
                    console.log(`Capital In (Initial): ${tx.amount} VND`)
                } else {
                    console.log(`Capital In (Additional): ${tx.amount} VND`)
                }

                // Góp vốn: Tăng VND
                updateAccount('VND', null, tx.amount)
                const vndState = getAssetState('VND')
                vndState.amount += tx.amount
                // VND luôn có giá 1
                vndState.avgPrice = 1
                vndState.avgPriceVnd = 1
                break

            case 'capital_out':
                // Rút vốn/lợi nhuận (equity updated at end)
                console.log(`Capital Out: -${tx.amount} VND`)

                // Rút vốn: Giảm VND
                updateAccount('VND', null, -tx.amount)
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
                updateAccount('VND', null, -vndSpent)
                getAssetState('VND').amount -= vndSpent

                // 2. Tăng USDT & Tính lại AvgPrice (dùng số thực tế nhận được)
                const usdtState = getAssetState('USDT')
                const totalUsdtCost = (usdtState.amount * usdtState.avgPrice) + vndSpent
                // Calculate Total VND Cost (should match totalUsdtCost for USDT since Quote is VND)
                const totalUsdtCostVnd = (usdtState.amount * usdtState.avgPriceVnd) + vndSpent

                const totalUsdtAmount = usdtState.amount + usdtBuyReceived

                if (totalUsdtAmount > 0) {
                    usdtState.avgPrice = totalUsdtCost / totalUsdtAmount
                    usdtState.avgPriceVnd = totalUsdtCostVnd / totalUsdtAmount
                }
                usdtState.amount = totalUsdtAmount

                updateAccount('USDT', tx.accountId || tx.toLocation, usdtBuyReceived)
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
                costBasis = sellUsdtState.avgPriceVnd // Use VND Cost Basis
                realizedPnL = vndReceived - (usdtSellAmount * costBasis)

                // 2. Giảm USDT (Avg Price không thay đổi khi bán)
                sellUsdtState.amount -= usdtSellAmount
                updateAccount('USDT', tx.fromLocation, -usdtSellAmount)

                // 2a. Trừ phí USDT nếu có
                if (usdtSellFeeAmount > 0) {
                    sellUsdtState.amount -= usdtSellFeeAmount
                    updateAccount('USDT', tx.fromLocation, -usdtSellFeeAmount)
                }

                // 3. Tăng VND (số thực tế nhận được)
                updateAccount('VND', null, vndReceived)
                getAssetState('VND').amount += vndReceived
                break

            case 'transfer_usdt':
                // Chuyển USDT giữa các địa điểm
                const usdtTransferAmount = tx.amount
                updateAccount('USDT', tx.fromLocation, -usdtTransferAmount)
                updateAccount('USDT', tx.toLocation, usdtTransferAmount)
                break

            case 'buy_btc':
                // Mua BTC bằng USDT
                const btcPurchaseAmount = tx.amount
                const btcPrice = tx.price || 0

                // ✨ Xử lý phí giao dịch
                let btcBuyReceived = btcPurchaseAmount
                let usdtSpent = btcPurchaseAmount * btcPrice

                if (tx.fee && tx.fee > 0) {
                    if (tx.feeCurrency === 'BTC') {
                        // Phí thu bằng BTC → giảm BTC nhận được
                        btcBuyReceived -= tx.fee
                        console.log(`Buy BTC: Fee ${tx.fee} BTC deducted from received`)
                    } else if (tx.feeCurrency === 'USDT') {
                        // Phí thu bằng USDT → tăng USDT phải chi
                        usdtSpent += tx.fee
                        console.log(`Buy BTC: Fee ${tx.fee} USDT added to cost`)
                    }
                }

                // 1. Giảm USDT
                const usdtForBtc = getAssetState('USDT')
                usdtForBtc.amount -= usdtSpent
                updateAccount('USDT', tx.fromLocation, -usdtSpent)

                // Calculate VND value of USDT spent based on current USDT avg price (VND)
                const vndCostOfUsdtSpent = usdtSpent * usdtForBtc.avgPriceVnd

                // 2. Tăng BTC (dùng số thực tế nhận được)
                const btcState = getAssetState('BTC')
                const totalBtcCostUsdt = (btcState.amount * btcState.avgPrice) + usdtSpent
                const totalBtcCostVnd = (btcState.amount * btcState.avgPriceVnd) + vndCostOfUsdtSpent
                const totalBtcAmount = btcState.amount + btcBuyReceived

                if (totalBtcAmount > 0) {
                    btcState.avgPrice = totalBtcCostUsdt / totalBtcAmount // USDT Cost Basis
                    btcState.avgPriceVnd = totalBtcCostVnd / totalBtcAmount // VND Cost Basis
                }
                btcState.amount = totalBtcAmount

                updateAccount('BTC', tx.toLocation, btcBuyReceived)
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

                // 1. Tính realized PnL in USDT (Generic PnL)
                const sellBtcState = getAssetState('BTC')
                costBasis = sellBtcState.avgPrice
                // This realizes PnL in USDT terms
                const realizedPnLUsdt = usdtReceived - (btcSellAmount * costBasis)
                // Note: We don't have a field for 'realizedPnLUsdt', storing to generic realizedPnL
                realizedPnL = realizedPnLUsdt

                // 2. Giảm BTC
                sellBtcState.amount -= btcSellAmount
                updateAccount('BTC', tx.fromLocation, -btcSellAmount)

                // 2a. Trừ phí BTC nếu có
                if (btcFeeAmount > 0) {
                    sellBtcState.amount -= btcFeeAmount
                    updateAccount('BTC', tx.fromLocation, -btcFeeAmount)
                }

                // 3. Tăng USDT
                // Value the new USDT at the current USDT Avg Price (VND) 
                // OR technically, we should treat it as adding Value?
                // To maintain consistency, we assume the incoming USDT carries the VND value 
                // equivalent to its current market rate (which we approximate using existing AvgPrice? No, that's circular)
                // Current logic was: newUsdtCost = prev + (received * existingAvg)
                // Let's stick to that to recognize "Profit" immediately in Retained Earnings.

                const usdtFromBtc = getAssetState('USDT')
                const prevUsdtCost = usdtFromBtc.amount * usdtFromBtc.avgPrice
                const prevUsdtCostVnd = usdtFromBtc.amount * usdtFromBtc.avgPriceVnd

                // We use the EXISTING USDT Avg Price to value the incoming USDT.
                // This implies "Any new USDT we get is worth the same as our old USDT"
                // This matches the goal of recognizing profit if we sold BTC for MORE USDT than we bought.
                const valutaionPriceVnd = usdtFromBtc.avgPriceVnd > 0 ? usdtFromBtc.avgPriceVnd : 25000 // Fallback if 0?
                // Actually if usdtFromBtc.avgPriceVnd is 0, we can't value the profit. 
                // But usually we have USDT.

                const newUsdtCost = prevUsdtCost + (usdtReceived * usdtFromBtc.avgPrice)
                const newUsdtCostVnd = prevUsdtCostVnd + (usdtReceived * valutaionPriceVnd)

                const newUsdtAmount = usdtFromBtc.amount + usdtReceived

                if (newUsdtAmount > 0) {
                    usdtFromBtc.avgPrice = newUsdtCost / newUsdtAmount
                    usdtFromBtc.avgPriceVnd = newUsdtCostVnd / newUsdtAmount
                }
                usdtFromBtc.amount = newUsdtAmount

                updateAccount('USDT', tx.toLocation, usdtReceived)
                break

            case 'transfer_btc':
                // Chuyển BTC giữa các địa điểm
                const btcTransferAmount = tx.amount
                updateAccount('BTC', tx.fromLocation, -btcTransferAmount)
                updateAccount('BTC', tx.toLocation, btcTransferAmount)
                break

            case 'earn_interest':
                // Lãi suất USDT: 2 cách tính
                const earnState = getAssetState('USDT')
                const earnMethod = fund?.earnInterestMethod || 'reduce_avg_price'

                if (earnMethod === 'keep_avg_price') {
                    // CÁCH 2: Giữ nguyên giá TB -> Tăng Value -> Profit
                    earnState.amount += tx.amount
                    // avgPrice and avgPriceVnd stay same
                } else {
                    // CÁCH 1: Giảm giá TB -> Giữ Value -> No Profit yet
                    const prevCost = earnState.amount * earnState.avgPrice
                    const prevCostVnd = earnState.amount * earnState.avgPriceVnd

                    const newAmount = earnState.amount + tx.amount
                    if (newAmount > 0) {
                        earnState.avgPrice = prevCost / newAmount
                        earnState.avgPriceVnd = prevCostVnd / newAmount
                    }
                    earnState.amount = newAmount
                }

                updateAccount('USDT', tx.toLocation, tx.amount)
                break

            default:
                console.warn(`Unknown transaction type: ${tx.type}`)
        }

        // Save calculated fields back to transaction
        await db.transaction.update({
            where: { id: tx.id },
            data: {
                costBasis,
                realizedPnL: realizedPnL // Note: This might be USDT or VND depending on trade
            }
        })
    }

    // Clear old holdings
    await db.assetHolding.deleteMany({
        where: { fundId }
    })

    // Create new holdings from calculated holdings by account
    for (const [asset, accountHoldings] of Object.entries(holdings)) {
        for (const [accountId, amount] of Object.entries(accountHoldings)) {
            if (amount > 0.00000001) { // Skip negligible amounts
                await db.assetHolding.create({
                    data: {
                        fundId,
                        asset,
                        amount,
                        avgPrice: portfolio[asset]?.avgPrice || 0,
                        accountId: accountId === 'unassigned' ? null : accountId,
                        location: null // Deprecated, now using accountId
                    }
                })
            }
        }
    }

    // Calculate equity from capital_in and capital_out transactions
    const capitalInTransactions = transactions.filter(tx => tx.type === 'capital_in')
    const capitalOutTransactions = transactions.filter(tx => tx.type === 'capital_out')

    const initialCapital = capitalInTransactions.length > 0 ? capitalInTransactions[0].amount : 0
    const additionalCapital = capitalInTransactions.slice(1).reduce((sum, tx) => sum + tx.amount, 0)
    const withdrawnCapital = capitalOutTransactions.reduce((sum, tx) => sum + tx.amount, 0)

    // Calculate total assets for retained earnings
    // Now we use avgPriceVnd for ALL asset valuations to ensure historical cost is respected
    const vndValue = portfolio['VND']?.amount || 0
    const usdtValue = (portfolio['USDT']?.amount || 0) * (portfolio['USDT']?.avgPriceVnd || 0)
    const btcValueVnd = (portfolio['BTC']?.amount || 0) * (portfolio['BTC']?.avgPriceVnd || 0)

    // Note: btcValueVnd is now directly available via avgPriceVnd, no need to multiply by USDT avg price

    const totalAssets = vndValue + usdtValue + btcValueVnd

    const totalCapital = initialCapital + additionalCapital - withdrawnCapital
    const retainedEarnings = totalAssets - totalCapital

    // Update fund equity
    await db.fund.update({
        where: { id: fundId },
        data: {
            initialCapital,
            additionalCapital,
            withdrawnCapital,
            retainedEarnings
        }
    })

    console.log(`✅ Recalculation complete - Initial: ${initialCapital}, Additional: ${additionalCapital}, Retained: ${retainedEarnings}`)
}
