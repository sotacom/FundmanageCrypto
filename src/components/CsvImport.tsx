'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Download, Loader2, ClipboardPaste } from 'lucide-react'
import { usePermission } from '@/contexts/PermissionContext'
import { localToUTC } from '@/lib/timezone-utils'
import Papa from 'papaparse'

interface CsvImportProps {
  fundId: string
}

interface ParsedRow {
  rowNumber: number
  date: string
  type: string
  amount: number
  price?: number
  fee?: number
  feeCurrency?: string
  fromAccount?: string
  toAccount?: string
  note?: string
  // Option fields
  optQty?: number
  optBuyPrice?: number
  optBuyFee?: number
  optSellPrice?: number
  optSellFee?: number
  // Validation
  errors: string[]
  isValid: boolean
}

interface AccountInfo {
  id: string
  name: string
  type: string
}

const VALID_TYPES = [
  'capital_in', 'capital_out', 'buy_usdt', 'sell_usdt', 'transfer_usdt',
  'buy_btc', 'sell_btc', 'transfer_btc', 'earn_interest', 'futures_pnl', 'option_pnl'
]

const TYPE_LABELS: Record<string, string> = {
  capital_in: 'Góp vốn',
  capital_out: 'Rút vốn',
  buy_usdt: 'Mua USDT',
  sell_usdt: 'Bán USDT',
  transfer_usdt: 'Chuyển USDT',
  buy_btc: 'Mua BTC',
  sell_btc: 'Bán BTC',
  transfer_btc: 'Chuyển BTC',
  earn_interest: 'Lãi Earn',
  futures_pnl: 'PnL Futures',
  option_pnl: 'PnL Option',
}

const TYPE_CURRENCY: Record<string, string> = {
  capital_in: 'VND',
  capital_out: 'VND',
  buy_usdt: 'USDT',
  sell_usdt: 'USDT',
  transfer_usdt: 'USDT',
  buy_btc: 'BTC',
  sell_btc: 'BTC',
  transfer_btc: 'BTC',
  earn_interest: 'USDT',
  futures_pnl: 'USDT',
  option_pnl: 'USDT',
}

// Which types require which accounts
const NEEDS_FROM_ACCOUNT = ['sell_usdt', 'buy_btc', 'sell_btc', 'transfer_usdt', 'transfer_btc']
const NEEDS_TO_ACCOUNT = ['buy_usdt', 'buy_btc', 'sell_btc', 'transfer_usdt', 'transfer_btc', 'earn_interest', 'futures_pnl', 'option_pnl']
const NEEDS_PRICE = ['buy_usdt', 'sell_usdt', 'buy_btc', 'sell_btc']

function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined
  // Support both . and , as decimal separator
  const cleaned = value.trim().replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? undefined : num
}

function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null
  const trimmed = value.trim()
  // Try YYYY-MM-DD HH:mm format
  const parts = trimmed.split(/[\s]+/)
  const datePart = parts[0]
  const timePart = parts[1] || '00:00'

  const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateMatch) return null

  const full = `${datePart}T${timePart}`
  const date = new Date(full)
  return isNaN(date.getTime()) ? null : date
}

