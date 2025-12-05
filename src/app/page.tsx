'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, TrendingDown, Wallet, DollarSign, Bitcoin, RefreshCw, ArrowUpDown } from 'lucide-react'
import { TransactionModal } from '@/components/TransactionForm'
import TransactionHistory from '@/components/TransactionHistory'
import FundSettings from '@/components/FundSettings'
import PnLAnalysis from '@/components/PnLAnalysis'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/format'
import { SiteHeader } from '@/components/site-header'

interface FundData {
  id: string
  name: string
  initialVnd: number
  earnInterestMethod?: 'reduce_avg_price' | 'keep_avg_price' // Settings
  equity: {
    initialCapital: number
    additionalCapital: number
    withdrawnCapital: number
    totalCapital: number
    retainedEarnings: number
    totalEquity: number
  }
  currentNav: {
    vnd: number
    usdt: number
  }
  unrealizedPnL: {
    vnd: number
    usdt: number
    percentage: number
  }
  realizedPnL: {
    vnd: number
    usdt: number
  }
  holdings: {
    vnd: number
    usdt: number
    btc: number
  }
  avgPrices: {
    usdt: {
      avgPrice: number
      totalBought: number
      totalSpent: number
      totalEarn: number
    }
    btc: {
      avgPrice: number
      totalBought: number
      totalSpent: number
      totalEarn: number
    }
  }
}

interface CurrentPrices {
  usdtVnd: number
  btcUsdt: number
  timestamp: Date
  sources: {
    usdtVnd: 'binance_p2p' | 'default'
    btcUsdt: 'binance_spot' | 'default'
  }
}

