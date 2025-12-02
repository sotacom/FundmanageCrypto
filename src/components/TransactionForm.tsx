'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, AlertCircle, Trash2 } from 'lucide-react'
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

const locations = [
  'Binance Spot',
  'Binance Earn',
  'Ví lạnh 1',
  'Ví lạnh 2',
  'Ví khác'
]

export default function TransactionForm({ onSubmit, onCancel, fundId, initialData, transactionId }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: initialData?.type || '',
    amount: initialData?.amount?.toString() || '',
    price: initialData?.price?.toString() || '',
    fee: initialData?.fee?.toString() || '',
    feeCurrency: initialData?.feeCurrency || '',
    fromLocation: initialData?.fromLocation || '',
    toLocation: initialData?.toLocation || '',
    note: initialData?.note || ''
  })
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const selectedTransactionType = transactionTypes.find(t => t.value === formData.type)
  const needsPrice = ['buy_usdt', 'sell_usdt', 'buy_btc', 'sell_btc'].includes(formData.type)
  const needsLocations = ['transfer_usdt', 'transfer_btc'].includes(formData.type)
  const needsFee = ['buy_btc', 'sell_btc'].includes(formData.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.type || !formData.amount) {
      setError('Vui lòng chọn loại giao dịch và nhập số lượng')
      return
    }

    if (needsPrice && !formData.price) {
      setError('Vui lòng nhập giá cho giao dịch này')
      return
    }

    if (needsLocations && (!formData.fromLocation || !formData.toLocation)) {
      setError('Vui lòng chọn nơi gửi và nơi nhận')
      return
    }

    try {
      const method = transactionId ? 'PUT' : 'POST'
      const body = {
        fundId,
        id: transactionId,
        ...formData,
        amount: parseFloat(formData.amount),
        price: needsPrice ? parseFloat(formData.price) : null,
        fee: needsFee ? parseFloat(formData.fee) : null,
        currency: selectedTransactionType?.currency || 'VND'
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
            fee: '',
            feeCurrency: '',
            fromLocation: '',
            toLocation: '',
            note: ''
          })
        }
        setError(null)
      } else {
        setError(result.error || 'Lỗi khi lưu giao dịch')
      }
    } catch (error) {
      console.error('Error submitting transaction:', error)
      setError('Lỗi kết nối, vui lòng thử lại')
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
    setFormData(prev => ({ ...prev, [field]: value }))
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

          {/* Giá (nếu cần) */}
          {needsPrice && (
            <div className="space-y-2">
              <Label htmlFor="price">
                Giá {formData.type.includes('usdt') ? '(VND/USDT)' : '(USDT/BTC)'}
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder={formData.type.includes('usdt') ? "Nhập giá VND/USDT" : "Nhập giá USDT/BTC"}
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
            </div>
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

          {/* Nơi gửi/Nơi nhận (cho giao dịch chuyển khoản) */}
          {needsLocations && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromLocation">Từ</Label>
                <Select value={formData.fromLocation} onValueChange={(value) => handleInputChange('fromLocation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nơi gửi" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toLocation">Đến</Label>
                <Select value={formData.toLocation} onValueChange={(value) => handleInputChange('toLocation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nơi nhận" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
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
                    </AlertDialogDescription>
                  </AlertDialogHeader>
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
              <Button type="button" variant="outline" onClick={onCancel}>
                Hủy
              </Button>
              <Button type="submit">
                {transactionId ? 'Cập nhật' : 'Tạo giao dịch'}
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