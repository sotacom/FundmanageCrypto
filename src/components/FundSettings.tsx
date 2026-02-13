'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { InfoIcon, Loader2, Download, Upload, AlertTriangle, CheckCircle2, Database, Pencil } from 'lucide-react'
import { parseBackupFile, getLastBackupTimestamp, formatBackupTimestamp, checkBackupCompatibility } from '@/lib/backup-utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COMMON_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezone-utils'
import type { BackupData } from '@/lib/backup-utils'

interface FundSettingsProps {
    fundId: string
    fundName: string
    fundDescription?: string | null
    fundTimezone: string
    currentMethod: 'reduce_avg_price' | 'keep_avg_price'
    onSettingsChanged?: () => void
}

export default function FundSettings({ fundId, fundName, fundDescription, fundTimezone, currentMethod, onSettingsChanged }: FundSettingsProps) {
    const [method, setMethod] = useState<'reduce_avg_price' | 'keep_avg_price'>(currentMethod)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Fund info states
    const [editingName, setEditingName] = useState(false)
    const [name, setName] = useState(fundName)
    const [description, setDescription] = useState(fundDescription || '')
    const [timezone, setTimezone] = useState(fundTimezone)
    const [savingInfo, setSavingInfo] = useState(false)
    const [infoSuccess, setInfoSuccess] = useState(false)

    // Backup & Restore states
    const [backupLoading, setBackupLoading] = useState(false)
    const [restoreLoading, setRestoreLoading] = useState(false)
    const [lastBackup, setLastBackup] = useState<string | null>(null)
    const [showRestoreDialog, setShowRestoreDialog] = useState(false)
    const [backupPreview, setBackupPreview] = useState<BackupData | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [restoreError, setRestoreError] = useState<string | null>(null)
    const [restoreSuccess, setRestoreSuccess] = useState(false)
    const [restoreTimezone, setRestoreTimezone] = useState(DEFAULT_TIMEZONE) // For v1.0 backup restore
    const [backupNeedsTimezone, setBackupNeedsTimezone] = useState(false) // v1.0 backup flag
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Recalculate states
    const [recalculating, setRecalculating] = useState(false)
    const [recalculateSuccess, setRecalculateSuccess] = useState(false)
    const [recalculateError, setRecalculateError] = useState<string | null>(null)

    const handleRecalculate = async () => {
        setRecalculating(true)
        setRecalculateError(null)
        setRecalculateSuccess(false)

        try {
            const response = await fetch('/api/funds/recalculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fundId })
            })

            const data = await response.json()

            if (response.ok) {
                setRecalculateSuccess(true)
                if (onSettingsChanged) {
                    onSettingsChanged()
                }
                setTimeout(() => setRecalculateSuccess(false), 3000)
            } else {
                setRecalculateError(data.error || 'Failed to recalculate')
            }
        } catch (error) {
            console.error('Error recalculating:', error)
            setRecalculateError('Failed to connect to server')
        } finally {
            setRecalculating(false)
        }
    }

    // Sync internal state when prop changes (after successful save & refresh)
    useEffect(() => {
        setMethod(currentMethod)
    }, [currentMethod])

    useEffect(() => {
        setName(fundName)
        setDescription(fundDescription || '')
        setTimezone(fundTimezone)
    }, [fundName, fundDescription, fundTimezone])

    // Load last backup timestamp on mount
    useEffect(() => {
        const timestamp = getLastBackupTimestamp()
        setLastBackup(timestamp)
    }, [])

    const handleSaveInfo = async () => {
        if (!name.trim()) {
            setError('Tên quỹ không được để trống')
            return
        }

        setSavingInfo(true)
        setError(null)
        setInfoSuccess(false)

        try {
            const response = await fetch('/api/funds/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fundId,
                    name: name.trim(),
                    description: description.trim() || null,
                    timezone
                })
            })

            const data = await response.json()

            if (response.ok) {
                setInfoSuccess(true)
                setEditingName(false)
                if (onSettingsChanged) {
                    onSettingsChanged()
                }
                setTimeout(() => setInfoSuccess(false), 3000)
            } else {
                setError(data.error || 'Không thể cập nhật thông tin quỹ')
            }
        } catch (err) {
            console.error('Error saving fund info:', err)
            setError('Không thể cập nhật thông tin quỹ')
        } finally {
            setSavingInfo(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSuccess(false)

        try {
            const response = await fetch('/api/funds/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fundId,
                    earnInterestMethod: method
                })
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(true)
                // Notify parent component to refresh data
                if (onSettingsChanged) {
                    onSettingsChanged()
                }
                setTimeout(() => setSuccess(false), 3000)
            } else {
                setError(data.error || 'Failed to update settings')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            setError('Failed to update settings')
        } finally {
            setSaving(false)
        }
    }

    // Handle backup export
    const handleExportBackup = async () => {
        setBackupLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/backup?fundId=${fundId}`)

            if (!response.ok) {
                throw new Error('Failed to create backup')
            }

            const blob = await response.blob()
            const contentDisposition = response.headers.get('Content-Disposition')
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
            const filename = filenameMatch ? filenameMatch[1] : `backup-${new Date().toISOString()}.json`

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            // Update last backup timestamp
            const timestamp = new Date().toISOString()
            localStorage.setItem('lastBackupTimestamp', timestamp)
            setLastBackup(timestamp)

            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (error) {
            console.error('Error exporting backup:', error)
            setError('Không thể xuất bản sao lưu. Vui lòng thử lại.')
        } finally {
            setBackupLoading(false)
        }
    }

    // Handle file selection for restore
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setRestoreError(null)

        try {
            const data = await parseBackupFile(file)
            setBackupPreview(data)

            // Check if this is a v1.0 backup that needs timezone selection
            const compatibility = checkBackupCompatibility(data.version)
            setBackupNeedsTimezone(compatibility.needsTimezone || false)

            setShowRestoreDialog(true)
            setConfirmDelete(false)
        } catch (error) {
            setRestoreError(error instanceof Error ? error.message : 'Không thể đọc file backup')
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Handle restore confirmation
    const handleConfirmRestore = async () => {
        if (!backupPreview || !confirmDelete) return

        setRestoreLoading(true)
        setRestoreError(null)

        try {
            const response = await fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetFundId: fundId,  // Use current fund as target
                    backupData: backupPreview,
                    timezone: backupNeedsTimezone ? restoreTimezone : undefined // Only for v1.0 backups
                })
            })

            const result = await response.json()

            if (response.ok) {
                setRestoreSuccess(true)
                setShowRestoreDialog(false)
                setBackupPreview(null)
                setConfirmDelete(false)

                // Notify parent to refresh
                if (onSettingsChanged) {
                    onSettingsChanged()
                }

                setTimeout(() => setRestoreSuccess(false), 5000)
            } else {
                setRestoreError(result.error || 'Không thể phục hồi dữ liệu')
            }
        } catch (error) {
            console.error('Error restoring backup:', error)
            setRestoreError('Không thể kết nối tới server. Vui lòng thử lại.')
        } finally {
            setRestoreLoading(false)
        }
    }

    return (
        <>
            {/* Fund Info Card */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Thông Tin Quỹ
                        {!editingName && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingName(true)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Tên và mô tả quỹ đầu tư
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {editingName ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="fundName">Tên quỹ</Label>
                                <Input
                                    id="fundName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nhập tên quỹ"
                                    disabled={savingInfo}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fundDescription">Mô tả (tùy chọn)</Label>
                                <Textarea
                                    id="fundDescription"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Mô tả ngắn về quỹ"
                                    disabled={savingInfo}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fundTimezone">Múi giờ</Label>
                                <Select value={timezone} onValueChange={setTimezone} disabled={savingInfo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn múi giờ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COMMON_TIMEZONES.map((tz) => (
                                            <SelectItem key={tz.value} value={tz.value}>
                                                {tz.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Dùng để hiển thị ngày giờ giao dịch
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditingName(false)
                                        setName(fundName)
                                        setDescription(fundDescription || '')
                                    }}
                                    disabled={savingInfo}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSaveInfo}
                                    disabled={savingInfo || !name.trim()}
                                >
                                    {savingInfo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <Label className="text-muted-foreground text-sm">Tên quỹ</Label>
                                <p className="font-medium text-lg">{fundName}</p>
                            </div>
                            {fundDescription && (
                                <div>
                                    <Label className="text-muted-foreground text-sm">Mô tả</Label>
                                    <p className="text-sm">{fundDescription}</p>
                                </div>
                            )}
                            <div>
                                <Label className="text-muted-foreground text-sm">Múi giờ</Label>
                                <p className="text-sm">
                                    {COMMON_TIMEZONES.find(tz => tz.value === fundTimezone)?.label || fundTimezone}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Info Success Message */}
                    {infoSuccess && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-100">
                                ✓ Thông tin quỹ đã được cập nhật!
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cài Đặt Tính Toán</CardTitle>
                    <CardDescription>
                        Cấu hình cách tính giá mua trung bình và các metrics khác
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Setting: Earn Interest Method */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">
                            Cách tính giá TB khi nhận lãi Earn USDT
                        </Label>

                        <RadioGroup value={method} onValueChange={(val) => setMethod(val as any)}>
                            <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                                <RadioGroupItem value="reduce_avg_price" id="reduce" />
                                <div className="space-y-1 leading-none flex-1">
                                    <Label htmlFor="reduce" className="font-medium cursor-pointer">
                                        Giảm giá trung bình (mặc định)
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Coi lãi Earn như "mua USDT với giá 0". Giá mua TB sẽ giảm xuống.
                                    </p>
                                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                                        <strong>Ví dụ:</strong> 1000 USDT giá TB 25,500 + Earn 100 USDT
                                        → Giá TB mới = (1000×25500 + 100×0) / 1100 = 23,182 VND/USDT
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                                <RadioGroupItem value="keep_avg_price" id="keep" />
                                <div className="space-y-1 leading-none flex-1">
                                    <Label htmlFor="keep" className="font-medium cursor-pointer">
                                        Giữ nguyên giá trung bình
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Lãi Earn không ảnh hưởng đến cost basis. Dễ phân biệt capital gain vs interest income.
                                    </p>
                                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                                        <strong>Ví dụ:</strong> 1000 USDT giá TB 25,500 + Earn 100 USDT
                                        → Giá TB vẫn là 25,500 VND/USDT (không đổi)
                                    </div>
                                </div>
                            </div>
                        </RadioGroup>

                        {/* Explanation Alert */}
                        {method === 'reduce_avg_price' && (
                            <Alert>
                                <InfoIcon className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    <strong>Ưu điểm:</strong> Phản ánh đúng cost thực tế khi bán USDT.
                                    <br />
                                    <strong>Nhược điểm:</strong> Khó tracking riêng lợi nhuận từ Earn.
                                </AlertDescription>
                            </Alert>
                        )}

                        {method === 'keep_avg_price' && (
                            <Alert>
                                <InfoIcon className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    <strong>Ưu điểm:</strong> Dễ phân biệt interest income vs capital gain.
                                    <br />
                                    <strong>Nhược điểm:</strong> Realized PnL khi bán USDT sẽ thấp hơn thực tế.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Success Message */}
                    {success && (
                        <Alert className="border-green-500 bg-green-50">
                            <AlertDescription className="text-green-800">
                                ✓ Cài đặt đã được cập nhật và quỹ đã được tính lại thành công!
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        disabled={saving || method === currentMethod}
                        className="w-full"
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {saving ? 'Đang lưu và tính lại...' : 'Lưu cài đặt'}
                    </Button>

                    {method !== currentMethod && (
                        <p className="text-xs text-muted-foreground text-center">
                            ⚠️ Lưu ý: Thay đổi cài đặt sẽ tính lại toàn bộ quỹ theo phương pháp mới
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Recalculate Data Card */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Tính Toán Lại Dữ Liệu
                    </CardTitle>
                    <CardDescription>
                        Buộc hệ thống tính toán lại toàn bộ dữ liệu quỹ (NAV, Lợi nhuận, Giá vốn) dựa trên lịch sử giao dịch.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Sử dụng chức năng này khi bạn thấy số liệu hiển thị không chính xác hoặc sau khi hệ thống vừa cập nhật logic tính toán mới.
                    </p>

                    {recalculateError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{recalculateError}</AlertDescription>
                        </Alert>
                    )}

                    {recalculateSuccess && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-100">
                                ✓ Đã tính toán lại dữ liệu thành công!
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleRecalculate}
                        disabled={recalculating}
                        variant="secondary"
                        className="w-full"
                    >
                        {recalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {recalculating ? 'Đang tính toán...' : 'Tính Toán Lại Ngay'}
                    </Button>
                </CardContent>
            </Card>

            {/* Backup & Restore Card */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Sao Lưu & Phục Hồi Dữ Liệu
                    </CardTitle>
                    <CardDescription>
                        Xuất hoặc nhập toàn bộ dữ liệu quỹ (transactions, accounts, settings)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Backup Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Xuất Dữ Liệu</Label>
                                <Download className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Tải xuống file JSON chứa toàn bộ dữ liệu quỹ
                            </p>
                            <Button
                                onClick={handleExportBackup}
                                disabled={backupLoading}
                                className="w-full"
                                variant="outline"
                            >
                                {backupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {backupLoading ? 'Đang xuất...' : 'Xuất Backup'}
                            </Button>
                            {lastBackup && (
                                <p className="text-xs text-muted-foreground">
                                    📅 Backup gần nhất: {formatBackupTimestamp(lastBackup)}
                                </p>
                            )}
                        </div>

                        {/* Restore Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Nhập Dữ Liệu</Label>
                                <Upload className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Phục hồi dữ liệu từ file backup
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={restoreLoading}
                                className="w-full"
                                variant="outline"
                            >
                                {restoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Chọn File Backup
                            </Button>
                        </div>
                    </div>

                    {/* Restore Error */}
                    {restoreError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{restoreError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Restore Success */}
                    {restoreSuccess && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-100">
                                ✓ Dữ liệu đã được phục hồi thành công! Trang sẽ tự động làm mới.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Warning Alert */}
                    <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            <strong>Lưu ý quan trọng:</strong> Khi phục hồi từ backup, toàn bộ dữ liệu hiện tại sẽ bị xóa và thay thế bằng dữ liệu từ file backup. Hệ thống sẽ tự động tạo backup hiện tại trước khi thực hiện.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Restore Confirmation Dialog */}
            <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Xác Nhận Phục Hồi Dữ Liệu
                        </DialogTitle>
                        <DialogDescription>
                            Vui lòng xem lại thông tin backup trước khi tiếp tục
                        </DialogDescription>
                    </DialogHeader>

                    {backupPreview && (
                        <div className="space-y-4">
                            {/* Backup Info */}
                            <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tên quỹ:</span>
                                    <span className="font-medium">{backupPreview.fundName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ngày xuất:</span>
                                    <span className="font-medium">
                                        {formatBackupTimestamp(backupPreview.exportedAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Phiên bản:</span>
                                    <span className="font-medium">{backupPreview.version}</span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="border rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold mb-2">Dữ liệu sẽ được phục hồi:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tài khoản:</span>
                                        <span className="font-medium">{backupPreview.data.accounts.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Giao dịch:</span>
                                        <span className="font-medium">{backupPreview.data.transactions.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tài sản:</span>
                                        <span className="font-medium">{backupPreview.data.assetHoldings.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Phí:</span>
                                        <span className="font-medium">{backupPreview.data.fees.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timezone Selection for v1.0 backups */}
                            {backupNeedsTimezone && (
                                <div className="border rounded-lg p-4 border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
                                    <p className="text-sm font-semibold mb-2 text-orange-700 dark:text-orange-400">
                                        ⚠️ Backup phiên bản cũ (1.0) - Cần chọn múi giờ
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Backup này chưa có thông tin múi giờ. Vui lòng chọn múi giờ cho các giao dịch.
                                    </p>
                                    <Select value={restoreTimezone} onValueChange={setRestoreTimezone}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn múi giờ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMMON_TIMEZONES.map((tz) => (
                                                <SelectItem key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Warning */}
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    <strong>CẢNH BÁO:</strong> Dữ liệu hiện tại sẽ bị xóa hoàn toàn và thay thế bằng dữ liệu từ backup này. Một bản sao lưu tự động sẽ được tạo trước khi thực hiện.
                                </AlertDescription>
                            </Alert>

                            {/* Confirmation Checkbox */}
                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="confirm-delete"
                                    checked={confirmDelete}
                                    onCheckedChange={(checked) => setConfirmDelete(checked as boolean)}
                                />
                                <label
                                    htmlFor="confirm-delete"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Tôi hiểu rằng dữ liệu hiện tại sẽ bị xóa hoàn toàn và một backup tự động sẽ được tạo
                                </label>
                            </div>

                            {/* Restore Error in Dialog */}
                            {restoreError && (
                                <Alert variant="destructive">
                                    <AlertDescription>{restoreError}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRestoreDialog(false)
                                setBackupPreview(null)
                                setConfirmDelete(false)
                                setRestoreError(null)
                            }}
                            disabled={restoreLoading}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleConfirmRestore}
                            disabled={!confirmDelete || restoreLoading}
                            variant="destructive"
                        >
                            {restoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {restoreLoading ? 'Đang phục hồi...' : 'Xác Nhận Phục Hồi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
