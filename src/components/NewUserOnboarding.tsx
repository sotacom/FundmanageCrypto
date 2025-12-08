'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { usePermission } from '@/contexts/PermissionContext'
import { Briefcase, Users, Loader2, ArrowRight, Mail } from 'lucide-react'

type OnboardingStep = 'choose' | 'create-fund' | 'collaborator'

export function NewUserOnboarding() {
    const { refreshFunds, switchFund } = usePermission()
    const { toast } = useToast()

    const [step, setStep] = useState<OnboardingStep>('choose')
    const [fundName, setFundName] = useState('')
    const [fundDescription, setFundDescription] = useState('')
    const [initialCapital, setInitialCapital] = useState('')
    const [creating, setCreating] = useState(false)

    const handleCreateFund = async () => {
        if (!fundName.trim()) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Vui lòng nhập tên quỹ',
            })
            return
        }

        setCreating(true)
        try {
            const response = await fetch('/api/funds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fundName.trim(),
                    description: fundDescription.trim() || null,
                    initialVnd: initialCapital ? parseFloat(initialCapital.replace(/[,.]/g, '')) : 0,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                toast({
                    title: 'Tạo quỹ thành công!',
                    description: `Quỹ "${data.fund.name}" đã được tạo`,
                })
                await refreshFunds()
                if (data.fund?.id) {
                    switchFund(data.fund.id)
                }
                // Page will auto-reload with new fund data
                window.location.reload()
            } else {
                const error = await response.json()
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: error.error || 'Không thể tạo quỹ',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã xảy ra lỗi khi tạo quỹ',
            })
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Step: Choose path */}
                {step === 'choose' && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                Chào mừng bạn!
                            </h1>
                            <p className="text-muted-foreground mt-2">
                                Bạn muốn làm gì tiếp theo?
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Option 1: Create Fund */}
                            <Card
                                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                                onClick={() => setStep('create-fund')}
                            >
                                <CardHeader className="text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                                        <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <CardTitle>Tạo quỹ mới</CardTitle>
                                    <CardDescription>
                                        Tạo quỹ đầu tư của riêng bạn và bắt đầu theo dõi tài sản
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="justify-center">
                                    <Button variant="outline" className="group">
                                        Bắt đầu
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Option 2: Collaborator */}
                            <Card
                                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                                onClick={() => setStep('collaborator')}
                            >
                                <CardHeader className="text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                                        <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <CardTitle>Tôi là cộng tác viên</CardTitle>
                                    <CardDescription>
                                        Tôi được mời để xem hoặc quản lý quỹ của người khác
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="justify-center">
                                    <Button variant="outline" className="group">
                                        Tiếp tục
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Step: Create Fund Form */}
                {step === 'create-fund' && (
                    <Card className="shadow-xl border-muted/60">
                        <CardHeader>
                            <CardTitle className="text-xl">Tạo quỹ mới</CardTitle>
                            <CardDescription>
                                Nhập thông tin để tạo quỹ đầu tư của bạn
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fundName">Tên quỹ *</Label>
                                <Input
                                    id="fundName"
                                    placeholder="Ví dụ: Quỹ đầu tư cá nhân"
                                    value={fundName}
                                    onChange={(e) => setFundName(e.target.value)}
                                    disabled={creating}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fundDescription">Mô tả (tùy chọn)</Label>
                                <Textarea
                                    id="fundDescription"
                                    placeholder="Mô tả ngắn về quỹ đầu tư..."
                                    value={fundDescription}
                                    onChange={(e) => setFundDescription(e.target.value)}
                                    disabled={creating}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="initialCapital">Vốn ban đầu VND (tùy chọn)</Label>
                                <Input
                                    id="initialCapital"
                                    type="text"
                                    placeholder="0"
                                    value={initialCapital}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, '')
                                        setInitialCapital(value ? parseInt(value).toLocaleString('vi-VN') : '')
                                    }}
                                    disabled={creating}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Bạn có thể thêm vốn sau thông qua giao dịch "Góp vốn"
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setStep('choose')}
                                disabled={creating}
                            >
                                Quay lại
                            </Button>
                            <Button
                                onClick={handleCreateFund}
                                disabled={creating || !fundName.trim()}
                                className="flex-1"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    'Tạo quỹ'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step: Collaborator info */}
                {step === 'collaborator' && (
                    <Card className="shadow-xl border-muted/60">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                                <Mail className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <CardTitle className="text-xl">Liên hệ quản lý quỹ</CardTitle>
                            <CardDescription>
                                Để được cấp quyền truy cập vào quỹ
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                <p className="text-sm">
                                    Bạn cần liên hệ với <strong>chủ sở hữu quỹ</strong> và cung cấp email đã đăng ký để được thêm vào quỹ.
                                </p>
                                <div className="border-l-4 border-blue-500 pl-3">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Các bước tiếp theo:</strong>
                                    </p>
                                    <ol className="text-sm text-muted-foreground list-decimal list-inside mt-2 space-y-1">
                                        <li>Gửi email của bạn cho người quản lý quỹ</li>
                                        <li>Họ sẽ thêm bạn làm thành viên với quyền Xem hoặc Chỉnh sửa</li>
                                        <li>Sau khi được thêm, quỹ sẽ xuất hiện trong danh sách của bạn</li>
                                    </ol>
                                </div>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                                <p>Bạn vẫn có thể tạo quỹ riêng nếu muốn.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setStep('choose')}
                            >
                                Quay lại
                            </Button>
                            <Button
                                onClick={() => setStep('create-fund')}
                                className="flex-1"
                            >
                                <Briefcase className="h-4 w-4 mr-2" />
                                Tạo quỹ của tôi
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    )
}
