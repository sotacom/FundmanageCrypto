'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InfoIcon, Loader2 } from 'lucide-react'

interface FundSettingsProps {
    fundId: string
    currentMethod: 'reduce_avg_price' | 'keep_avg_price'
    onSettingsChanged?: () => void
}

export default function FundSettings({ fundId, currentMethod, onSettingsChanged }: FundSettingsProps) {
    const [method, setMethod] = useState<'reduce_avg_price' | 'keep_avg_price'>(currentMethod)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Sync internal state when prop changes (after successful save & refresh)
    useEffect(() => {
        setMethod(currentMethod)
    }, [currentMethod])

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

    return (
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
    )
}
