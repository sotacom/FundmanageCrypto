"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { TransactionModal } from "@/components/TransactionForm"
import { formatNumber } from "@/lib/format"

interface CurrentPrices {
    usdtVnd: number
    btcUsdt: number
    timestamp: Date
    sources: {
        usdtVnd: 'binance_p2p' | 'default'
        btcUsdt: 'binance_spot' | 'default'
    }
}

interface SiteHeaderProps {
    fundName: string
    currentPrices: CurrentPrices | null
    pricesLoading: boolean
    onRefreshPrices: () => void
    fundId?: string
}

export function SiteHeader({
    fundName,
    currentPrices,
    pricesLoading,
    onRefreshPrices,
    fundId
}: SiteHeaderProps) {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{fundName}</h1>
                            <p className="text-xs text-muted-foreground md:text-sm">Quản lý quỹ đầu tư cá nhân</p>
                        </div>
                        <div className="md:hidden">
                            <ModeToggle />
                        </div>
                    </div>

                    {/* Price Display & Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {currentPrices && (
                            <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border bg-card p-2 shadow-sm sm:flex-none sm:px-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">USDT:</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                            {formatNumber(currentPrices.usdtVnd, 0)}
                                        </span>
                                        <div className={`h-2 w-2 rounded-full ${currentPrices.sources.usdtVnd === 'binance_p2p' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">BTC:</span>
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                            {formatNumber(currentPrices.btcUsdt, 2)}
                                        </span>
                                        <div className={`h-2 w-2 rounded-full ${currentPrices.sources.btcUsdt === 'binance_spot' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 border-l pl-3">
                                    <div className="hidden flex-col items-end sm:flex">
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(currentPrices.timestamp).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onRefreshPrices}
                                        disabled={pricesLoading}
                                        className="h-8 w-8"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
                                        <span className="sr-only">Refresh prices</span>
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="flex-1 sm:flex-none">
                                <TransactionModal fundId={fundId} />
                            </div>
                            <div className="hidden md:block">
                                <ModeToggle />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
