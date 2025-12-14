'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, AlertCircle, Trash2 } from 'lucide-react'
import { Account, ACCOUNT_TYPE_LABELS } from '@/types/account'
import { utcToLocal, getCurrentDatetimeInTimezone, localToUTC } from '@/lib/timezone-utils'
import { usePermission } from '@/contexts/PermissionContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TransactionFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  fundId: string
  initialData?: any
  transactionId?: string
}

const transactionTypes = [
  { value: 'capital_in', label: 'Góp vốn', currency: 'VND' },
  { value: 'capital_out', label: 'Rút vốn/Lợi nhuận', currency: 'VND' },
  { value: 'buy_usdt', label: 'Mua USDT (VND → USDT)', currency: 'USDT' },
  { value: 'sell_usdt', label: 'Bán USDT (USDT → VND)', currency: 'USDT' },
  { value: 'transfer_usdt', label: 'Chuyển USDT', currency: 'USDT' },
  { value: 'buy_btc', label: 'Mua BTC (USDT → BTC)', currency: 'BTC' },
  { value: 'sell_btc', label: 'Bán BTC (BTC → USDT)', currency: 'BTC' },
  { value: 'transfer_btc', label: 'Chuyển BTC', currency: 'BTC' },
  { value: 'earn_interest', label: 'Lãi suất USDT Earn', currency: 'USDT' }
]

