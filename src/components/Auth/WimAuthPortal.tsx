import React, { useState } from 'react'
import { supabase } from 'lib/supabaseCommunity'
import { useUser } from 'hooks/useUser'

type WimAuthPortalProps = {
    onSuccess?: () => void
    defaultTab?: 'signin' | 'signup'
}

export const WimAuthPortal: React.FC<WimAuthPortalProps> = ({ onSuccess, defaultTab = 'signin' }) => {
    const [mode, setMode] = useState<'signin' | 'signup'>(defaultTab)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
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
            if (mode === 'signin') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                setSuccessMsg('WorldInMaking portalına başarıyla giriş yapıldı!')
                
                // Mirror to user context
                if (data?.user) {
                    setUser((prev: any) => ({
                        ...(prev || {}),
                        id: data.user.id,
                        email: data.user.email || email,
                        username: data.user.user_metadata?.full_name || email.split('@')[0],
                        profile: {
                            ...(prev?.profile || {}),
                            firstName: data.user.user_metadata?.full_name || email.split('@')[0],
                        },
                    }))
                }
                setTimeout(() => onSuccess?.(), 1000)
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                })
                if (error) throw error
                setSuccessMsg('Kayıt oluşturuldu! Lütfen e-postanızı doğrulayın veya giriş yapın.')
                setTimeout(() => setMode('signin'), 1500)
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Kimlik doğrulama sırasında bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    const handleOAuth = async (provider: 'github' | 'google') => {
        setErrorMsg(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/login`,
                },
            })
            if (error) throw error
        } catch (err: any) {
            setErrorMsg(err?.message || `${provider} ile giriş yapılamadı.`)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl text-white relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header Header */}
            <div className="text-center mb-6 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 shadow-lg shadow-amber-500/10 mb-3">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                        <span className="text-2xl font-black bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
                            WIM
                        </span>
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">WorldInMaking Portal</h2>
                <p className="text-xs text-slate-400 mt-1">Supabase destekli güvenli otonom erişim portali</p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-800/60 p-1 rounded-xl mb-6 border border-slate-700/50">
                <button
                    type="button"
                    onClick={() => { setMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        mode === 'signin'
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Giriş Yap (Sign In)
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        mode === 'signup'
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Kayıt Ol (Sign Up)
                </button>
            </div>

            {/* Alerts */}
            {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    {errorMsg}
                </div>
            )}
            {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {successMsg}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {mode === 'signup' && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Ad Soyad</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Adınız Soyadınız"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">E-Posta Adresi</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@worldinmaking.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Şifre</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : mode === 'signin' ? (
                        'WIM Portalıyla Giriş Yap'
                    ) : (
                        'Supabase Hesabı Oluştur'
                    )}
                </button>
            </form>

            {/* Social Auth Separator */}
            <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative px-3 bg-slate-900 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Veya Sosyal Kimlikle
                </span>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <button
                    type="button"
                    onClick={() => handleOAuth('github')}
                    className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    GitHub
                </button>
                <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Google
                </button>
            </div>
        </div>
    )
}

export default WimAuthPortal
