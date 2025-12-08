'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/contexts/PermissionContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FundMembersManager } from '@/components/FundMembersManager'
import { SiteHeader } from '@/components/site-header'
import { useToast } from '@/hooks/use-toast'
import { User, Briefcase, Users, ArrowLeft, Crown, UserPen, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'

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

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const { funds, currentFundId, canManage, loading: permissionLoading } = usePermission()
    const { toast } = useToast()

    const loading = authLoading || permissionLoading

    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        if (email) {
            return email.slice(0, 2).toUpperCase()
        }
        return 'U'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground mb-4">Bạn cần đăng nhập để xem trang này</p>
                        <Button asChild>
                            <Link href="/auth/login">Đăng nhập</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Simple Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                            </Button>
                            <h1 className="text-lg font-semibold">Hồ sơ & Quản lý</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Thông tin cá nhân
                        </TabsTrigger>
                        <TabsTrigger value="funds" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Quỹ của tôi
                        </TabsTrigger>
                        {canManage && currentFundId && (
                            <TabsTrigger value="members" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Ủy quyền
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Thông tin cá nhân</CardTitle>
                                <CardDescription>
                                    Thông tin tài khoản của bạn
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={user.user_metadata?.avatar_url} />
                                        <AvatarFallback className="text-2xl">
                                            {getInitials(user.user_metadata?.name, user.email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-xl font-semibold">
                                            {user.user_metadata?.name || user.user_metadata?.full_name || 'Người dùng'}
                                        </h3>
                                        <p className="text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input value={user.email || ''} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tên hiển thị</Label>
                                        <Input
                                            value={user.user_metadata?.name || user.user_metadata?.full_name || ''}
                                            disabled
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ID tài khoản</Label>
                                        <Input value={user.id} disabled className="font-mono text-xs" />
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground">
                                    Thông tin cá nhân được quản lý thông qua nhà cung cấp đăng nhập của bạn.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Funds Tab */}
                    <TabsContent value="funds">
                        <Card>
                            <CardHeader>
                                <CardTitle>Quỹ của tôi</CardTitle>
                                <CardDescription>
                                    Danh sách các quỹ bạn có quyền truy cập
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {funds.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Bạn chưa có quỹ nào. Hãy tạo quỹ mới từ trang chủ.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {funds.map((fund) => (
                                            <div
                                                key={fund.fundId}
                                                className={`flex items-center justify-between p-4 rounded-lg border ${fund.fundId === currentFundId ? 'border-primary bg-primary/5' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">{fund.fundName}</p>
                                                        {fund.fundId === currentFundId && (
                                                            <p className="text-xs text-muted-foreground">Đang chọn</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    {roleIcons[fund.role]}
                                                    {roleLabels[fund.role]}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Members Tab - Only for owners */}
                    {canManage && currentFundId && (
                        <TabsContent value="members">
                            <FundMembersManager fundId={currentFundId} />
                        </TabsContent>
                    )}
                </Tabs>
            </main>
        </div>
    )
}