export default function FundDashboard() {
  const [fundData, setFundData] = useState<FundData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [currentPrices, setCurrentPrices] = useState<CurrentPrices | null>(null)
  const [pricesLoading, setPricesLoading] = useState(false)

  // Fetch current prices
  const fetchCurrentPrices = async () => {
    setPricesLoading(true)
    try {
      const response = await fetch('/api/prices/current')
      const data = await response.json()
      setCurrentPrices({
        ...data,
        timestamp: new Date(data.timestamp)
      })
    } catch (error) {
      console.error('Error fetching prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }

  useEffect(() => {
    // Fetch prices on mount
    fetchCurrentPrices()
  }, [])

  useEffect(() => {
    const fetchFundData = async () => {
      try {
        // First, try to initialize demo data
        const initResponse = await fetch('/api/init', { method: 'POST' })
        const initData = await initResponse.json()

        if (initData.success) {
          const fundId = initData.fundId

          // Fetch NAV data - API will fetch live prices from Binance automatically
          const navResponse = await fetch(`/api/nav?fundId=${fundId}`)

          if (navResponse.ok) {
            const navData = await navResponse.json()

            // Transform API data to component format
            const transformedData: FundData = {
              id: navData.fund.id,
              name: navData.fund.name,
              initialVnd: navData.fund.initialVnd || 0,
              earnInterestMethod: navData.fund.earnInterestMethod || 'reduce_avg_price',
              equity: navData.fund.equity || {
                initialCapital: 0,
                additionalCapital: 0,
                withdrawnCapital: 0,
                totalCapital: 0,
                retainedEarnings: 0,
                totalEquity: 0
              },
              currentNav: {
                vnd: navData.currentNav.vnd,
                usdt: navData.currentNav.usdt
              },
              unrealizedPnL: {
                vnd: navData.unrealizedPnL.vnd,
                usdt: navData.unrealizedPnL.usdt,
                percentage: navData.unrealizedPnL.percentage
              },
              realizedPnL: navData.realizedPnL,
              holdings: navData.holdings,
              avgPrices: navData.avgPrices
            }

            setFundData(transformedData)
          } else {
            throw new Error('Failed to fetch NAV data')
          }
        } else {
          throw new Error('Failed to initialize demo data')
        }
      } catch (error) {
        console.error('Error setting up demo:', error)

        // Fallback to mock data
        const mockData: FundData = {
          id: '1',
          name: 'Quỹ Đầu Tư Cá Nhân',
          initialVnd: 100000000,
          equity: {
            initialCapital: 100000000,
            additionalCapital: 0,
            withdrawnCapital: 0,
            totalCapital: 100000000,
            retainedEarnings: 25000000,
            totalEquity: 125000000,
          },
          currentNav: {
            vnd: 125000000,
            usdt: 5000
          },
          unrealizedPnL: {
            vnd: 25000000,
            usdt: 1000,
            percentage: 25
          },
          realizedPnL: {
            vnd: 5000000,
            usdt: 200
          },
          holdings: {
            vnd: 15000000,
            usdt: 2500,
            btc: 0.05
          },
          avgPrices: {
            usdt: {
              avgPrice: 25500,
              totalBought: 5000,
              totalSpent: 127500000,
              totalEarn: 500
            },
            btc: {
              avgPrice: 43000,
              totalBought: 0.05,
              totalSpent: 2150,
              totalEarn: 0
            }
          }
        }
        setFundData(mockData)
      } finally {
        setLoading(false)
      }
    }

    fetchFundData()
  }, [])

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1)
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu quỹ...</p>
        </div>
      </div>
    )
  }

  if (!fundData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Không tìm thấy dữ liệu quỹ</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        fundName={fundData.name}
        currentPrices={currentPrices}
        pricesLoading={pricesLoading}
        onRefreshPrices={fetchCurrentPrices}
        fundId={fundData.id}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Tổng NAV</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(fundData.currentNav.vnd, 'VND')}
              </div>
              <p className="text-xs text-blue-100 mt-1 opacity-80">
                Vốn ban đầu: {formatNumber(fundData.equity.initialCapital, 0)} VND
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vốn Chủ Sở Hữu</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(fundData.equity.totalCapital, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fundData.equity.withdrawnCapital > 0 && `Đã rút: ${formatCurrency(fundData.equity.withdrawnCapital, 'VND')}`}
                {fundData.equity.withdrawnCapital === 0 && 'Chưa rút vốn'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lợi Nhuận</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fundData.equity.retainedEarnings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                {fundData.equity.retainedEarnings >= 0 ? '+' : ''}
                {formatCurrency(fundData.equity.retainedEarnings, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lợi nhuận chưa phân phối
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fundData.equity.retainedEarnings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                {fundData.equity.totalCapital > 0
                  ? `${((fundData.equity.retainedEarnings / fundData.equity.totalCapital) * 100).toFixed(2)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lợi nhuận / Vốn
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="holdings">Sở hữu tài sản</TabsTrigger>
            <TabsTrigger value="nav">Phân tích NAV</TabsTrigger>
            <TabsTrigger value="avg-price">Giá trung bình</TabsTrigger>
            <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tiền mặt VND
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(fundData.holdings.vnd, 'VND')}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tỷ trọng:</span>
                      <span className="font-medium">
                        {((fundData.holdings.vnd / fundData.currentNav.vnd) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    USDT
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(fundData.holdings.usdt, 2)} USDT
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(fundData.holdings.usdt * fundData.avgPrices.usdt.avgPrice, 'VND')}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tỷ trọng:</span>
                      <span className="font-medium">
                        {((fundData.holdings.usdt * fundData.avgPrices.usdt.avgPrice / fundData.currentNav.vnd) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5" />
                    Bitcoin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(fundData.holdings.btc, 'BTC')}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(fundData.holdings.btc * fundData.avgPrices.btc.avgPrice * fundData.avgPrices.usdt.avgPrice, 'VND')}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tỷ trọng:</span>
                      <span className="font-medium">
                        {((fundData.holdings.btc * fundData.avgPrices.btc.avgPrice * fundData.avgPrices.usdt.avgPrice / fundData.currentNav.vnd) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="nav-analysis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle>NAV theo VND</CardTitle>
                  <CardDescription>
                    Tổng giá trị tài sản ròng tính bằng VND
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Tiền mặt VND:</span>
                    <span className="font-medium">{formatCurrency(fundData.holdings.vnd, 'VND')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>USDT (tỷ giá {formatNumber(fundData.avgPrices.usdt.avgPrice, 0)}):</span>
                    <span className="font-medium">
                      {formatCurrency(fundData.holdings.usdt * fundData.avgPrices.usdt.avgPrice, 'VND')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTC ({formatNumber(fundData.avgPrices.btc.avgPrice, 2)} USDT):</span>
                    <span className="font-medium">
                      {formatCurrency(fundData.holdings.btc * fundData.avgPrices.btc.avgPrice * fundData.avgPrices.usdt.avgPrice, 'VND')}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng NAV:</span>
                      <span className="text-green-600 dark:text-green-400">{formatCurrency(fundData.currentNav.vnd, 'VND')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle>NAV theo USDT</CardTitle>
                  <CardDescription>
                    Phân loại cash VND và stablecoin+crypto tính theo USDT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Tiền mặt VND:</span>
                    <span className="font-medium">
                      {(fundData.holdings.vnd / fundData.avgPrices.usdt.avgPrice).toLocaleString()} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>USDT:</span>
                    <span className="font-medium">{formatNumber(fundData.holdings.usdt, 2)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTC:</span>
                    <span className="font-medium">
                      {formatNumber(fundData.holdings.btc * fundData.avgPrices.btc.avgPrice, 2)} USDT
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng NAV:</span>
                      <span className="text-green-600 dark:text-green-400">{formatNumber(fundData.currentNav.usdt, 2)} USDT</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PnL Analysis Tab */}
          <TabsContent value="nav" className="space-y-4">
            <PnLAnalysis
              fundId={fundData.id}
              fundData={fundData}
              currentPrices={currentPrices}
            />
          </TabsContent>

          <TabsContent value="avg-price" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle>Giá mua trung bình USDT/VND</CardTitle>
                  <CardDescription>
                    Giá mua trung bình USDT theo VND (bình quân gia quyền)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(fundData.avgPrices.usdt.avgPrice, 0)} VND/USDT
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Phương pháp Earn:</span>
                      <Badge variant={fundData.earnInterestMethod === 'keep_avg_price' ? 'default' : 'secondary'}>
                        {fundData.earnInterestMethod === 'keep_avg_price' ? 'Giữ nguyên' : 'Giảm giá TB'}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng USDT đã mua:</span>
                      <span className="font-medium">{formatNumber(fundData.avgPrices.usdt.totalBought, 2)} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng VND đã chi:</span>
                      <span className="font-medium">{formatCurrency(fundData.avgPrices.usdt.totalSpent, 'VND')}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">USDT từ Earn:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +{formatNumber(fundData.avgPrices.usdt.totalEarn, 2)} USDT
                      </span>
                    </div>
                    {fundData.avgPrices.usdt.totalEarn > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {fundData.earnInterestMethod === 'keep_avg_price'
                          ? '✓ Lãi Earn không làm thay đổi giá TB'
                          : '✓ Lãi Earn đã được tính vào giá TB'
                        }
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Giá P2P hiện tại:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatNumber(currentPrices?.usdtVnd || 0, 0) || 'N/A'} VND
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-muted/60 shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle>Giá mua trung bình BTC/USDT</CardTitle>
                  <CardDescription>
                    Giá mua trung bình BTC theo USDT (bình quân gia quyền)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {formatNumber(fundData.avgPrices.btc.avgPrice, 2)} USDT/BTC
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng BTC đã mua:</span>
                      <span className="font-medium">{formatCurrency(fundData.avgPrices.btc.totalBought, 'BTC')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng USDT đã chi:</span>
                      <span className="font-medium">{formatNumber(fundData.avgPrices.btc.totalSpent, 2)} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Giá Spot hiện tại:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {formatNumber(currentPrices?.btcUsdt || 0, 2) || 'N/A'} USDT
                      </span>
                    </div>
                    {currentPrices && fundData.avgPrices.btc.avgPrice > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Chênh lệch:</span>
                        <span className={`font-semibold ${currentPrices.btcUsdt > fundData.avgPrices.btc.avgPrice ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                          {currentPrices.btcUsdt > fundData.avgPrices.btc.avgPrice ? '+' : ''}
                          {((currentPrices.btcUsdt - fundData.avgPrices.btc.avgPrice) / fundData.avgPrices.btc.avgPrice * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history" className="space-y-4">
            <TransactionHistory
              fundId={fundData.id}
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="max-w-3xl">
              <FundSettings
                fundId={fundData.id}
                currentMethod={fundData.earnInterestMethod || 'reduce_avg_price'}
                onSettingsChanged={() => {
                  // Refresh fund data after settings change
                  setRefreshTrigger(prev => prev + 1)
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}