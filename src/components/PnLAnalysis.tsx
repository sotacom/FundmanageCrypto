'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Bitcoin, DollarSign, Globe, ArrowUpDown } from 'lucide-react'

interface PnLAnalysisProps {
    fundId: string
    fundData: any
    currentPrices: {
        usdtVnd: number
        btcUsdt: number
    } | null
}

interface BtcPnLData {
    total: number
    count: number
    wins: number
    winRate: number
    avgPerTrade: number
}

interface UsdtPnLData {
    total: number
    count: number
    avgSpread: number
}

export default function PnLAnalysis({ fundId, fundData, currentPrices }: PnLAnalysisProps) {
    const [btcPnL, setBtcPnL] = useState<BtcPnLData | null>(null)
    const [usdtPnL, setUsdtPnL] = useState<UsdtPnLData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchPnLData() {
            try {
                // Fetch BTC realized PnL
                const btcResponse = await fetch(`/api/analysis/btc-pnl?fundId=${fundId}`)
                const btcData = await btcResponse.json()
                setBtcPnL(btcData)

                // Fetch USDT realized PnL
                const usdtResponse = await fetch(`/api/analysis/usdt-pnl?fundId=${fundId}`)
                const usdtData = await usdtResponse.json()
                setUsdtPnL(usdtData)
            } catch (error) {
                console.error('Error fetching PnL data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchPnLData()
    }, [fundId])

    const formatCurrency = (amount: number, currency: string) => {
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount).replace('₫', 'VND')
        } else if (currency === 'USDT') {
            return `${amount.toLocaleString()} USDT`
        }
        return amount.toLocaleString()
    }

    // Calculate forex gain (USDT exchange rate difference)
    const forexGain = currentPrices
        ? fundData.holdings.usdt * (currentPrices.usdtVnd - fundData.avgPrices.usdt.avgPrice)
        : 0

    // Calculate crypto gain (BTC price appreciation)
    const cryptoGain = currentPrices
        ? fundData.holdings.btc * (currentPrices.btcUsdt - fundData.avgPrices.btc.avgPrice) * currentPrices.usdtVnd
        : 0

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Card 1: Realized PnL from BTC Trading */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bitcoin className="h-5 w-5 text-orange-500" />
                        Lãi/Lỗ Thực Hiện - BTC Trading
                    </CardTitle>
                    <CardDescription>
                        Từ giao dịch mua bán BTC ↔ USDT
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={`text-3xl font-bold ${(btcPnL?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {(btcPnL?.total || 0) >= 0 ? '+' : ''}
                        {formatCurrency(btcPnL?.total || 0, 'USDT')}
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số giao dịch:</span>
                            <span className="font-medium">{btcPnL?.count || 0}</span>
                        </div>
                        {(btcPnL?.count || 0) > 0 && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Win rate:</span>
                                    <span className="font-medium">{btcPnL?.winRate.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">TB mỗi trade:</span>
                                    <span className={`font-medium ${(btcPnL?.avgPerTrade || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {(btcPnL?.avgPerTrade || 0) >= 0 ? '+' : ''}
                                        {(btcPnL?.avgPerTrade || 0).toFixed(2)} USDT
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    {(btcPnL?.count || 0) === 0 && (
                        <p className="mt-4 text-sm text-muted-foreground">
                            Chưa có giao dịch bán BTC nào
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Card 2: Realized PnL from USDT P2P */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-500" />
                        Lãi/Lỗ Thực Hiện - P2P Trading
                    </CardTitle>
                    <CardDescription>
                        Từ giao dịch USDT ↔ VND (P2P)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={`text-3xl font-bold ${(usdtPnL?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {(usdtPnL?.total || 0) >= 0 ? '+' : ''}
                        {formatCurrency(usdtPnL?.total || 0, 'VND')}
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số giao dịch:</span>
                            <span className="font-medium">{usdtPnL?.count || 0}</span>
                        </div>
                        {(usdtPnL?.count || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Spread TB:</span>
                                <span className={`font-medium ${(usdtPnL?.avgSpread || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {(usdtPnL?.avgSpread || 0) >= 0 ? '+' : ''}
                                    {(usdtPnL?.avgSpread || 0).toLocaleString()} VND
                                </span>
                            </div>
                        )}
                    </div>
                    {(usdtPnL?.count || 0) === 0 && (
                        <p className="mt-4 text-sm text-muted-foreground">
                            Chưa có giao dịch bán USDT nào
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Card 3: Unrealized Forex Gain */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-500" />
                        Lãi Chưa Thực Hiện - Tỷ Giá
                    </CardTitle>
                    <CardDescription>
                        Chênh lệch tỷ giá USDT/VND
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={`text-3xl font-bold ${forexGain >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {forexGain >= 0 ? '+' : ''}
                        {formatCurrency(forexGain, 'VND')}
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                            <span>USDT holding:</span>
                            <span>{fundData.holdings.usdt.toLocaleString()} USDT</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Giá mua TB:</span>
                            <span>{fundData.avgPrices.usdt.avgPrice.toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Giá hiện tại:</span>
                            <span>{currentPrices?.usdtVnd.toLocaleString() || 'N/A'} VND</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t">
                            <span>Chênh lệch:</span>
                            <span className={forexGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {forexGain >= 0 ? '+' : ''}
                                {((currentPrices?.usdtVnd || 0) - fundData.avgPrices.usdt.avgPrice).toLocaleString()} VND/USDT
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 4: Unrealized Crypto Gain */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                        Lãi Chưa Thực Hiện - Crypto
                    </CardTitle>
                    <CardDescription>
                        Chênh lệch giá BTC
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={`text-3xl font-bold ${cryptoGain >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {cryptoGain >= 0 ? '+' : ''}
                        {formatCurrency(cryptoGain, 'VND')}
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                            <span>BTC holding:</span>
                            <span>{fundData.holdings.btc.toFixed(8)} BTC</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Giá mua TB:</span>
                            <span>{fundData.avgPrices.btc.avgPrice.toLocaleString()} USDT</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Giá hiện tại:</span>
                            <span>{currentPrices?.btcUsdt.toLocaleString() || 'N/A'} USDT</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t">
                            <span>Chênh lệch:</span>
                            <span className={cryptoGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {cryptoGain >= 0 ? '+' : ''}
                                {((currentPrices?.btcUsdt || 0) - fundData.avgPrices.btc.avgPrice).toLocaleString()} USDT
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>x Tỷ giá USDT:</span>
                            <span>{currentPrices?.usdtVnd.toLocaleString()} VND</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
