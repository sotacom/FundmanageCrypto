/**
 * Binance Price Service
 * Fetches real-time prices from Binance P2P and Spot APIs
 */

// Default fallback prices if API fails
const DEFAULT_USDT_VND_PRICE = 25500
const DEFAULT_BTC_USDT_PRICE = 43000

// API endpoints
const BINANCE_P2P_API = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
const BINANCE_SPOT_API = 'https://api.binance.com/api/v3/ticker/price'

// Timeout for API requests (5 seconds)
const API_TIMEOUT = 5000

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        })
        clearTimeout(timeoutId)
        return response
    } catch (error) {
        clearTimeout(timeoutId)
        throw error
    }
}

/**
 * Get P2P price for USDT/VND from Binance
 * 
 * Fetches top 12 ads, skips first 2 (potential scams/outliers), 
 * and calculates average of remaining 10 advertisers for accuracy
 */
export async function getP2PPrice(
    asset: 'USDT' = 'USDT',
    fiat: 'VND' = 'VND',
    tradeType: 'BUY' | 'SELL' = 'BUY'
): Promise<number> {
    try {
        const response = await fetchWithTimeout(BINANCE_P2P_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                asset,
                fiat,
                tradeType,
                page: 1,
                rows: 12, // Fetch top 12 ads
                publisherType: null
            })
        })

        if (!response.ok) {
            throw new Error(`P2P API returned ${response.status}`)
        }

        const data = await response.json()

        // Extract prices from advertisements
        const ads = data?.data || []
        if (ads.length === 0) {
            console.warn('No P2P ads found, using default price')
            return DEFAULT_USDT_VND_PRICE
        }

        // Skip first 2 ads (potential scams), take next 10 ads for averaging
        const prices = ads
            .slice(2, 12) // Skip index 0,1 - take index 2-11 (10 ads)
            .map((ad: any) => parseFloat(ad.adv?.price || '0'))
            .filter((price: number) => price > 0)

        if (prices.length === 0) {
            console.warn('No valid P2P prices found after filtering, using default')
            return DEFAULT_USDT_VND_PRICE
        }

        const averagePrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length

        console.log(`P2P ${asset}/${fiat} ${tradeType}: ${averagePrice.toFixed(0)} (avg of ${prices.length} ads, skipped top 2)`)

        return Math.round(averagePrice)

    } catch (error) {
        console.error('Error fetching P2P price:', error)
        return DEFAULT_USDT_VND_PRICE
    }
}

/**
 * Get Spot price for BTC/USDT from Binance
 */
export async function getSpotPrice(symbol: string = 'BTCUSDT'): Promise<number> {
    try {
        const response = await fetchWithTimeout(
            `${BINANCE_SPOT_API}?symbol=${symbol}`
        )

        if (!response.ok) {
            throw new Error(`Spot API returned ${response.status}`)
        }

        const data = await response.json()
        const price = parseFloat(data.price || '0')

        if (price === 0) {
            console.warn('Invalid spot price, using default')
            return DEFAULT_BTC_USDT_PRICE
        }

        console.log(`Spot ${symbol}: ${price.toFixed(2)}`)

        return price

    } catch (error) {
        console.error('Error fetching spot price:', error)
        return DEFAULT_BTC_USDT_PRICE
    }
}

/**
 * Get current prices for both USDT/VND and BTC/USDT
 * 
 * Returns both prices with source information
 */
export async function getCurrentPrices(): Promise<{
    usdtVnd: number
    btcUsdt: number
    timestamp: Date
    sources: {
        usdtVnd: 'binance_p2p' | 'default'
        btcUsdt: 'binance_spot' | 'default'
    }
}> {
    // Fetch both prices in parallel
    const [usdtVnd, btcUsdt] = await Promise.all([
        getP2PPrice('USDT', 'VND', 'BUY'),
        getSpotPrice('BTCUSDT')
    ])

    // Determine sources
    const sources = {
        usdtVnd: (usdtVnd !== DEFAULT_USDT_VND_PRICE ? 'binance_p2p' : 'default') as 'binance_p2p' | 'default',
        btcUsdt: (btcUsdt !== DEFAULT_BTC_USDT_PRICE ? 'binance_spot' : 'default') as 'binance_spot' | 'default'
    }

    return {
        usdtVnd,
        btcUsdt,
        timestamp: new Date(),
        sources
    }
}
