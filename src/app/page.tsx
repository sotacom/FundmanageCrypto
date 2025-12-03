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

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency === 'VND' ? 'VND' : 'USD',
      minimumFractionDigits: currency === 'BTC' ? 8 : 0,
      maximumFractionDigits: currency === 'BTC' ? 8 : 0
    })

    if (currency === 'VND') {
      return formatter.format(amount).replace('₫', 'VND')
    } else if (currency === 'BTC') {
      return `${amount.toFixed(8)} BTC`
    } else {
      return `$${amount.toLocaleString()} ${currency}`
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{fundData.name}</h1>
              <p className="text-sm text-muted-foreground">Quản lý quỹ đầu tư cá nhân</p>
            </div>

            {/* Price Display */}
            <div className="flex items-center gap-4">
              {currentPrices && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">USDT/VND:</span>
                      <span className="text-sm font-semibold text-green-600">
                        {currentPrices.usdtVnd.toLocaleString()}
                      </span>
                      <Badge
                        variant={currentPrices.sources.usdtVnd === 'binance_p2p' ? 'default' : 'secondary'}
                        className="text-xs h-5"
                      >
                        {currentPrices.sources.usdtVnd === 'binance_p2p' ? '🟢 Live' : '⚪ Default'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">BTC/USDT:</span>
                      <span className="text-sm font-semibold text-orange-600">
                        {currentPrices.btcUsdt.toLocaleString()}
                      </span>
                      <Badge
                        variant={currentPrices.sources.btcUsdt === 'binance_spot' ? 'default' : 'secondary'}
                        className="text-xs h-5"
                      >
                        {currentPrices.sources.btcUsdt === 'binance_spot' ? '🟢 Live' : '⚪ Default'}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-l pl-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchCurrentPrices}
                      disabled={pricesLoading}
                      className="h-8"
                    >
                      <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    {currentPrices.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {new Date(currentPrices.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <TransactionModal fundId={fundData?.id} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng NAV</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(fundData.currentNav.vnd, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vốn băn đầu: {fundData.equity.initialCapital.toLocaleString()} VND
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vốn Chủ Sở Hữu</CardTitle>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lợi Nhuận</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fundData.equity.retainedEarnings >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {fundData.equity.retainedEarnings >= 0 ? '+' : ''}
                {formatCurrency(fundData.equity.retainedEarnings, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lợi nhuận chưa phân phối
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fundData.equity.retainedEarnings >= 0 ? 'text-green-600' : 'text-red-600'
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tiền mặt VND
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    USDT
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {fundData.holdings.usdt.toLocaleString()} USDT
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5" />
                    Bitcoin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
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
              <Card>
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
                    <span>USDT (tỷ giá {fundData.avgPrices.usdt.avgPrice.toLocaleString()}):</span>
                    <span className="font-medium">
                      {formatCurrency(fundData.holdings.usdt * fundData.avgPrices.usdt.avgPrice, 'VND')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTC ({fundData.avgPrices.btc.avgPrice.toLocaleString()} USDT):</span>
                    <span className="font-medium">
                      {formatCurrency(fundData.holdings.btc * fundData.avgPrices.btc.avgPrice * fundData.avgPrices.usdt.avgPrice, 'VND')}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng NAV:</span>
                      <span className="text-green-600">{formatCurrency(fundData.currentNav.vnd, 'VND')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
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
                    <span className="font-medium">{fundData.holdings.usdt.toLocaleString()} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTC:</span>
                    <span className="font-medium">
                      {(fundData.holdings.btc * fundData.avgPrices.btc.avgPrice).toLocaleString()} USDT
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng NAV:</span>
                      <span className="text-green-600">{fundData.currentNav.usdt.toLocaleString()} USDT</span>
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
              <Card>
                <CardHeader>
                  <CardTitle>Giá mua trung bình USDT/VND</CardTitle>
                  <CardDescription>
                    Giá mua trung bình USDT theo VND (bình quân gia quyền)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {fundData.avgPrices.usdt.avgPrice.toLocaleString()} VND/USDT
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Phương pháp Earn:</span>
                      <Badge variant={fundData.earnInterestMethod === 'keep_avg_price' ? 'default' : 'secondary'}>
                        {fundData.earnInterestMethod === 'keep_avg_price' ? 'Giữ nguyên' : 'Giảm giá TB'}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng USDT đã mua:</span>
                      <span className="font-medium">{fundData.avgPrices.usdt.totalBought.toLocaleString()} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng VND đã chi:</span>
                      <span className="font-medium">{formatCurrency(fundData.avgPrices.usdt.totalSpent, 'VND')}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">USDT từ Earn:</span>
                      <span className="font-semibold text-green-600">
                        +{fundData.avgPrices.usdt.totalEarn.toLocaleString()} USDT
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
                      <span className="font-medium text-green-600">
                        {currentPrices?.usdtVnd.toLocaleString() || 'N/A'} VND
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Giá mua trung bình BTC/USDT</CardTitle>
                  <CardDescription>
                    Giá mua trung bình BTC theo USDT (bình quân gia quyền)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {fundData.avgPrices.btc.avgPrice.toLocaleString()} USDT/BTC
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng BTC đã mua:</span>
                      <span className="font-medium">{formatCurrency(fundData.avgPrices.btc.totalBought, 'BTC')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng USDT đã chi:</span>
                      <span className="font-medium">{fundData.avgPrices.btc.totalSpent.toLocaleString()} USDT</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Giá Spot hiện tại:</span>
                      <span className="font-medium text-orange-600">
                        {currentPrices?.btcUsdt.toLocaleString() || 'N/A'} USDT
                      </span>
                    </div>
                    {currentPrices && fundData.avgPrices.btc.avgPrice > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Chênh lệch:</span>
                        <span className={`font-semibold ${currentPrices.btcUsdt > fundData.avgPrices.btc.avgPrice ? 'text-green-600' : 'text-red-600'
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