import React, { useState, useEffect } from 'react'
import { navigate } from 'gatsby'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'

const LoginPage = () => {
    const { login, register, isAuthenticated, isLoading } = useAuth()
    const [mode, setMode] = useState('login') // 'login' or 'register'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, isLoading])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            if (mode === 'login') {
                if (!formData.email || !formData.password) {
                    setError('please fill in all fields')
                    setIsSubmitting(false)
                    return
                }
                
                const result = await login(formData.email, formData.password)
                if (result.success) {
                    navigate('/')
                } else {
                    setError(result.error || 'login failed')
                }
            } else {
                // Register
                if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
                    setError('please fill in all fields')
                    setIsSubmitting(false)
                    return
                }

                if (formData.password !== formData.confirmPassword) {
                    setError('passwords do not match')
                    setIsSubmitting(false)
                    return
                }

                if (formData.password.length < 6) {
                    setError('password must be at least 6 characters')
                    setIsSubmitting(false)
                    return
                }

                const result = await register(formData.name, formData.email, formData.password)
                if (result.success) {
                    navigate('/')
                } else {
                    setError(result.error || 'registration failed')
                }
            }
        } catch (err) {
            setError('an unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login')
        setError('')
        setFormData({
            email: '',
            password: '',
            name: '',
            confirmPassword: ''
        })
    }

    if (isLoading) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-[rgb(var(--text-muted))] lowercase">loading...</div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="min-h-screen flex items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-md"
                >
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--brand-red)] rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] lowercase mb-2">
                            {mode === 'login' ? 'welcome back' : 'create account'}
                        </h1>
                        <p className="text-[rgb(var(--text-muted))] text-[14px] lowercase">
                            {mode === 'login' 
                                ? 'sign in to your account to continue' 
                                : 'join our community today'}
                        </p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-xl shadow-lg overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[13px] lowercase"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Name (Register only) */}
                            {mode === 'register' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                        name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="your name"
                                        className="w-full px-4 py-3 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors lowercase"
                                        autoComplete="name"
                                    />
                                </motion.div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                    email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors lowercase"
                                    autoComplete="email"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                    password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors"
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                            </div>

                            {/* Confirm Password (Register only) */}
                            {mode === 'register' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1.5 lowercase">
                                        confirm password
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-[rgb(var(--accent))] border border-[rgb(var(--border))] rounded-lg text-[14px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] outline-none focus:border-[var(--brand-red)] transition-colors"
                                        autoComplete="new-password"
                                    />
                                </motion.div>
                            )}

                            {/* Forgot Password (Login only) */}
                            {mode === 'login' && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        className="text-[12px] text-[var(--brand-red)] hover:underline lowercase"
                                    >
                                        forgot password?
                                    </button>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-[var(--brand-red)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity lowercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        {mode === 'login' ? 'signing in...' : 'creating account...'}
                                    </>
                                ) : (
                                    mode === 'login' ? 'sign in' : 'create account'
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="px-6 pb-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[rgb(var(--border))]"></div>
                                </div>
                                <div className="relative flex justify-center text-[11px]">
                                    <span className="px-2 bg-[rgb(var(--bg))] text-[rgb(var(--text-muted))] lowercase">or</span>
                                </div>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="px-6 pb-6 space-y-3">
                            <button className="w-full py-2.5 border border-[rgb(var(--border))] rounded-lg text-[13px] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--accent))] transition-colors flex items-center justify-center gap-2 lowercase">
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                continue with google
                            </button>
                            <button className="w-full py-2.5 border border-[rgb(var(--border))] rounded-lg text-[13px] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--accent))] transition-colors flex items-center justify-center gap-2 lowercase">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                continue with github
                            </button>
                        </div>

                        {/* Switch Mode */}
                        <div className="px-6 py-4 bg-[rgb(var(--accent))] border-t border-[rgb(var(--border))] text-center">
                            <span className="text-[13px] text-[rgb(var(--text-muted))] lowercase">
                                {mode === 'login' ? "don't have an account? " : "already have an account? "}
                            </span>
                            <button
                                type="button"
                                onClick={switchMode}
                                className="text-[13px] text-[var(--brand-red)] font-medium hover:underline lowercase"
                            >
                                {mode === 'login' ? 'sign up' : 'sign in'}
                            </button>
                        </div>
                    </div>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-[rgb(var(--accent))] rounded-lg border border-[rgb(var(--border))]">
                        <p className="text-[12px] text-[rgb(var(--text-muted))] text-center lowercase mb-2">
                            demo credentials
                        </p>
                        <div className="text-[12px] text-[rgb(var(--text-primary))] text-center lowercase space-y-1">
                            <p>email: demo@example.com</p>
                            <p>password: demo123</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </Layout>
    )
}

export default LoginPage
