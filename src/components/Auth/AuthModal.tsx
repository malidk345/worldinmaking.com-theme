import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX } from '@posthog/icons'
import { useUser, type User } from 'hooks/useUser'
import { requestPasswordReset } from 'lib/wim-auth'
import { supabase } from 'lib/supabaseCommunity'

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
    const { login, signUp } = useUser()
    const [mode, setMode] = useState<AuthView>(initialView)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [magicLinkSent, setMagicLinkSent] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setMode(initialView || 'sign-in')
            setErrorMsg(null)
            setSuccessMsg(null)
            setMagicLinkSent(false)
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
                if ('error' in result) {
                    setErrorMsg(result.error || 'Invalid email or password')
                    return
                }
                finishSuccess(result)
                return
            }

            if (mode === 'sign-up') {
                const result = await signUp({
                    email,
                    password,
                    firstName: firstName.trim() || email.split('@')[0],
                    lastName: lastName.trim() || '',
                })
                if (!result) {
                    setErrorMsg('Sign up failed. Please try again.')
                    return
                }
                if ('error' in result) {
                    setErrorMsg(result.error)
                    return
                }
                finishSuccess(result)
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        setSuccessMsg(null)
        setLoading(true)
        try {
            const { error } = await requestPasswordReset(email)
            if (error) {
                setErrorMsg(error)
                return
            }
            setSuccessMsg('Check your email for password reset instructions.')
        } catch (err: any) {
            setErrorMsg(err?.message || 'Could not send reset email')
        } finally {
            setLoading(false)
        }
    }

    const handleMagicLink = async () => {
        setErrorMsg(null)
        setSuccessMsg(null)
        if (!email) {
            setErrorMsg('Enter your email first')
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                },
            })
            if (error) throw error
            setMagicLinkSent(true)
            setSuccessMsg('Check your email for the magic sign-in link.')
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to send magic link')
        } finally {
            setLoading(false)
        }
    }

    const title =
        mode === 'sign-up'
            ? 'create account'
            : mode === 'forgot-password'
            ? 'reset password'
            : 'sign in to the community'

    const subtitle =
        mode === 'sign-up'
            ? 'join worldinmaking with email and password'
            : mode === 'forgot-password'
            ? 'we will email you a reset link'
            : 'sign in with your worldinmaking account'

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/40">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="relative max-w-sm w-full bg-accent p-6 rounded-xl border border-primary shadow-2xl text-primary"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-primary/10 text-secondary hover:text-primary transition-colors z-20"
                            aria-label="Close Modal"
                            type="button"
                        >
                            <IconX className="size-4" />
                        </button>

                        <h2 className="text-xl font-extrabold tracking-tight text-primary m-0 mb-1 lowercase">
                            worldinmaking
                        </h2>
                        <p className="text-xs text-secondary mb-4 lowercase">{subtitle}</p>

                        {mode !== 'forgot-password' && (
                            <div className="flex border-b border-primary/20 mb-5 gap-6 text-xs font-bold lowercase">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('sign-in')
                                        setErrorMsg(null)
                                        setSuccessMsg(null)
                                    }}
                                    className={`pb-2 transition-colors ${
                                        mode === 'sign-in'
                                            ? 'border-b-2 border-primary text-primary'
                                            : 'text-secondary hover:text-primary'
                                    }`}
                                >
                                    sign in
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('sign-up')
                                        setErrorMsg(null)
                                        setSuccessMsg(null)
                                    }}
                                    className={`pb-2 transition-colors ${
                                        mode === 'sign-up'
                                            ? 'border-b-2 border-primary text-primary'
                                            : 'text-secondary hover:text-primary'
                                    }`}
                                >
                                    create account
                                </button>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="mb-4 p-3 rounded-md bg-red/10 border border-red/30 text-red text-xs font-semibold">
                                {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                {successMsg}
                            </div>
                        )}

                        {mode === 'forgot-password' ? (
                            <form onSubmit={handleForgotSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-primary mb-1 lowercase">
                                        email address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@domain.com"
                                        className="w-full px-3 py-2 rounded-md border border-primary bg-primary text-primary text-sm placeholder:text-secondary focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <SubmitButton loading={loading} label="send reset link" />
                                <button
                                    type="button"
                                    className="w-full text-xs text-secondary hover:text-primary lowercase"
                                    onClick={() => setMode('sign-in')}
                                >
                                    back to sign in
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handlePasswordSubmit} className="space-y-3">
                                {mode === 'sign-up' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-primary mb-1 lowercase">
                                                first name
                                            </label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="First"
                                                className="w-full px-3 py-2 rounded-md border border-primary bg-primary text-primary text-sm placeholder:text-secondary focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-primary mb-1 lowercase">
                                                last name
                                            </label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Last"
                                                className="w-full px-3 py-2 rounded-md border border-primary bg-primary text-primary text-sm placeholder:text-secondary focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold text-primary mb-1 lowercase">
                                        email address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@domain.com"
                                        className="w-full px-3 py-2 rounded-md border border-primary bg-primary text-primary text-sm placeholder:text-secondary focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-primary mb-1 lowercase">
                                        password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 rounded-md border border-primary bg-primary text-primary text-sm placeholder:text-secondary focus:outline-none focus:border-primary"
                                    />
                                </div>

                                <SubmitButton
                                    loading={loading}
                                    label={mode === 'sign-in' ? title : 'create account'}
                                />

                                {mode === 'sign-in' && (
                                    <div className="flex flex-col gap-2 pt-1">
                                        <button
                                            type="button"
                                            className="w-full text-xs text-secondary hover:text-primary lowercase"
                                            onClick={() => {
                                                setMode('forgot-password')
                                                setErrorMsg(null)
                                                setSuccessMsg(null)
                                            }}
                                        >
                                            forgot password?
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loading || magicLinkSent}
                                            onClick={handleMagicLink}
                                            className="w-full text-xs text-secondary hover:text-primary lowercase disabled:opacity-50"
                                        >
                                            {magicLinkSent ? 'magic link sent' : 'or send a magic link instead'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
    return (
        <div className="pt-2">
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-button-shadow dark:bg-button-shadow-dark rounded-[6px] border-[1.5px] border-button block group text-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                <span className="flex items-center justify-center bg-orange text-white font-bold text-sm px-4 py-2 rounded-[6px] border-[1.5px] border-button dark:border-button-dark dark:bg-orange translate-y-[-2px] hover:translate-y-[-4px] active:translate-y-[-1px] transition-all lowercase select-none">
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                        label
                    )}
                </span>
            </button>
        </div>
    )
}
