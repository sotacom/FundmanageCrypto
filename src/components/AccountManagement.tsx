'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, AlertCircle, Pencil, Trash2, RefreshCw } from 'lucide-react'
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
import { Account, ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '@/types/account'

interface AccountManagementProps {
    fundId: string
}

export default function AccountManagement({ fundId }: AccountManagementProps) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)

    const fetchAccounts = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/accounts?fundId=${fundId}`)
            const data = await response.json()

            if (response.ok) {
                setAccounts(data.accounts)
            } else {
                setError(data.error || 'Failed to fetch accounts')
            }
        } catch (err) {
            console.error('Error fetching accounts:', err)
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (fundId) {
            fetchAccounts()
        }
    }, [fundId])

    const handleCreateOrUpdate = async (accountData: Partial<Account>) => {
        try {
            const method = editingAccount ? 'PUT' : 'POST'
            const body = editingAccount
                ? { ...accountData, id: editingAccount.id, fundId }
                : { ...accountData, fundId }

            const response = await fetch('/api/accounts', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            })

            const result = await response.json()

            if (response.ok) {
                await fetchAccounts()
                setIsCreateDialogOpen(false)
                setEditingAccount(null)
            } else {
                setError(result.error || 'Failed to save account')
            }
        } catch (err) {
            console.error('Error saving account:', err)
            setError('Failed to connect to server')
        }
    }

    const handleDelete = async (accountId: string) => {
        try {
            const response = await fetch(`/api/accounts?id=${accountId}&fundId=${fundId}`, {
                method: 'DELETE'
            })

            const result = await response.json()

            if (response.ok) {
                await fetchAccounts()
                setDeletingAccountId(null)
            } else {
                setError(result.error || 'Failed to delete account')
            }
        } catch (err) {
            console.error('Error deleting account:', err)
            setError('Failed to connect to server')
        }
    }

    const handleEdit = (account: Account) => {
        setEditingAccount(account)
        setIsCreateDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsCreateDialogOpen(false)
        setEditingAccount(null)
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý tài khoản</h2>
                    <p className="text-muted-foreground">
                        Quản lý các tài khoản lưu trữ USDT, BTC
                    </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2" onClick={() => setEditingAccount(null)}>
                            <Plus className="h-4 w-4" />
                            Thêm tài khoản
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingAccount ? 'Cập nhật thông tin tài khoản' : 'Nhập thông tin cho tài khoản mới'}
                            </DialogDescription>
                        </DialogHeader>
                        <AccountForm
                            account={editingAccount}
                            onSubmit={handleCreateOrUpdate}
                            onCancel={handleCloseDialog}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Accounts List */}
            {accounts.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">Chưa có tài khoản nào</p>
                            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2 mx-auto">
                                <Plus className="h-4 w-4" />
                                Thêm tài khoản đầu tiên
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map((account) => (
                        <Card key={account.id} className={!account.isActive ? 'opacity-60' : ''}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{account.name}</CardTitle>
                                        <CardDescription>
                                            {account.platform && `${account.platform} • `}
                                            {ACCOUNT_TYPE_LABELS[account.type]}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                                        {account.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Balance Display */}
                                {account.balances && (account.balances.usdt > 0 || account.balances.btc > 0) && (
                                    <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
                                        {account.balances.usdt > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">USDT:</span>
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    {account.balances.usdt.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        {account.balances.btc > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">BTC:</span>
                                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                    {account.balances.btc.toLocaleString('vi-VN', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(account)}
                                        className="flex items-center gap-2"
                                    >
                                        <Pencil className="h-3 w-3" />
                                        Sửa
                                    </Button>
                                    <AlertDialog
                                        open={deletingAccountId === account.id}
                                        onOpenChange={(open) => setDeletingAccountId(open ? account.id : null)}
                                    >
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Xóa
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Xác nhận xóa tài khoản</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Bạn có chắc chắn muốn xóa tài khoản &quot;{account.name}&quot;?
                                                    {' '}Nếu tài khoản có giao dịch liên quan, nó sẽ được đánh dấu là không hoạt động thay vì bị xóa.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(account.id)}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Xóa
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

// Account Form Component
interface AccountFormProps {
    account: Account | null
    onSubmit: (data: Partial<Account>) => void
    onCancel: () => void
}

function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
    const [formData, setFormData] = useState<{
        name: string
        type: string
        platform: string
        isActive: boolean
    }>({
        name: account?.name || '',
        type: account?.type || '',
        platform: account?.platform || '',
        isActive: account?.isActive !== undefined ? account.isActive : true
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            ...formData,
            type: formData.type as Account['type']
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Tên tài khoản *</Label>
                <Input
                    id="name"
                    placeholder="VD: Binance 1, Ví lạnh chính"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="type">Loại tài khoản *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Chọn loại tài khoản" />
                    </SelectTrigger>
                    <SelectContent>
                        {ACCOUNT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="platform">Nền tảng (tùy chọn)</Label>
                <Input
                    id="platform"
                    placeholder="VD: Trust Wallet, Ledger"
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                />
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                    Tài khoản đang hoạt động
                </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Hủy
                </Button>
                <Button type="submit">
                    {account ? 'Cập nhật' : 'Tạo tài khoản'}
                </Button>
            </div>
        </form>
    )
}
