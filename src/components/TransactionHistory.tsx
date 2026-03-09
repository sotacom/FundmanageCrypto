import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown, RefreshCw, Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react'
import { TransactionModal } from './TransactionForm'
import { formatCurrency } from '@/lib/format'
import { formatDateInTimezone } from '@/lib/timezone-utils'
import { usePermission } from '@/contexts/PermissionContext'

interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  price?: number
  fee?: number
  feeCurrency?: string
  fromLocation?: string
  toLocation?: string
  note?: string
  createdAt: string
  account?: {
    name: string
    type: string
  }
}

interface TransactionHistoryProps {
  fundId: string
  refreshTrigger?: number
}

const transactionTypeLabels: Record<string, string> = {
  capital_in: 'Góp vốn',
  capital_out: 'Rút vốn/Lợi nhuận',
  buy_usdt: 'Mua USDT',
  sell_usdt: 'Bán USDT',
  transfer_usdt: 'Chuyển USDT',
  buy_btc: 'Mua BTC',
  sell_btc: 'Bán BTC',
  transfer_btc: 'Chuyển BTC',
  earn_interest: 'Lãi suất USDT Earn',
  futures_pnl: 'PnL Futures'
}

const PAGE_SIZE = 15

export default function TransactionHistory({ fundId, refreshTrigger }: TransactionHistoryProps) {
  const { canEdit, currentFundTimezone } = usePermission()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [accountMap, setAccountMap] = useState<Record<string, string>>({})

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)

  // Filter state
  const [filterType, setFilterType] = useState<string>('all')

  const totalPages = Math.max(1, Math.ceil(totalTransactions / PAGE_SIZE))

  // Fetch accounts to map IDs to names
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`/api/accounts?fundId=${fundId}`)
        if (response.ok) {
          const data = await response.json()
          const map: Record<string, string> = {}
          for (const acc of data.accounts || []) {
            map[acc.id] = acc.name
          }
          setAccountMap(map)
        }
      } catch (err) {
        console.error('Error fetching accounts for names:', err)
      }
    }
    if (fundId) fetchAccounts()
  }, [fundId])

  const getAccountName = (id?: string) => {
    if (!id) return null
    return accountMap[id] || id
  }

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const offset = (currentPage - 1) * PAGE_SIZE
      let url = `/api/transactions?fundId=${fundId}&limit=${PAGE_SIZE}&offset=${offset}`
      if (filterType && filterType !== 'all') {
        url += `&type=${filterType}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setTotalTransactions(data.total || 0)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('Không thể tải lịch sử giao dịch')
    } finally {
      setLoading(false)
    }
  }, [fundId, currentPage, filterType])

  useEffect(() => {
    if (fundId) {
      fetchTransactions()
    }
  }, [fundId, refreshTrigger, fetchTransactions])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType])

  const formatDate = (dateString: string) => {
    return formatDateInTimezone(dateString, currentFundTimezone)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'capital_in':
        return '📥'
      case 'capital_out':
        return '📤'
      case 'buy_usdt':
      case 'buy_btc':
        return '🛒'
      case 'sell_usdt':
      case 'sell_btc':
        return '💰'
      case 'transfer_usdt':
      case 'transfer_btc':
        return '🔄'
      case 'earn_interest':
        return '📈'
      case 'futures_pnl':
        return '📊'
      default:
        return '📋'
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  if (loading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
          <CardDescription>
            Các giao dịch trong quỹ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Đang tải...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
          <CardDescription>
            Các giao dịch trong quỹ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTransactions} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <CardDescription>
                {totalTransactions > 0
                  ? `Tổng cộng ${totalTransactions} giao dịch${filterType !== 'all' ? ` (đang lọc: ${transactionTypeLabels[filterType]})` : ''}`
                  : 'Các giao dịch trong quỹ'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] h-9">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Lọc giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(transactionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchTransactions} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType !== 'all'
                  ? `Không có giao dịch "${transactionTypeLabels[filterType]}" nào`
                  : 'Chưa có giao dịch nào'
                }
              </p>
              {filterType !== 'all' && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setFilterType('all')}
                >
                  Xem tất cả giao dịch
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className={`space-y-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {transactionTypeLabels[transaction.type] || transaction.type}
                          </p>
                          {transaction.account && (
                            <Badge variant="secondary" className="text-xs">
                              {transaction.account.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </p>
                        {transaction.note && (
                          <p className="text-sm text-gray-600 mt-1">{transaction.note}</p>
                        )}
                        {(transaction.fromLocation || transaction.toLocation) && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            {transaction.fromLocation && `Từ: ${getAccountName(transaction.fromLocation)}`}
                            {transaction.fromLocation && transaction.toLocation && ' → '}
                            {transaction.toLocation && `Đến: ${getAccountName(transaction.toLocation)}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        {transaction.price && (
                          <p className="text-sm text-muted-foreground">
                            Giá: {transaction.type.includes('usdt')
                              ? `${transaction.price.toLocaleString()} VND/USDT`
                              : `${transaction.price.toLocaleString()} USDT/BTC`
                            }
                          </p>
                        )}
                        {transaction.fee && transaction.fee > 0 && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                            <span>💳</span>
                            <span>Phí: {formatCurrency(transaction.fee, transaction.feeCurrency || transaction.currency)}</span>
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTransaction(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Trang {currentPage}/{totalPages} · Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalTransactions)} / {totalTransactions}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1 || loading}
                      title="Trang đầu"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      title="Trang trước"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page number buttons */}
                    {(() => {
                      const pages: number[] = []
                      let start = Math.max(1, currentPage - 2)
                      let end = Math.min(totalPages, currentPage + 2)

                      // Ensure we always show 5 pages if possible
                      if (end - start < 4) {
                        if (start === 1) {
                          end = Math.min(totalPages, start + 4)
                        } else {
                          start = Math.max(1, end - 4)
                        }
                      }

                      for (let i = start; i <= end; i++) {
                        pages.push(i)
                      }

                      return pages.map(page => (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => goToPage(page)}
                          disabled={loading}
                        >
                          {page}
                        </Button>
                      ))
                    })()}

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      title="Trang sau"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages || loading}
                      title="Trang cuối"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {editingTransaction && (
        <TransactionModal
          fundId={fundId}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </>
  )
}