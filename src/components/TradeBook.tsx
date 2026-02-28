'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bitcoin, BarChart3, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { formatDateInTimezone } from '@/lib/timezone-utils'
import { usePermission } from '@/contexts/PermissionContext'

interface SpotTrade {
    id: string
    type: 'spot'
    date: string
    asset: string
    amount: number
    sellPrice: number
    costBasis: number
    pnl: number
    fee: number
    feeCurrency: string
    account: string | null
    note: string | null
}

interface FuturesTrade {
    id: string
    type: 'futures'
    date: string
    asset: string
    pnl: number
    fee: number
    feeCurrency: string
    account: string | null
    note: string | null
}

interface Summary {
    totalTrades: number
    totalPnL: number
    totalFees: number
    totalNet?: number
    wins: number
    losses: number
}

interface TradeBookProps {
    fundId: string
}

export default function TradeBook({ fundId }: TradeBookProps) {
    const { currentFundTimezone } = usePermission()
    const [spotTrades, setSpotTrades] = useState<SpotTrade[]>([])
    const [futuresTrades, setFuturesTrades] = useState<FuturesTrade[]>([])
    const [spotSummary, setSpotSummary] = useState<Summary | null>(null)
    const [futuresSummary, setFuturesSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/analysis/trade-book?fundId=${fundId}`)
            if (res.ok) {
                const data = await res.json()
                setSpotTrades(data.spot.trades)
                setSpotSummary(data.spot.summary)
                setFuturesTrades(data.futures.trades)
                setFuturesSummary(data.futures.summary)
            }
        } catch (error) {
            console.error('Error fetching trade book:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (fundId) fetchData()
    }, [fundId])

    const formatDate = (dateString: string) => {
        return formatDateInTimezone(dateString, currentFundTimezone)
    }

    const pnlColor = (val: number) => val >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    const pnlPrefix = (val: number) => val >= 0 ? '+' : ''

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Đang tải sổ lệnh...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* ===== SPOT TRADES ===== */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Bitcoin className="h-5 w-5 text-orange-500" />
                                Spot Trading
                            </CardTitle>
                            <CardDescription>
                                Các lệnh mua bán BTC Spot đã chốt
                            </CardDescription>
                        </div>
                        <Button onClick={fetchData} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Làm mới
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Spot Summary */}
                    {spotSummary && spotSummary.totalTrades > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                            <div>
                                <p className="text-xs text-muted-foreground">Số lệnh</p>
                                <p className="text-lg font-bold">{spotSummary.totalTrades}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tổng PnL</p>
                                <p className={`text-lg font-bold ${pnlColor(spotSummary.totalPnL)}`}>
                                    {pnlPrefix(spotSummary.totalPnL)}{formatCurrency(spotSummary.totalPnL, 'USDT')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tổng phí</p>
                                <p className="text-lg font-bold text-orange-600">
                                    -{formatCurrency(spotSummary.totalFees, 'USDT')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Win / Loss</p>
                                <p className="text-lg font-bold">
                                    <span className="text-green-600">{spotSummary.wins}</span>
                                    {' / '}
                                    <span className="text-red-600">{spotSummary.losses}</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Win rate</p>
                                <p className="text-lg font-bold">
                                    {spotSummary.totalTrades > 0
                                        ? ((spotSummary.wins / spotSummary.totalTrades) * 100).toFixed(1)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Spot Trade List */}
                    {spotTrades.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Chưa có lệnh Spot nào đã chốt
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="text-left py-3 px-2">Ngày</th>
                                        <th className="text-right py-3 px-2">Số lượng</th>
                                        <th className="text-right py-3 px-2">Giá bán</th>
                                        <th className="text-right py-3 px-2">Giá vốn</th>
                                        <th className="text-right py-3 px-2">PnL</th>
                                        <th className="text-right py-3 px-2">Phí</th>
                                        <th className="text-left py-3 px-2">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {spotTrades.map(trade => (
                                        <tr key={trade.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-2 whitespace-nowrap">
                                                <div className="text-sm">{formatDate(trade.date)}</div>
                                                {trade.account && (
                                                    <Badge variant="secondary" className="text-xs mt-1">{trade.account}</Badge>
                                                )}
                                            </td>
                                            <td className="text-right py-3 px-2 font-mono">
                                                {trade.amount.toFixed(8)} BTC
                                            </td>
                                            <td className="text-right py-3 px-2 font-mono">
                                                {trade.sellPrice.toLocaleString()} USDT
                                            </td>
                                            <td className="text-right py-3 px-2 font-mono">
                                                {trade.costBasis.toLocaleString()} USDT
                                            </td>
                                            <td className={`text-right py-3 px-2 font-bold font-mono ${pnlColor(trade.pnl)}`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {trade.pnl >= 0
                                                        ? <TrendingUp className="h-3 w-3" />
                                                        : <TrendingDown className="h-3 w-3" />
                                                    }
                                                    {pnlPrefix(trade.pnl)}{trade.pnl.toFixed(2)} USDT
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-2 font-mono text-orange-600">
                                                {trade.fee > 0 ? (
                                                    <>-{trade.fee.toFixed(trade.feeCurrency === 'BTC' ? 8 : 2)} {trade.feeCurrency}</>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">
                                                {trade.note || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ===== FUTURES TRADES ===== */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-yellow-500" />
                        Futures Trading
                    </CardTitle>
                    <CardDescription>
                        Các lệnh Long/Short BTC Futures đã chốt
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Futures Summary */}
                    {futuresSummary && futuresSummary.totalTrades > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                            <div>
                                <p className="text-xs text-muted-foreground">Số lệnh</p>
                                <p className="text-lg font-bold">{futuresSummary.totalTrades}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tổng PnL</p>
                                <p className={`text-lg font-bold ${pnlColor(futuresSummary.totalPnL)}`}>
                                    {pnlPrefix(futuresSummary.totalPnL)}{formatCurrency(futuresSummary.totalPnL, 'USDT')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tổng phí</p>
                                <p className="text-lg font-bold text-orange-600">
                                    -{formatCurrency(futuresSummary.totalFees, 'USDT')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">PnL ròng</p>
                                <p className={`text-lg font-bold ${pnlColor(futuresSummary.totalNet || 0)}`}>
                                    {pnlPrefix(futuresSummary.totalNet || 0)}{formatCurrency(futuresSummary.totalNet || 0, 'USDT')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Win / Loss</p>
                                <p className="text-lg font-bold">
                                    <span className="text-green-600">{futuresSummary.wins}</span>
                                    {' / '}
                                    <span className="text-red-600">{futuresSummary.losses}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Futures Trade List */}
                    {futuresTrades.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Chưa có lệnh Futures nào
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="text-left py-3 px-2">Ngày</th>
                                        <th className="text-right py-3 px-2">PnL</th>
                                        <th className="text-right py-3 px-2">Phí</th>
                                        <th className="text-right py-3 px-2">PnL ròng</th>
                                        <th className="text-left py-3 px-2">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {futuresTrades.map(trade => {
                                        const net = trade.pnl - trade.fee
                                        return (
                                            <tr key={trade.id} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-2 whitespace-nowrap">
                                                    <div className="text-sm">{formatDate(trade.date)}</div>
                                                    {trade.account && (
                                                        <Badge variant="secondary" className="text-xs mt-1">{trade.account}</Badge>
                                                    )}
                                                </td>
                                                <td className={`text-right py-3 px-2 font-bold font-mono ${pnlColor(trade.pnl)}`}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {trade.pnl >= 0
                                                            ? <TrendingUp className="h-3 w-3" />
                                                            : <TrendingDown className="h-3 w-3" />
                                                        }
                                                        {pnlPrefix(trade.pnl)}{trade.pnl.toFixed(2)} USDT
                                                    </div>
                                                </td>
                                                <td className="text-right py-3 px-2 font-mono text-orange-600">
                                                    {trade.fee > 0 ? <>-{trade.fee.toFixed(2)} USDT</> : '-'}
                                                </td>
                                                <td className={`text-right py-3 px-2 font-bold font-mono ${pnlColor(net)}`}>
                                                    {pnlPrefix(net)}{net.toFixed(2)} USDT
                                                </td>
                                                <td className="py-3 px-2 text-muted-foreground max-w-[300px]">
                                                    {trade.note || '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
