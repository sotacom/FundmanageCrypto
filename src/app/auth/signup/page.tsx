'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Lock, User, Chrome } from 'lucide-react'

// GitHub icon component
function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
    )
}

function SignupContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/'
    const { toast } = useToast()
    const supabase = createClient()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Mật khẩu xác nhận không khớp',
            })
            return
        }

        if (password.length < 6) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Mật khẩu phải có ít nhất 6 ký tự',
            })
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name || email.split('@')[0],
                    },
                    // No email confirmation required
                    emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
                },
            })

            if (error) {
                toast({
                    variant: 'destructive',
                    title: 'Đăng ký thất bại',
                    description: error.message,
                })
                return
            }

            toast({
                title: 'Đăng ký thành công!',
                description: 'Tài khoản của bạn đã được tạo. Đang chuyển hướng...',
            })

            // Auto sign in after signup (no email verification)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (!signInError) {
                router.push(redirect)
                router.refresh()
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleOAuthLogin = async (provider: 'google' | 'github') => {
        setOauthLoading(provider)

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
                },
            })

            if (error) {
                toast({
                    variant: 'destructive',
                    title: 'Đăng ký thất bại',
                    description: error.message,
                })
                setOauthLoading(null)
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
            })
            setOauthLoading(null)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            <Card className="w-full max-w-md shadow-xl border-muted/60">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        Đăng ký tài khoản
                    </CardTitle>
                    <CardDescription>
                        Tạo tài khoản để quản lý quỹ đầu tư của bạn
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* OAuth Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handleOAuthLogin('google')}
                            disabled={loading || oauthLoading !== null}
                            className="w-full"
                        >
                            {oauthLoading === 'google' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Chrome className="h-4 w-4 mr-2" />
                            )}
                            Google
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleOAuthLogin('github')}
                            disabled={loading || oauthLoading !== null}
                            className="w-full"
                        >
                            {oauthLoading === 'github' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <GitHubIcon className="h-4 w-4 mr-2" />
                            )}
                            GitHub
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Hoặc đăng ký bằng email
                            </span>
                        </div>
                    </div>

                    {/* Signup Form */}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên hiển thị</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-10"
                                    disabled={loading || oauthLoading !== null}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="pl-10"
                                    disabled={loading || oauthLoading !== null}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Ít nhất 6 ký tự"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="pl-10"
                                    disabled={loading || oauthLoading !== null}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="pl-10"
                                    disabled={loading || oauthLoading !== null}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                            disabled={loading || oauthLoading !== null}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                'Đăng ký'
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                        Đã có tài khoản?{' '}
                        <Link
                            href={`/auth/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                        >
                            Đăng nhập
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            <Card className="w-full max-w-md shadow-xl border-muted/60">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SignupContent />
        </Suspense>
    )
}
