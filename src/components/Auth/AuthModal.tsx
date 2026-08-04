import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX } from '@posthog/icons'
import { supabase } from 'lib/supabaseCommunity'
import { useUser } from 'hooks/useUser'

type AuthModalProps = {
    isOpen: boolean
    onClose: () => void
    initialView?: 'sign-in' | 'sign-up'
    onSuccess?: () => void
}

export default function AuthModal({ isOpen, onClose, initialView = 'sign-in', onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialView === 'sign-up' ? 'signup' : 'signin')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const { setUser } = useUser()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        setSuccessMsg(null)
        setLoading(true)

        try {
            // Send OTP / Magic link or direct email authentication via Supabase
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                },
            })

            if (error) throw error

            setSuccessMsg('Check your email for the magic sign in link!')

            // Mirror user state
            setUser((prev: any) => ({
                ...(prev || {}),
                email,
                username: email.split('@')[0],
                profile: {
                    ...(prev?.profile || {}),
                    firstName: email.split('@')[0],
                },
            }))

            setTimeout(() => {
                onSuccess?.()
                onClose()
            }, 1500)
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to send sign in link. Please try again.')
        } finally {
            setLoading(false)
        }
    }

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
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-primary/10 text-secondary hover:text-primary transition-colors z-20"
                            aria-label="Close Modal"
                        >
                            <IconX className="size-4" />
                        </button>

                        {/* Lowercase worldinmaking Header */}
                        <h2 className="text-xl font-extrabold tracking-tight text-primary m-0 mb-1 lowercase">
                            worldinmaking
                        </h2>
                        <p className="text-xs text-secondary mb-4 lowercase">
                            {mode === 'signin'
                                ? 'enter your email to sign in to worldinmaking'
                                : 'enter your email to join worldinmaking'}
                        </p>

                        {/* Mode Switcher Tabs */}
                        <div className="flex border-b border-primary/20 mb-5 gap-6 text-xs font-bold lowercase">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('signin')
                                    setErrorMsg(null)
                                    setSuccessMsg(null)
                                }}
                                className={`pb-2 transition-colors ${
                                    mode === 'signin'
                                        ? 'border-b-2 border-primary text-primary'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                sign in
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('signup')
                                    setErrorMsg(null)
                                    setSuccessMsg(null)
                                }}
                                className={`pb-2 transition-colors ${
                                    mode === 'signup'
                                        ? 'border-b-2 border-primary text-primary'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                create account
                            </button>
                        </div>

                        {/* Alerts */}
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

                        {/* ONLY Email Auth Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
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

                            {/* Authentic PostHog 3D Lemon Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-button-shadow dark:bg-button-shadow-dark rounded-[6px] border-[1.5px] border-button block group text-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <span className="flex items-center justify-center bg-orange text-black font-bold text-sm px-4 py-2 rounded-[6px] border-[1.5px] border-button dark:border-button-dark dark:bg-orange translate-y-[-2px] hover:translate-y-[-4px] active:translate-y-[-1px] transition-all lowercase select-none">
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : mode === 'signin' ? (
                                            'sign in with email'
                                        ) : (
                                            'continue with email'
                                        )}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
