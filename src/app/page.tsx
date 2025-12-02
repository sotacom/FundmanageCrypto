'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, TrendingDown, Wallet, DollarSign, Bitcoin } from 'lucide-react'
import { TransactionModal } from '@/components/TransactionForm'
import TransactionHistory from '@/components/TransactionHistory'

interface FundData {
  id: string
  name: string
  initialVnd: number
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
    usdtPerVnd: number
    btcPerUsdt: number
  }
}

export default function FundDashboard() {
  const [fundData, setFundData] = useState<FundData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchFundData = async () => {
      try {
        // First, try to initialize demo data
        const initResponse = await fetch('/api/init', { method: 'POST' })
        const initData = await initResponse.json()
        
        if (initData.success) {
          const fundId = initData.fundId
          
          // Fetch NAV data
          const navResponse = await fetch(`/api/nav?fundId=${fundId}&usdtVndPrice=25500&btcUsdtPrice=43000`)
          
          if (navResponse.ok) {
            const navData = await navResponse.json()
            
            // Transform API data to component format
            const transformedData: FundData = {
              id: navData.fund.id,
              name: navData.fund.name,
              initialVnd: navData.fund.initialVnd,
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
            usdtPerVnd: 25500,
            btcPerUsdt: 43000
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
              <p className="text-sm text-gray-500">Quản lý quỹ đầu tư cá nhân</p>
            </div>
            <TransactionModal fundId={fundData?.id} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng NAV (VND)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(fundData.currentNav.vnd, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground">
                Vốn ban đầu: {formatCurrency(fundData.initialVnd, 'VND')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lãi/Lỗ Chưa Hiện Thực</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fundData.unrealizedPnL.vnd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fundData.unrealizedPnL.vnd >= 0 ? '+' : ''}{formatCurrency(fundData.unrealizedPnL.vnd, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground">
                {fundData.unrealizedPnL.percentage >= 0 ? '+' : ''}{fundData.unrealizedPnL.percentage.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lãi/Lỗ Đã Hiện Thực</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fundData.realizedPnL.vnd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fundData.realizedPnL.vnd >= 0 ? '+' : ''}{formatCurrency(fundData.realizedPnL.vnd, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground">
                USDT: {fundData.realizedPnL.usdt >= 0 ? '+' : ''}{fundData.realizedPnL.usdt.toLocaleString()} USDT
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Lãi/Lỗ</CardTitle>
              <Bitcoin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(fundData.unrealizedPnL.vnd + fundData.realizedPnL.vnd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(fundData.unrealizedPnL.vnd + fundData.realizedPnL.vnd) >= 0 ? '+' : ''}{formatCurrency(fundData.unrealizedPnL.vnd + fundData.realizedPnL.vnd, 'VND')}
              </div>
              <p className="text-xs text-muted-foreground">
                Tổng lợi nhuận từ khi bắt đầu
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="holdings">Sở hữu tài sản</TabsTrigger>
            <TabsTrigger value="nav-analysis">Phân tích NAV</TabsTrigger>
            <TabsTrigger value="prices">Giá trung bình</TabsTrigger>
            <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
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
                    {formatCurrency(fundData.holdings.usdt * fundData.avgPrices.usdtPerVnd, 'VND')}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tỷ trọng:</span>
                      <span className="font-medium">
                        {((fundData.holdings.usdt * fundData.avgPrices.usdtPerVnd / fundData.currentNav.vnd) * 100).toFixed(1)}%
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
                    {formatCurrency(fundData.holdings.btc * fundData.avgPrices.btcPerUsdt * fundData.avgPrices.usdtPerVnd, 'VND')}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tỷ trọng:</span>
                      <span className="font-medium">
                        {((fundData.holdings.btc * fundData.avgPrices.btcPerUsdt * fundData.avgPrices.usdtPerVnd / fundData.currentNav.vnd) * 100).toFixed(1)}%
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
                    <span>USDT (tỷ giá {fundData.avgPrices.usdtPerVnd.toLocaleString()}):</span>
                    <span className="font-medium">
                      {formatCurrency(fundData.holdings.usdt * fundData.avgPrices.usdtPerVnd, 'VND')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTC ({fundData.avgPrices.btcPerUsdt.toLocaleString()} USDT):</span>
                    <span className="font-medium">
                      {formatCurrency(fundData.holdings.btc * fundData.avgPrices.btcPerUsdt * fundData.avgPrices.usdtPerVnd, 'VND')}
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
                      {(fundData.holdings.vnd / fundData.avgPrices.usdtPerVnd).toLocaleString()} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>USDT:</span>
                    <span className="font-medium">{fundData.holdings.usdt.toLocaleString()} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTC:</span>
                    <span className="font-medium">
                      {(fundData.holdings.btc * fundData.avgPrices.btcPerUsdt).toLocaleString()} USDT
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

          <TabsContent value="prices" className="space-y-4">
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
                    {fundData.avgPrices.usdtPerVnd.toLocaleString()} VND/USDT
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng USDT đã mua:</span>
                      <span>5,000 USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng VND đã chi:</span>
                      <span>{formatCurrency(127500000, 'VND')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">USDT từ Earn:</span>
                      <span>500 USDT</span>
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
                    {fundData.avgPrices.btcPerUsdt.toLocaleString()} USDT/BTC
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng BTC đã mua:</span>
                      <span>{formatCurrency(fundData.holdings.btc, 'BTC')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng USDT đã chi:</span>
                      <span>2,150 USDT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giá hiện tại:</span>
                      <span>43,500 USDT</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionHistory fundId={fundData.id} refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}