export default function TransactionForm({ onSubmit, onCancel, fundId, initialData, transactionId }: TransactionFormProps) {
  const { currentFundTimezone } = usePermission()
  const [formData, setFormData] = useState({
    type: initialData?.type || '',
    amount: initialData?.amount?.toString() || '',
    price: initialData?.price?.toString() || '',
    totalVND: initialData?.price && initialData?.amount ? (parseFloat(initialData.price) * parseFloat(initialData.amount)).toFixed(0) : '',
    fee: initialData?.fee?.toString() || '',
    feeCurrency: initialData?.feeCurrency || '',
    toAccountId: initialData?.accountId || initialData?.toLocation || '',
    fromAccountId: initialData?.fromLocation || '',
    note: initialData?.note || '',
    transactionDate: initialData?.createdAt
      ? utcToLocal(initialData.createdAt, currentFundTimezone)
      : getCurrentDatetimeInTimezone(currentFundTimezone)
  })
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTransactionType = transactionTypes.find(t => t.value === formData.type)
  const needsPrice = ['buy_usdt', 'sell_usdt', 'buy_btc', 'sell_btc'].includes(formData.type)
  const needsTransferLocations = ['transfer_usdt', 'transfer_btc'].includes(formData.type)
  const needsFromAccount = ['sell_usdt', 'buy_btc', 'sell_btc'].includes(formData.type)
  const needsToAccount = ['buy_usdt', 'buy_btc', 'sell_btc', 'earn_interest'].includes(formData.type)
  const needsFee = ['buy_btc', 'sell_btc'].includes(formData.type)

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!fundId) return

      setLoadingAccounts(true)
      try {
        const response = await fetch(`/api/accounts?fundId=${fundId}&activeOnly=true`)
        const data = await response.json()

        if (response.ok) {
          setAccounts(data.accounts)
        }
      } catch (err) {
        console.error('Error fetching accounts:', err)
      } finally {
        setLoadingAccounts(false)
      }
    }

    fetchAccounts()
  }, [fundId])

  // Get account balance helper
  const getAccountBalance = (accountId: string | null, asset: 'USDT' | 'BTC'): number => {
    if (!accountId) return 0
    const account = accounts.find(a => a.id === accountId)
    if (!account || !account.balances) return 0
    return asset === 'USDT' ? account.balances.usdt : account.balances.btc
  }

  // Get selected account
  const selectedFromAccount = accounts.find(a => a.id === formData.fromAccountId)
  const selectedToAccount = accounts.find(a => a.id === formData.toAccountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Validation
    if (!formData.type || !formData.amount) {
      setError('Vui lòng chọn loại giao dịch và nhập số lượng')
      return
    }

    if (needsPrice && !formData.price) {
      setError('Vui lòng nhập giá cho giao dịch này')
      return
    }

    if (needsFromAccount && !formData.fromAccountId) {
      setError('Vui lòng chọn tài khoản nguồn')
      return
    }

    if (needsToAccount && !formData.toAccountId) {
      setError('Vui lòng chọn tài khoản đích')
      return
    }

    if (needsTransferLocations && (!formData.fromAccountId || !formData.toAccountId)) {
      setError('Vui lòng chọn tài khoản gửi và tài khoản nhận')
      setIsSubmitting(false)
      return
    }

    // Prevent transfer to same account
    if (needsTransferLocations && formData.fromAccountId === formData.toAccountId) {
      setError('Không thể chuyển đến cùng tài khoản. Vui lòng chọn tài khoản đích khác')
      setIsSubmitting(false)
      return
    }

    // Balance validation
    const amount = parseFloat(formData.amount)

    // Transfer USDT - check source account balance
    if (formData.type === 'transfer_usdt') {
      const sourceBalance = getAccountBalance(formData.fromAccountId, 'USDT')
      if (amount > sourceBalance) {
        setError(`Số dư USDT không đủ. Có sẵn: ${sourceBalance.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`)
        setIsSubmitting(false)
        return
      }
    }

    // Transfer BTC - check source account balance
    if (formData.type === 'transfer_btc') {
      const sourceBalance = getAccountBalance(formData.fromAccountId, 'BTC')
      if (amount > sourceBalance) {
        setError(`Số dư BTC không đủ. Có sẵn: ${sourceBalance.toLocaleString('vi-VN', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC`)
        setIsSubmitting(false)
        return
      }
    }

    // Sell USDT - check source account balance
    if (formData.type === 'sell_usdt') {
      const sourceBalance = getAccountBalance(formData.fromAccountId, 'USDT')
      if (amount > sourceBalance) {
        setError(`Số dư USDT không đủ. Có sẵn: ${sourceBalance.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`)
        setIsSubmitting(false)
        return
      }
    }

    // Buy BTC - check USDT source account balance
    if (formData.type === 'buy_btc' && formData.price) {
      const price = parseFloat(formData.price)
      const usdtNeeded = amount * price
      const fee = formData.fee && formData.feeCurrency === 'USDT' ? parseFloat(formData.fee) : 0
      const totalUsdtNeeded = usdtNeeded + fee

      const sourceBalance = getAccountBalance(formData.fromAccountId, 'USDT')
      if (totalUsdtNeeded > sourceBalance) {
        setError(`Số dư USDT không đủ. Cần: ${totalUsdtNeeded.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT, Có sẵn: ${sourceBalance.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`)
        setIsSubmitting(false)
        return
      }
    }

    // Sell BTC - check BTC source account balance
    if (formData.type === 'sell_btc') {
      const sourceBalance = getAccountBalance(formData.fromAccountId, 'BTC')
      if (amount > sourceBalance) {
        setError(`Số dư BTC không đủ. Có sẵn: ${sourceBalance.toLocaleString('vi-VN', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC`)
        setIsSubmitting(false)
        return
      }
    }

    try {
      const method = transactionId ? 'PUT' : 'POST'
      const body = {
        fundId,
        id: transactionId,
        ...formData,
        accountId: needsToAccount && !needsFromAccount ? formData.toAccountId : null,
        fromLocation: (needsFromAccount || needsTransferLocations) ? formData.fromAccountId : null,
        toLocation: (needsToAccount || needsTransferLocations) ? formData.toAccountId : null,
        amount: parseFloat(formData.amount),
        price: needsPrice ? parseFloat(formData.price) : null,
        fee: needsFee ? parseFloat(formData.fee) : null,
        currency: selectedTransactionType?.currency || 'VND',
        // Convert transaction date from fund timezone to UTC before saving
        transactionDate: formData.transactionDate
          ? localToUTC(formData.transactionDate, currentFundTimezone)
          : undefined
      }

      const response = await fetch('/api/transactions', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (response.ok) {
        onSubmit(result)
        // Reset form if not editing
        if (!transactionId) {
          setFormData({
            type: '',
            amount: '',
            price: '',
            totalVND: '',
            fee: '',
            feeCurrency: '',
            toAccountId: '',
            fromAccountId: '',
            note: '',
            transactionDate: getCurrentDatetimeInTimezone(currentFundTimezone)
          })
        }
        setError(null)
      } else {
        setError(result.error || 'Lỗi khi lưu giao dịch')
      }
    } catch (error) {
      console.error('Error submitting transaction:', error)
      setError('Lỗi kết nối, vui lòng thử lại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmation !== 'XOA') return

    try {
      const response = await fetch(`/api/transactions?id=${transactionId}&fundId=${fundId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        onSubmit(result) // Refresh parent
      } else {
        setError(result.error || 'Lỗi khi xóa giao dịch')
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      setError('Lỗi kết nối, vui lòng thử lại')
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate for USDT transactions
      const isUSDTTransaction = ['buy_usdt', 'sell_usdt'].includes(prev.type)

      if (isUSDTTransaction) {
        // If user changes amount or price, recalculate totalVND
        if (field === 'amount' || field === 'price') {
          const amount = field === 'amount' ? value : prev.amount
          const price = field === 'price' ? value : prev.price

          if (amount && price && parseFloat(amount) > 0 && parseFloat(price) > 0) {
            updated.totalVND = (parseFloat(amount) * parseFloat(price)).toFixed(0)
          } else if (field === 'amount' && !value) {
            updated.totalVND = ''
          }
        }

        // If user changes totalVND, recalculate price
        if (field === 'totalVND') {
          const amount = prev.amount
          const totalVND = value

          if (amount && totalVND && parseFloat(amount) > 0 && parseFloat(totalVND) > 0) {
            updated.price = (parseFloat(totalVND) / parseFloat(amount)).toFixed(2)
          } else if (!value) {
            updated.price = ''
          }
        }
      }

      return updated
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{transactionId ? 'Chỉnh sửa giao dịch' : 'Tạo giao dịch mới'}</CardTitle>
        <CardDescription>
          {transactionId ? 'Cập nhật thông tin giao dịch' : 'Nhập thông tin chi tiết cho giao dịch của bạn'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loại giao dịch */}
          <div className="space-y-2">
            <Label htmlFor="type">Loại giao dịch</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại giao dịch" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Số lượng */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Số lượng {selectedTransactionType ? `(${selectedTransactionType.currency})` : ''}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              placeholder="Nhập số lượng"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              required
            />
          </div>

          {/* Giá và Tổng VND (cho USDT) hoặc chỉ Giá (cho BTC) */}
          {needsPrice && (
            <>
              {formData.type.includes('usdt') ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Giá (VND/USDT)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="Nhập giá VND/USDT"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalVND">Tổng VND</Label>
                    <Input
                      id="totalVND"
                      type="number"
                      step="1"
                      placeholder="Hoặc nhập tổng VND"
                      value={formData.totalVND}
                      onChange={(e) => handleInputChange('totalVND', e.target.value)}
                    />
                    {formData.totalVND && (
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(formData.totalVND).toLocaleString('vi-VN')} VND
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="price">Giá (USDT/BTC)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="Nhập giá USDT/BTC"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    required
                  />
                </div>
              )}
            </>
          )}

          {/* Phí giao dịch (nếu cần) */}
          {needsFee && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Phí giao dịch</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.00000001"
                  placeholder="Nhập phí"
                  value={formData.fee}
                  onChange={(e) => handleInputChange('fee', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeCurrency">Đơn vị phí</Label>
                <Select value={formData.feeCurrency} onValueChange={(value) => handleInputChange('feeCurrency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn đơn vị" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Tài khoản nguồn (cho giao dịch bán và mua BTC) */}
          {needsFromAccount && (
            <div className="space-y-2">
              <Label htmlFor="fromAccountId">
                {formData.type === 'sell_usdt' ? 'Tài khoản USDT' : formData.type === 'buy_btc' ? 'Tài khoản USDT' : 'Tài khoản BTC'}
              </Label>
              <Select value={formData.fromAccountId} onValueChange={(value) => handleInputChange('fromAccountId', value)} disabled={loadingAccounts}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingAccounts ? "Đang tải..." : "Chọn tài khoản"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({ACCOUNT_TYPE_LABELS[account.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFromAccount && selectedFromAccount.balances && (
                <p className="text-sm text-muted-foreground mt-1">
                  Số dư:
                  {formData.type === 'sell_usdt' || formData.type === 'buy_btc' ? (
                    <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                      {selectedFromAccount.balances.usdt.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </span>
                  ) : (
                    <span className="font-semibold text-orange-600 dark:text-orange-400 ml-1">
                      {selectedFromAccount.balances.btc.toLocaleString('vi-VN', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC
                    </span>
                  )}
                </p>
              )}
              {accounts.length === 0 && !loadingAccounts && (
                <p className="text-sm text-muted-foreground">
                  Chưa có tài khoản. Vui lòng tạo tài khoản trước trong tab &quot;Quản lý tài khoản&quot;.
                </p>
              )}
            </div>
          )}

          {/* Tài khoản đích (cho giao dịch mua) */}
          {needsToAccount && (
            <div className="space-y-2">
              <Label htmlFor="toAccountId">
                {formData.type === 'buy_usdt' ? 'Tài khoản USDT' : formData.type === 'buy_btc' ? 'Tài khoản BTC' : formData.type === 'sell_btc' ? 'Tài khoản USDT' : 'Tài khoản'}
              </Label>
              <Select value={formData.toAccountId} onValueChange={(value) => handleInputChange('toAccountId', value)} disabled={loadingAccounts}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingAccounts ? "Đang tải..." : "Chọn tài khoản"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({ACCOUNT_TYPE_LABELS[account.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {accounts.length === 0 && !loadingAccounts && (
                <p className="text-sm text-muted-foreground">
                  Chưa có tài khoản. Vui lòng tạo tài khoản trước trong tab &quot;Quản lý tài khoản&quot;.
                </p>
              )}
            </div>
          )}

          {/* Tài khoản chuyển (cho giao dịch transfer) */}
          {needsTransferLocations && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccountId">Từ tài khoản</Label>
                <Select value={formData.fromAccountId} onValueChange={(value) => handleInputChange('fromAccountId', value)} disabled={loadingAccounts}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAccounts ? "Đang tải..." : "Chọn tài khoản gửi"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.id !== formData.toAccountId).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFromAccount && selectedFromAccount.balances && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Số dư:
                    {formData.type === 'transfer_usdt' ? (
                      <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                        {selectedFromAccount.balances.usdt.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    ) : (
                      <span className="font-semibold text-orange-600 dark:text-orange-400 ml-1">
                        {selectedFromAccount.balances.btc.toLocaleString('vi-VN', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} BTC
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="toAccountId">Đến tài khoản</Label>
                <Select value={formData.toAccountId} onValueChange={(value) => handleInputChange('toAccountId', value)} disabled={loadingAccounts}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAccounts ? "Đang tải..." : "Chọn tài khoản nhận"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.id !== formData.fromAccountId).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Ghi chú */}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Nhập ghi chú cho giao dịch (không bắt buộc)"
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              rows={3}
            />
          </div>

          {/* Ngày giờ giao dịch */}
          <div className="space-y-2">
            <Label htmlFor="transactionDate">Ngày giờ giao dịch</Label>
            <Input
              id="transactionDate"
              type="datetime-local"
              value={formData.transactionDate}
              onChange={(e) => handleInputChange('transactionDate', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Mặc định là thời điểm hiện tại. Có thể điều chỉnh để ghi nhận giao dịch trong quá khứ.
            </p>
          </div>

          {/* Nút hành động */}
          <div className="flex justify-between items-center">
            {transactionId ? (
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hành động này không thể hoàn tác. Giao dịch sẽ bị xóa vĩnh viễn và toàn bộ lịch sử quỹ sẽ được tính toán lại.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="mt-4">
                    <Label htmlFor="confirm-delete" className="text-sm font-medium text-gray-700">
                      Nhập "XOA" để xác nhận:
                    </Label>
                    <Input
                      id="confirm-delete"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="mt-2"
                      placeholder="XOA"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleteConfirmation !== 'XOA'}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Xóa vĩnh viễn
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div></div> // Spacer
            )}

            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang xử lý...' : (transactionId ? 'Cập nhật' : 'Tạo giao dịch')}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Component modal để mở form
export function TransactionModal({ fundId, transaction, onClose }: { fundId?: string, transaction?: any, onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(!!transaction)

  // If transaction prop is provided, control open state from parent or just use it to init form
  // Actually, if transaction is provided, we assume we are in edit mode and might be controlled by parent.
  // But to keep it simple, let's stick to the existing pattern or adapt.

  // Better pattern: If transaction is passed, we are editing.
  // But the existing usage in page.tsx is <TransactionModal fundId={...} /> which implies it manages its own button.
  // For editing, we probably want to render the modal conditionally or pass `open` state.

  // Let's split this.
  // Keep TransactionModal as a self-contained "Create New" button + modal.
  // Create a new EditTransactionModal or just use the Dialog directly in TransactionHistory.

  // However, to reuse code, let's make TransactionModal accept `open` and `onOpenChange` props optionally.

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open && onClose) onClose()
  }

  // If controlled (e.g. for edit), use props. If not, use internal state.
  // But React hooks can't be conditional.

  // Let's just update the existing component to handle both cases if possible, or just keep it for "Create" and make a new one for "Edit".
  // Actually, replacing the whole file content allows me to rewrite it.

  const handleSubmit = async (data: any) => {
    console.log('Transaction data:', data)
    setIsOpen(false)
    if (onClose) onClose()
    // Trigger page refresh to show new data
    window.location.reload()
  }

  // If transaction is provided, we assume the parent controls opening via a key or conditional rendering.
  // But wait, the parent `TransactionHistory` will likely render this modal when "Edit" is clicked.

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {!transaction && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Giao dịch mới
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Chỉnh sửa giao dịch' : 'Tạo giao dịch mới'}</DialogTitle>
          <DialogDescription>
            {transaction ? 'Cập nhật thông tin giao dịch' : 'Nhập thông tin chi tiết cho giao dịch của bạn'}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          onSubmit={handleSubmit}
          onCancel={() => handleOpenChange(false)}
          fundId={fundId || ''}
          initialData={transaction}
          transactionId={transaction?.id}
        />
      </DialogContent>
    </Dialog>
  )
}