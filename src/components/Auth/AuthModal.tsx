import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX } from '@posthog/icons'
import { Eye, EyeOff, Key } from 'lucide-react'
import { useUser, type User } from 'hooks/useUser'
import { requestPasswordReset } from 'lib/wim-auth'
import { supabase } from 'lib/supabase'
import OSButton from 'components/OSButton'
import Link from 'components/Link'

type AuthView = 'sign-in' | 'sign-up' | 'forgot-password'

type AuthModalProps = {
    isOpen: boolean
    onClose: () => void
    initialView?: AuthView
    onSuccess?: (user: User) => void
}

function GoogleIcon({ className = 'size-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
            />
        </svg>
    )
}

export default function AuthModal({
    isOpen,
    onClose,
    initialView = 'sign-in',
    onSuccess,
}: AuthModalProps) {
    const { login, signUp, loginWithGoogle } = useUser()
    const [mode, setMode] = useState<AuthView>(initialView)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [ageOk, setAgeOk] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setMode(initialView || 'sign-in')
            setErrorMsg(null)
            setSuccessMsg(null)
            setPassword('')
            setShowPassword(false)
            setAgeOk(false)
        }
    }, [isOpen, initialView])

    const finishSuccess = (user: User) => {
        onSuccess?.(user)
        onClose()
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        setSuccessMsg(null)
        setLoading(true)

        try {
            if (mode === 'sign-in') {
                const result = await login({ email, password })
                if (!result) {
                    setErrorMsg('Sign in failed. Please check your credentials.')
                    return
                }
                if ('error' in result && result.error) {
                    setErrorMsg(result.error)
                    return
                }
                finishSuccess(result as User)
            } else if (mode === 'sign-up') {
                if (!firstName.trim()) {
                    setErrorMsg('Please enter your first name')
                    return
                }
                if (password.length < 6) {
                    setErrorMsg('Password must be at least 6 characters')
                    return
                }
                if (!ageOk) {
                    setErrorMsg('You must be at least 16 years old.')
                    return
                }
                const result = await signUp({ email, password, firstName, lastName })
                if (!result) {
                    setErrorMsg('Sign up failed. Please try again.')
                    return
                }
                if ('error' in result && result.error) {
                    setErrorMsg(result.error)
                    return
                }
                finishSuccess(result as User)
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    const handleMagicLink = async () => {
        if (mode === 'sign-up' && !ageOk) {
            setErrorMsg('You must be at least 16 years old.')
            return
        }
        if (!email || !email.includes('@')) {
            setErrorMsg('Please enter your email above first.')
            return
        }
        setErrorMsg(null)
        setSuccessMsg(null)
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
                },
            })

            if (error) {
                setErrorMsg(error.message)
            } else {
                setSuccessMsg('Magic login link sent to your email!')
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to send magic link.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = async () => {
        if (mode === 'sign-up' && !ageOk) {
            setErrorMsg('You must be at least 16 years old.')
            return
        }
        setErrorMsg(null)
        setSuccessMsg(null)
        setLoading(true)
        try {
            const res = await loginWithGoogle()
            if (res.error) setErrorMsg(res.error)
        } catch (err: any) {
            setErrorMsg(err?.message || 'Google sign-in failed')
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setErrorMsg('Please enter your email address.')
            return
        }
        setErrorMsg(null)
        setSuccessMsg(null)
        setLoading(true)

        try {
            const res = await requestPasswordReset(email)
            if (res.error) {
                setErrorMsg(res.error)
            } else {
                setSuccessMsg('Password reset instructions sent to your email.')
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to request reset.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Translucent Backdrop so glass refraction is visible */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/25 dark:bg-black/45 backdrop-blur-[4px]"
                />

                {/* True Frosted Glassmorphism Panel (Harmonious rounded corners) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    data-scheme="primary"
                    className="relative z-10 w-full max-w-[420px] bg-white/70 dark:bg-[#18191c]/70 backdrop-blur-2xl border border-white/80 dark:border-white/15 rounded-xl p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted hover:text-primary p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close modal"
                    >
                        <IconX className="size-4" />
                    </button>

                    {/* Header: Title + Subtitle */}
                    <div className="text-center mb-6">
                        <h2 className="text-[21px] font-bold text-primary tracking-tight flex items-center justify-center flex-wrap gap-1.5">
                            <span>{mode === 'sign-in' ? 'Log in to' : mode === 'sign-up' ? 'Sign up for' : 'Reset password for'}</span>
                            <span className="bg-[#3b82f6]/15 dark:bg-[#3b82f6]/25 text-[#1d4ed8] dark:text-[#93c5fd] border border-[#3b82f6]/20 font-bold px-2 py-0.5 rounded-md text-[18px]">
                                @worldinmaking
                            </span>
                        </h2>
                        <p className="text-[13px] text-muted mt-1.5 font-normal">
                            {mode === 'sign-in' && "Welcome back. Let's make something."}
                            {mode === 'sign-up' && "Join the workspace. The world is always in the making."}
                            {mode === 'forgot-password' && 'Enter your email to receive recovery instructions.'}
                        </p>
                    </div>

                    {/* Notifications */}
                    {errorMsg && (
                        <div className="bg-red-500/15 border border-red-500/30 backdrop-blur-sm rounded-md py-2 px-3 text-xs text-red-600 dark:text-red-400 font-medium mb-4 text-center">
                            {errorMsg}
                        </div>
                    )}
                    {successMsg && (
                        <div className="bg-green-500/15 border border-green-500/30 backdrop-blur-sm rounded-md py-2 px-3 text-xs text-green-600 dark:text-green-400 font-medium mb-4 text-center">
                            {successMsg}
                        </div>
                    )}

                    {/* Forgot Password View */}
                    {mode === 'forgot-password' ? (
                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-bold text-primary mb-1.5">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@email.com"
                                    className="w-full bg-white/80 dark:bg-black/35 backdrop-blur-md border border-black/15 dark:border-white/15 rounded-md px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner transition-all"
                                />
                            </div>
                            <div className="pt-1">
                                <OSButton width="full" variant="primary" size="md" type="submit" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send reset instructions'}
                                </OSButton>
                            </div>
                            <div className="text-center pt-1.5">
                                <button
                                    type="button"
                                    onClick={() => setMode('sign-in')}
                                    className="text-xs text-muted hover:text-primary hover:underline transition-colors"
                                >
                                    Back to log in
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            {/* Main Form */}
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                {mode === 'sign-up' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[13px] font-bold text-primary mb-1.5">First name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Ali"
                                                className="w-full bg-white/80 dark:bg-black/35 backdrop-blur-md border border-black/15 dark:border-white/15 rounded-md px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-bold text-primary mb-1.5">Last name</label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Demir"
                                                className="w-full bg-white/80 dark:bg-black/35 backdrop-blur-md border border-black/15 dark:border-white/15 rounded-md px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Email Field */}
                                <div>
                                    <label className="block text-[13px] font-bold text-primary mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@email.com"
                                        className="w-full bg-white/80 dark:bg-black/35 backdrop-blur-md border border-black/15 dark:border-white/15 rounded-md px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner transition-all"
                                    />
                                </div>

                                {/* Password Field */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[13px] font-bold text-primary">Password</label>
                                        {mode === 'sign-in' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setErrorMsg(null)
                                                    setMode('forgot-password')
                                                }}
                                                className="text-xs font-semibold text-primary/75 hover:text-primary hover:underline transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full bg-white/80 dark:bg-black/35 backdrop-blur-md border border-black/15 dark:border-white/15 rounded-md px-3.5 py-2.5 pr-10 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors p-1"
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Primary OSButton (PostHog LemonButton style) */}
                                <div className="pt-1.5">
                                    <OSButton width="full" variant="primary" size="md" type="submit" disabled={loading}>
                                        {loading
                                            ? 'Processing...'
                                            : mode === 'sign-in'
                                            ? 'Log in'
                                            : 'Create account'}
                                    </OSButton>
                                </div>
                            </form>

                            {/* Dotted Divider */}
                            <div className="relative my-6">
                                <div className="border-b border-dashed border-black/20 dark:border-white/20 w-full" />
                                <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white/80 dark:bg-[#18191c]/80 backdrop-blur-md px-3 text-xs font-medium text-muted rounded-md">
                                    {mode === 'sign-in' ? 'Or log in with' : 'Or sign up with'}
                                </span>
                            </div>

                            {/* Social Logins Row (Google, Magic Link) */}
                            <div className="flex items-center justify-center gap-3.5">
                                <button
                                    type="button"
                                    onClick={handleGoogle}
                                    disabled={loading}
                                    title="Continue with Google"
                                    aria-label="Continue with Google"
                                    className="size-11 rounded-md bg-white/85 dark:bg-white/10 backdrop-blur-md border border-black/10 dark:border-white/15 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-md"
                                >
                                    <GoogleIcon className="size-5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={handleMagicLink}
                                    disabled={loading}
                                    title="Send magic login link to email"
                                    aria-label="Send magic login link to email"
                                    className="size-11 rounded-md bg-white/85 dark:bg-white/10 backdrop-blur-md border border-black/10 dark:border-white/15 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-md text-primary"
                                >
                                    <Key className="size-5 text-[#8567ff]" />
                                </button>
                            </div>

                            {mode === 'sign-up' ? (
                                <div className="mt-4 space-y-2">
                                    <label className="flex items-start gap-2 text-[11px] text-muted leading-relaxed cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5"
                                            checked={ageOk}
                                            onChange={(e) => setAgeOk(e.target.checked)}
                                        />
                                        <span>I am at least 16 years old.</span>
                                    </label>
                                    <p className="text-[11px] text-muted text-center mb-0 leading-relaxed">
                                        By creating an account you agree to the{' '}
                                        <Link href="/terms" className="underline hover:text-primary">
                                            Terms
                                        </Link>
                                        ,{' '}
                                        <Link href="/privacy" className="underline hover:text-primary">
                                            Privacy Policy
                                        </Link>
                                        , and{' '}
                                        <Link href="/cookies" className="underline hover:text-primary">
                                            Cookies
                                        </Link>
                                        .
                                    </p>
                                </div>
                            ) : null}

                            {/* Bottom Mode Switch */}
                            <div className="mt-6 pt-1 text-center">
                                {mode === 'sign-in' ? (
                                    <p className="text-xs text-muted">
                                        Don't have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setErrorMsg(null)
                                                setMode('sign-up')
                                            }}
                                            className="font-bold text-primary hover:underline ml-0.5"
                                        >
                                            Sign up
                                        </button>
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted">
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setErrorMsg(null)
                                                setMode('sign-in')
                                            }}
                                            className="font-bold text-primary hover:underline ml-0.5"
                                        >
                                            Log in
                                        </button>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
