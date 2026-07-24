import React, { useState } from 'react'
import { supabase } from 'lib/supabaseCommunity'
import { useUser } from 'hooks/useUser'
import Icon from 'components/Icon'

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
                    <Icon name="github" className="w-4 h-4 text-white" />
                    GitHub
                </button>
                <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    Google
                </button>
            </div>
        </div>
    )
}

export default WimAuthPortal
