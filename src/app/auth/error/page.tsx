'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

const errorMessages: Record<string, { title: string; description: string }> = {
    auth_callback_error: {
        title: 'Lỗi xác thực',
        description: 'Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại.',
    },
    access_denied: {
        title: 'Quyền truy cập bị từ chối',
        description: 'Bạn đã từ chối quyền truy cập. Vui lòng thử lại nếu đây là nhầm lẫn.',
    },
    default: {
        title: 'Đã xảy ra lỗi',
        description: 'Đã có lỗi không xác định xảy ra. Vui lòng thử lại sau.',
    },
}

function AuthErrorContent() {
    const searchParams = useSearchParams()
    const errorCode = searchParams.get('message') || 'default'
    const error = errorMessages[errorCode] || errorMessages.default

    return (
        <Card className="w-full max-w-md shadow-xl border-muted/60">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                    {error.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    {error.description}
                </CardDescription>
            </CardHeader>

            <CardContent className="text-center text-sm text-muted-foreground">
                <p>Mã lỗi: {errorCode}</p>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                <Button asChild className="w-full">
                    <Link href="/auth/login">
                        Quay lại đăng nhập
                    </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/">
                        Về trang chủ
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

function LoadingFallback() {
    return (
        <Card className="w-full max-w-md shadow-xl border-muted/60">
            <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    )
}

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            <Suspense fallback={<LoadingFallback />}>
                <AuthErrorContent />
            </Suspense>
        </div>
    )
}

