'use client'

import { useState, useEffect } from 'react'
import { usePermission } from '@/contexts/PermissionContext'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Crown, UserPen, Eye, Plus, Trash2, Loader2, Users } from 'lucide-react'

interface Member {
    id: string
    userId: string
    email: string
    name: string | null
    avatarUrl: string | null
    role: string
    isOwner: boolean
    createdAt: string
}

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="h-4 w-4 text-amber-500" />,
    editor: <UserPen className="h-4 w-4 text-blue-500" />,
    viewer: <Eye className="h-4 w-4 text-muted-foreground" />,
}

const roleLabels: Record<string, string> = {
    owner: 'Chủ sở hữu',
    editor: 'Chỉnh sửa',
    viewer: 'Chỉ xem',
}

interface FundMembersManagerProps {
    fundId: string
}

export function FundMembersManager({ fundId }: FundMembersManagerProps) {
    const { canManage } = usePermission()
    const { toast } = useToast()

    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
    const [inviting, setInviting] = useState(false)

    const fetchMembers = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/funds/${fundId}/members`)
            if (response.ok) {
                const data = await response.json()
                setMembers(data.members || [])
            }
        } catch (error) {
            console.error('Error fetching members:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (fundId) {
            fetchMembers()
        }
    }, [fundId])

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Vui lòng nhập email',
            })
            return
        }

        setInviting(true)
        try {
            const response = await fetch(`/api/funds/${fundId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            })

            if (response.ok) {
                toast({
                    title: 'Thêm thành viên thành công',
                    description: `Đã thêm ${inviteEmail} vào quỹ`,
                })
                setInviteDialogOpen(false)
                setInviteEmail('')
                setInviteRole('viewer')
                fetchMembers()
            } else {
                const error = await response.json()
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: error.error || 'Không thể thêm thành viên',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã xảy ra lỗi khi thêm thành viên',
            })
        } finally {
            setInviting(false)
        }
    }

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/funds/${fundId}/members`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, role: newRole }),
            })

            if (response.ok) {
                toast({
                    title: 'Cập nhật thành công',
                    description: 'Đã cập nhật quyền thành viên',
                })
                fetchMembers()
            } else {
                const error = await response.json()
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: error.error || 'Không thể cập nhật quyền',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã xảy ra lỗi khi cập nhật quyền',
            })
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        try {
            const response = await fetch(`/api/funds/${fundId}/members?memberId=${memberId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                toast({
                    title: 'Xóa thành viên thành công',
                    description: 'Đã xóa thành viên khỏi quỹ',
                })
                fetchMembers()
            } else {
                const error = await response.json()
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: error.error || 'Không thể xóa thành viên',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã xảy ra lỗi khi xóa thành viên',
            })
        }
    }

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        return email.slice(0, 2).toUpperCase()
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Thành viên quỹ
                    </CardTitle>
                    <CardDescription>
                        Quản lý thành viên và quyền truy cập
                    </CardDescription>
                </div>

                {canManage && (
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Thêm thành viên
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Thêm thành viên mới</DialogTitle>
                                <DialogDescription>
                                    Mời người dùng khác tham gia quỹ của bạn
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        disabled={inviting}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Người dùng phải đã đăng ký tài khoản
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">Quyền</Label>
                                    <Select
                                        value={inviteRole}
                                        onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}
                                        disabled={inviting}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="viewer">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    Chỉ xem
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="editor">
                                                <div className="flex items-center gap-2">
                                                    <UserPen className="h-4 w-4" />
                                                    Chỉnh sửa
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {inviteRole === 'viewer'
                                            ? 'Có thể xem dữ liệu nhưng không thể chỉnh sửa'
                                            : 'Có thể thêm, sửa, xóa giao dịch'
                                        }
                                    </p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setInviteDialogOpen(false)}
                                    disabled={inviting}
                                >
                                    Hủy
                                </Button>
                                <Button onClick={handleInvite} disabled={inviting}>
                                    {inviting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Đang thêm...
                                        </>
                                    ) : (
                                        'Thêm thành viên'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>

            <CardContent>
                {members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Chưa có thành viên nào
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Thành viên</TableHead>
                                <TableHead>Quyền</TableHead>
                                {canManage && <TableHead className="text-right">Thao tác</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.avatarUrl || undefined} />
                                                <AvatarFallback>
                                                    {getInitials(member.name, member.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">
                                                    {member.name || member.email}
                                                </div>
                                                {member.name && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {member.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {member.isOwner ? (
                                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                                                {roleIcons.owner}
                                                {roleLabels.owner}
                                            </Badge>
                                        ) : canManage ? (
                                            <Select
                                                value={member.role}
                                                onValueChange={(v) => handleUpdateRole(member.id, v)}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="viewer">
                                                        <div className="flex items-center gap-2">
                                                            {roleIcons.viewer}
                                                            {roleLabels.viewer}
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="editor">
                                                        <div className="flex items-center gap-2">
                                                            {roleIcons.editor}
                                                            {roleLabels.editor}
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                                {roleIcons[member.role]}
                                                {roleLabels[member.role]}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell className="text-right">
                                            {!member.isOwner && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Bạn có chắc muốn xóa {member.name || member.email} khỏi quỹ?
                                                                Họ sẽ không thể truy cập dữ liệu quỹ nữa.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleRemoveMember(member.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Xóa
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
