'use client'

import { useState } from 'react'
import { usePermission } from '@/contexts/PermissionContext'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ChevronDown, Plus, Briefcase, Crown, UserPen, Eye, Loader2 } from 'lucide-react'
import { COMMON_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezone-utils'

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="h-3 w-3 text-amber-500" />,
    editor: <UserPen className="h-3 w-3 text-blue-500" />,
    viewer: <Eye className="h-3 w-3 text-muted-foreground" />,
}

const roleLabels: Record<string, string> = {
    owner: 'Chủ sở hữu',
    editor: 'Chỉnh sửa',
    viewer: 'Chỉ xem',
}

export function FundSelector() {
    const { currentFundId, currentFundName, currentRole, funds, loading, switchFund, refreshFunds } = usePermission()
    const { toast } = useToast()

    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [newFundName, setNewFundName] = useState('')
    const [newFundTimezone, setNewFundTimezone] = useState(DEFAULT_TIMEZONE)
    const [creating, setCreating] = useState(false)

    const handleCreateFund = async () => {
        if (!newFundName.trim()) {
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
                    name: newFundName.trim(),
                    timezone: newFundTimezone
                }),
            })

            if (response.ok) {
                const data = await response.json()
                toast({
                    title: 'Tạo quỹ thành công',
                    description: `Quỹ "${data.fund.name}" đã được tạo`,
                })
                setCreateDialogOpen(false)
                setNewFundName('')
                setNewFundTimezone(DEFAULT_TIMEZONE)
                await refreshFunds()
                // Switch to the new fund
                if (data.fund?.id) {
                    switchFund(data.fund.id)
                }
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

    if (loading) {
        return (
            <Button variant="outline" disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tải...
            </Button>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-w-[160px] justify-between">
                        <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span className="truncate max-w-[120px]">
                                {currentFundName || 'Chọn quỹ'}
                            </span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                    <DropdownMenuLabel>Quỹ của bạn</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {funds.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            Chưa có quỹ nào
                        </div>
                    ) : (
                        funds.map((fund) => (
                            <DropdownMenuItem
                                key={fund.fundId}
                                onClick={() => switchFund(fund.fundId)}
                                className={`flex items-center justify-between gap-2 ${fund.fundId === currentFundId ? 'bg-accent' : ''
                                    }`}
                            >
                                <span className="truncate">{fund.fundName}</span>
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                    {roleIcons[fund.role]}
                                    {roleLabels[fund.role]}
                                </Badge>
                            </DropdownMenuItem>
                        ))
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo quỹ mới
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Fund Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo quỹ mới</DialogTitle>
                        <DialogDescription>
                            Tạo một quỹ đầu tư mới để theo dõi tài sản
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="fundName">Tên quỹ</Label>
                            <Input
                                id="fundName"
                                value={newFundName}
                                onChange={(e) => setNewFundName(e.target.value)}
                                placeholder="Ví dụ: Quỹ đầu tư cá nhân"
                                disabled={creating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fundTimezone">Múi giờ</Label>
                            <Select value={newFundTimezone} onValueChange={setNewFundTimezone} disabled={creating}>
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
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateDialogOpen(false)}
                            disabled={creating}
                        >
                            Hủy
                        </Button>
                        <Button onClick={handleCreateFund} disabled={creating}>
                            {creating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Đang tạo...
                                </>
                            ) : (
                                'Tạo quỹ'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
