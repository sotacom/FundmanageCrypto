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
import { Plus, AlertCircle } from 'lucide-react'

interface TransactionFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  fundId: string
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

export default function TransactionForm({ onSubmit, onCancel, fundId }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    price: '',
    fee: '',
    feeCurrency: '',
    fromLocation: '',
    toLocation: '',
    note: ''
  })
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fundId,
          ...formData,
          amount: parseFloat(formData.amount),
          price: needsPrice ? parseFloat(formData.price) : null,
          fee: needsFee ? parseFloat(formData.fee) : null,
          currency: selectedTransactionType?.currency || 'VND'
        })
      })

      const result = await response.json()

      if (response.ok) {
        onSubmit(result)
        // Reset form
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
        setError(null)
      } else {
        setError(result.error || 'Lỗi khi tạo giao dịch')
      }
    } catch (error) {
      console.error('Error submitting transaction:', error)
      setError('Lỗi kết nối, vui lòng thử lại')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Tạo giao dịch mới</CardTitle>
        <CardDescription>
          Nhập thông tin chi tiết cho giao dịch của bạn
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
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit">
              Tạo giao dịch
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Component modal để mở form
export function TransactionModal({ fundId }: { fundId?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async (data: any) => {
    console.log('Transaction data:', data)
    // TODO: Call API to save transaction
    setIsOpen(false)
    // Trigger page refresh to show new data
    window.location.reload()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Giao dịch mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo giao dịch mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin chi tiết cho giao dịch của bạn
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
          fundId={fundId || ''}
        />
      </DialogContent>
    </Dialog>
  )
}