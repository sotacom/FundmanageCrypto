import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, RefreshCw, Pencil } from 'lucide-react'
import { TransactionModal } from './TransactionForm'

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
  earn_interest: 'Lãi suất USDT Earn'
}

export default function TransactionHistory({ fundId, refreshTrigger }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/transactions?fundId=${fundId}&limit=20`)

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('Không thể tải lịch sử giao dịch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fundId) {
      fetchTransactions()
    }
  }, [fundId, refreshTrigger])

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(amount).replace('₫', 'VND')
    } else if (currency === 'BTC') {
      return `${amount.toFixed(8)} BTC`
    } else {
      return `${amount.toLocaleString()} ${currency}`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      default:
        return '📋'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
          <CardDescription>
            Các giao dịch gần đây trong quỹ
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
            Các giao dịch gần đây trong quỹ
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <CardDescription>
                Các giao dịch gần đây trong quỹ
              </CardDescription>
            </div>
            <Button onClick={fetchTransactions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
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
                        <p className="text-sm text-blue-600 mt-1">
                          {transaction.fromLocation && `Từ: ${transaction.fromLocation}`}
                          {transaction.fromLocation && transaction.toLocation && ' → '}
                          {transaction.toLocation && `Đến: ${transaction.toLocation}`}
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
                        <p className="text-sm text-orange-600">
                          Phí: {formatCurrency(transaction.fee, transaction.feeCurrency || transaction.currency)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTransaction(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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