export default function CsvImport({ fundId }: CsvImportProps) {
  const { currentFundTimezone } = usePermission()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [csvText, setCsvText] = useState<string>('')
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch accounts for name → ID mapping
  useEffect(() => {
    if (!isOpen || !fundId) return
    const fetchAccounts = async () => {
      try {
        const res = await fetch(`/api/accounts?fundId=${fundId}`)
        if (res.ok) {
          const data = await res.json()
          setAccounts(data.accounts || [])
        }
      } catch (err) {
        console.error('Error fetching accounts:', err)
      }
    }
    fetchAccounts()
  }, [isOpen, fundId])

  const findAccountId = (name: string | undefined): string | null => {
    if (!name || name.trim() === '') return null
    const trimmed = name.trim()
    const account = accounts.find(a =>
      a.name.toLowerCase() === trimmed.toLowerCase()
    )
    return account?.id || null
  }

  const validateRow = (row: ParsedRow): string[] => {
    const errors: string[] = []
    const type = row.type

    if (!VALID_TYPES.includes(type)) {
      errors.push(`Loại "${type}" không hợp lệ`)
      return errors
    }

    if (!row.date || !parseDate(row.date)) {
      errors.push('Ngày không hợp lệ')
    }

    // Option type has special validation
    if (type === 'option_pnl') {
      if (!row.optQty || row.optQty <= 0) errors.push('opt_qty phải > 0')
      if (!row.optBuyPrice || row.optBuyPrice <= 0) errors.push('opt_buy_price phải > 0')
      if (row.optSellPrice === undefined) errors.push('opt_sell_price bắt buộc')
      if (NEEDS_TO_ACCOUNT.includes(type) && row.toAccount && !findAccountId(row.toAccount)) {
        errors.push(`Tài khoản "${row.toAccount}" không tồn tại`)
      }
      if (NEEDS_TO_ACCOUNT.includes(type) && !row.toAccount) {
        errors.push('Cần chọn tài khoản đích')
      }
      return errors
    }

    // Standard validation
    if (type === 'futures_pnl') {
      if (row.amount === undefined || isNaN(row.amount)) errors.push('Số lượng không hợp lệ')
    } else {
      if (!row.amount || row.amount <= 0) errors.push('Số lượng phải > 0')
    }

    if (NEEDS_PRICE.includes(type) && (!row.price || row.price <= 0)) {
      errors.push('Giá phải > 0')
    }

    if (NEEDS_FROM_ACCOUNT.includes(type)) {
      if (!row.fromAccount) {
        errors.push('Cần tài khoản nguồn')
      } else if (!findAccountId(row.fromAccount)) {
        errors.push(`Tài khoản "${row.fromAccount}" không tồn tại`)
      }
    }

    if (NEEDS_TO_ACCOUNT.includes(type)) {
      if (!row.toAccount) {
        errors.push('Cần tài khoản đích')
      } else if (!findAccountId(row.toAccount)) {
        errors.push(`Tài khoản "${row.toAccount}" không tồn tại`)
      }
    }

    // Transfer: from ≠ to
    if (['transfer_usdt', 'transfer_btc'].includes(type) && row.fromAccount && row.toAccount) {
      if (row.fromAccount.trim().toLowerCase() === row.toAccount.trim().toLowerCase()) {
        errors.push('Tài khoản nguồn và đích không được giống nhau')
      }
    }

    return errors
  }

  // Shared logic: process parsed CSV data into validated rows
  const processCsvData = (data: any[]) => {
    const rows: ParsedRow[] = data.map((raw: any, index: number) => {
      const type = (raw.type || '').trim().toLowerCase()
      const amount = parseNumber(raw.amount)
      const optQty = parseNumber(raw.opt_qty)
      const optBuyPrice = parseNumber(raw.opt_buy_price)
      const optBuyFee = parseNumber(raw.opt_buy_fee)
      const optSellPrice = parseNumber(raw.opt_sell_price)
      const optSellFee = parseNumber(raw.opt_sell_fee)

      const row: ParsedRow = {
        rowNumber: index + 2, // +2 because header is row 1, data starts at row 2
        date: (raw.date || '').trim(),
        type,
        amount: amount ?? 0,
        price: parseNumber(raw.price),
        fee: parseNumber(raw.fee),
        feeCurrency: (raw.fee_currency || '').trim() || undefined,
        fromAccount: (raw.from_account || '').trim() || undefined,
        toAccount: (raw.to_account || '').trim() || undefined,
        note: (raw.note || '').trim() || undefined,
        optQty,
        optBuyPrice,
        optBuyFee: optBuyFee ?? 0,
        optSellPrice,
        optSellFee: optSellFee ?? 0,
        errors: [],
        isValid: true,
      }

      row.errors = validateRow(row)
      row.isValid = row.errors.length === 0
      return row
    })

    setParsedRows(rows)
    setStep('preview')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setInputMode('file')
    setImportError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => processCsvData(results.data),
      error: (error) => {
        setImportError(`Lỗi đọc file CSV: ${error.message}`)
      }
    })

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePasteSubmit = () => {
    const text = csvText.trim()
    if (!text) {
      setImportError('Vui lòng dán nội dung CSV')
      return
    }

    setFileName('Dán trực tiếp')
    setInputMode('paste')
    setImportError(null)

    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (results.errors && results.errors.length > 0) {
      const firstErr = results.errors[0]
      setImportError(`Lỗi parse CSV dòng ${(firstErr as any).row ? (firstErr as any).row + 2 : '?'}: ${(firstErr as any).message || 'Không rõ'}`)
      return
    }

    if (!results.data || results.data.length === 0) {
      setImportError('Không tìm thấy dữ liệu trong nội dung CSV')
      return
    }

    processCsvData(results.data)
  }

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid)
    if (validRows.length === 0) return

    setStep('importing')
    setImportError(null)

    try {
      // Convert parsed rows to API format
      const transactions = validRows.map(row => {
        let type = row.type
        let amount = row.amount
        let fee = row.fee ?? null
        let feeCurrency = row.feeCurrency ?? null
        let note = row.note ?? null

        // Handle option_pnl → futures_pnl conversion
        if (type === 'option_pnl') {
          const qty = row.optQty || 0
          const buyPrice = row.optBuyPrice || 0
          const sellPrice = row.optSellPrice || 0
          const buyFee = row.optBuyFee || 0
          const sellFee = row.optSellFee || 0

          type = 'futures_pnl'
          amount = (sellPrice - buyPrice) * qty
          fee = buyFee + sellFee
          feeCurrency = 'USDT'
          const details = `Qty: ${qty}, Buy: ${buyPrice} USDT, Sell: ${sellPrice} USDT, BuyFee: ${buyFee} USDT, SellFee: ${sellFee} USDT`
          note = `[Option] ${row.note ? row.note + ' | ' : ''}${details}`
        }

        const currency = TYPE_CURRENCY[row.type] || 'USDT'

        // Map account names to IDs
        const fromAccountId = findAccountId(row.fromAccount) || null
        const toAccountId = findAccountId(row.toAccount) || null

        // Determine accountId based on type
        const needsFrom = NEEDS_FROM_ACCOUNT.includes(row.type)
        const needsTo = NEEDS_TO_ACCOUNT.includes(row.type)
        const accountId = (needsTo && !needsFrom) ? toAccountId : null

        // Convert date from fund timezone to UTC
        const dateStr = row.date.includes('T') ? row.date : row.date.replace(' ', 'T')
        const transactionDate = localToUTC(dateStr, currentFundTimezone)

        return {
          type,
          amount,
          currency,
          price: row.price ?? null,
          fee,
          feeCurrency,
          fromLocation: (needsFrom || ['transfer_usdt', 'transfer_btc'].includes(row.type)) ? fromAccountId : null,
          toLocation: (needsTo || ['transfer_usdt', 'transfer_btc'].includes(row.type)) ? toAccountId : null,
          accountId,
          note,
          transactionDate,
        }
      })

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId, transactions })
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({ imported: result.imported })
        setStep('done')
      } else {
        setImportError(result.error || 'Lỗi khi import')
        if (result.details) {
          setImportError(result.error + '\n' + result.details.join('\n'))
        }
        setStep('preview')
      }
    } catch (err) {
      console.error('Import error:', err)
      setImportError('Lỗi kết nối server')
      setStep('preview')
    }
  }

  const resetState = () => {
    setStep('upload')
    setParsedRows([])
    setImportResult(null)
    setImportError(null)
    setFileName('')
    setCsvText('')
  }

  const handleClose = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // If we completed import, reload page to refresh data
      if (step === 'done') {
        window.location.reload()
      }
      resetState()
    }
  }

  const validCount = parsedRows.filter(r => r.isValid).length
  const errorCount = parsedRows.filter(r => !r.isValid).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import giao dịch từ CSV</DialogTitle>
          <DialogDescription>
            Upload file CSV hoặc dán nội dung CSV để import nhiều giao dịch cùng lúc
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload / Paste */}
        {step === 'upload' && (
          <div className="space-y-4">
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Upload file
                </TabsTrigger>
                <TabsTrigger value="paste" className="flex items-center gap-1.5">
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Dán nội dung
                </TabsTrigger>
              </TabsList>

              {/* Tab: Upload file */}
              <TabsContent value="file" className="mt-4">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Nhấn để chọn file CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Hỗ trợ tối đa 1000 dòng</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </TabsContent>

              {/* Tab: Paste CSV */}
              <TabsContent value="paste" className="mt-4 space-y-3">
                <textarea
                  className="w-full h-48 p-3 text-sm font-mono border rounded-lg bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
                  placeholder={`Dán nội dung CSV vào đây...\n\nVí dụ:\ndate,type,amount,price,fee,fee_currency,from_account,to_account,note\n2026-03-01 09:00,capital_in,300000000,,,,,,Góp vốn`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {csvText.trim() ? `${csvText.trim().split('\n').length} dòng (bao gồm header)` : 'Chưa có nội dung'}
                  </p>
                  <Button
                    onClick={handlePasteSubmit}
                    disabled={!csvText.trim()}
                    size="sm"
                  >
                    Phân tích nội dung
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Chưa biết format? Tải file mẫu</span>
              </div>
              <Button variant="link" size="sm" asChild>
                <a href="/templates/transactions_template.csv" download>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Template CSV
                </a>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 p-3 border rounded-lg">
              <p className="font-medium mb-2">Hướng dẫn nhanh:</p>
              <p>• Cột <code className="px-1 bg-muted rounded">type</code>: capital_in, buy_usdt, sell_btc, futures_pnl, option_pnl, v.v.</p>
              <p>• Cột <code className="px-1 bg-muted rounded">from_account</code>, <code className="px-1 bg-muted rounded">to_account</code>: dùng <strong>tên tài khoản</strong> (ví dụ: &quot;Binance 1&quot;)</p>
              <p>• Cột <code className="px-1 bg-muted rounded">date</code>: format <code className="px-1 bg-muted rounded">YYYY-MM-DD HH:mm</code></p>
              <p>• Với <code className="px-1 bg-muted rounded">option_pnl</code>: điền thêm <code className="px-1 bg-muted rounded">opt_qty</code>, <code className="px-1 bg-muted rounded">opt_buy_price</code>, <code className="px-1 bg-muted rounded">opt_sell_price</code>, v.v.</p>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                {inputMode === 'paste' ? <ClipboardPaste className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {fileName}
              </Badge>
              <Badge variant="secondary" className="text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validCount} hợp lệ
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  {errorCount} lỗi
                </Badge>
              )}
            </div>

            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-line">{importError}</AlertDescription>
              </Alert>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Trạng thái</th>
                    <th className="px-3 py-2 text-left">Ngày</th>
                    <th className="px-3 py-2 text-left">Loại</th>
                    <th className="px-3 py-2 text-right">Số lượng</th>
                    <th className="px-3 py-2 text-right">Giá</th>
                    <th className="px-3 py-2 text-right">Phí</th>
                    <th className="px-3 py-2 text-left">Từ</th>
                    <th className="px-3 py-2 text-left">Đến</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.isValid
                        ? 'border-t hover:bg-muted/20'
                        : 'border-t bg-red-50 dark:bg-red-950/20'
                      }
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="flex items-start gap-1">
                            <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <span className="text-xs text-red-600">{row.errors.join('; ')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{row.date}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {TYPE_LABELS[row.type] || row.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">
                        {row.type === 'option_pnl'
                          ? `PnL: ${(((row.optSellPrice || 0) - (row.optBuyPrice || 0)) * (row.optQty || 0)).toFixed(2)}`
                          : row.amount?.toLocaleString('de-DE', { minimumFractionDigits: 2 })
                        }
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {row.price?.toLocaleString() || ''}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {row.type === 'option_pnl'
                          ? ((row.optBuyFee || 0) + (row.optSellFee || 0)).toFixed(2)
                          : row.fee?.toLocaleString() || ''
                        }
                      </td>
                      <td className="px-3 py-2 text-xs truncate max-w-[120px]">{row.fromAccount || ''}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[120px]">{row.toAccount || ''}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[150px]">{row.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={resetState}>
                ← Nhập lại
              </Button>
              <div className="flex items-center gap-3">
                {errorCount > 0 && (
                  <p className="text-sm text-red-600">
                    Sửa {errorCount} lỗi trước khi import
                  </p>
                )}
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || errorCount > 0}
                >
                  Import {validCount} giao dịch
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Đang import {validCount} giao dịch...</p>
            <p className="text-xs text-muted-foreground">Vui lòng không đóng cửa sổ này</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && importResult && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="text-lg font-semibold">Import thành công!</p>
            <p className="text-sm text-muted-foreground">
              Đã import {importResult.imported} giao dịch và tính toán lại quỹ.
            </p>
            <Button onClick={() => handleClose(false)}>
              Đóng
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
