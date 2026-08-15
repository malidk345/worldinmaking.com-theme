import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX } from '@posthog/icons'
import { useUser, type User } from 'hooks/useUser'
import { requestPasswordReset } from 'lib/wim-auth'
import { supabase } from 'lib/supabase'
import OSButton from 'components/OSButton'
import WimLogo from 'components/WimLogo'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'

type AuthView = 'sign-in' | 'sign-up' | 'forgot-password'

type AuthModalProps = {
    isOpen: boolean
    onClose: () => void
    initialView?: AuthView
    onSuccess?: (user: User) => void
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
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    useEffect(() => {
        if (isOpen) {
            setMode(initialView || 'sign-in')
            setErrorMsg(null)
            setSuccessMsg(null)
            setPassword('')
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
                    setErrorMsg('Sign in failed. Please try again.')
                    return
                }
                if ('error' in result && result.error) {
                    setErrorMsg(result.error)
                    return
                }
                finishSuccess(result as User)
            } else if (mode === 'sign-up') {
                if (!firstName.trim()) {
                    setErrorMsg('First name is required')
                    return
                }
                if (password.length < 6) {
                    setErrorMsg('Password must be at least 6 characters')
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

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !email.includes('@')) {
            setErrorMsg('Please enter a valid email address.')
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
                setSuccessMsg('Check your email! We sent you a magic login link.')
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to send magic link.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = async () => {
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
            setErrorMsg(err?.message || 'Failed to request password reset.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Forum-styled Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    data-scheme="primary"
                    className="relative z-10 w-full max-w-md bg-primary text-primary border border-primary rounded-xl p-6 shadow-2xl overflow-hidden"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-secondary hover:text-primary p-1 rounded hover:bg-accent/40 transition-colors"
                        aria-label="Close modal"
                    >
                        <IconX className="size-5" />
                    </button>

                    {/* Banner / Header */}
                    <div className="bg-[#FFF7E9] dark:bg-accent/40 border border-primary rounded mb-5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <WimLogo className="size-7" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                                WorldInMaking
                            </span>
                        </div>
                        <h4 className="m-0 text-base font-bold pb-1 text-primary">
                            {mode === 'sign-in' && 'Sign in to WorldInMaking'}
                            {mode === 'sign-up' && 'Create your account'}
                            {mode === 'forgot-password' && 'Reset your password'}
                        </h4>
                        <p className="m-0 text-xs text-secondary leading-relaxed">
                            {mode === 'sign-in' && 'Access your notebooks, forum posts, and philosopher AI settings.'}
                            {mode === 'sign-up' && 'Join the community to write, discuss, and build.'}
                            {mode === 'forgot-password' && 'Enter your email to receive password reset instructions.'}
                        </p>
                    </div>

                    {/* View Switcher (Forum ToggleGroup Style) */}
                    {mode !== 'forgot-password' && (
                        <ToggleGroup
                            title="Authentication"
                            hideTitle
                            options={[
                                { label: 'Login', value: 'sign-in' },
                                { label: 'Signup', value: 'sign-up' },
                            ]}
                            value={mode}
                            onValueChange={(val) => setMode(val as AuthView)}
                            className="mb-5"
                        />
                    )}

                    {/* Error / Success Messages */}
                    {errorMsg && (
                        <p className="bg-red/10 border border-red/30 rounded py-2 px-4 text-xs text-red font-semibold mb-4">
                            {errorMsg}
                        </p>
                    )}
                    {successMsg && (
                        <p className="bg-green/10 border border-green/30 rounded py-2 px-4 text-xs text-green font-semibold mb-4">
                            {successMsg}
                        </p>
                    )}

                    {/* Forms */}
                    {mode === 'forgot-password' ? (
                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1 opacity-75">Email address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <OSButton width="full" variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Sending instructions...' : 'Send reset instructions'}
                            </OSButton>
                            <OSButton
                                width="full"
                                variant="secondary"
                                type="button"
                                onClick={() => setMode('sign-in')}
                            >
                                Back to login
                            </OSButton>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <OSButton
                                width="full"
                                variant="secondary"
                                type="button"
                                onClick={handleGoogle}
                                disabled={loading}
                            >
                                Continue with Google
                            </OSButton>
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-secondary">
                                <span className="flex-1 h-px bg-border" />
                                or use email
                                <span className="flex-1 h-px bg-border" />
                            </div>
                            {mode === 'sign-up' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 opacity-75">First Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Jane"
                                            className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 opacity-75">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Doe"
                                            className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold mb-1 opacity-75">Email address *</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold mb-1 opacity-75">Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <OSButton width="full" variant="primary" type="submit" disabled={loading}>
                                    {loading
                                        ? 'Processing...'
                                        : mode === 'sign-in'
                                        ? 'Login'
                                        : 'Create account'}
                                </OSButton>

                                {mode === 'sign-in' && (
                                    <>
                                        <OSButton
                                            width="full"
                                            variant="secondary"
                                            type="button"
                                            onClick={handleMagicLink}
                                            disabled={loading}
                                        >
                                            Send magic login link
                                        </OSButton>

                                        <button
                                            type="button"
                                            className="block w-full text-center text-xs text-secondary hover:text-primary hover:underline pt-1"
                                            onClick={() => setMode('forgot-password')}
                                        >
                                            Forgot password?
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
