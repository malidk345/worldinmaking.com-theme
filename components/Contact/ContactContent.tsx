"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import { supabase } from 'lib/supabase'
import { useToast } from 'context/ToastContext'
import { Mail, User, Send, MessageSquare } from 'lucide-react'
import { useTranslation } from 'hooks/useTranslation'

export default function ContactContent() {
    const { addToast } = useToast()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.email || !formData.message) {
            addToast(t('contact.fill_fields'), 'warning')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('writer_applications')
                .insert([{
                    name: formData.name,
                    email: formData.email,
                    message: formData.message,
                    status: 'new',
                    source: 'contact_form'
                }])

            if (error) throw error

            setSent(true)
            addToast(t('contact.success'), 'success')
        } catch (err: unknown) {
            console.error('Contact error:', err)
            const message = err instanceof Error ? err.message : 'unknown error'
            addToast(`${t('contact.failed')}: ${message}`, 'error')
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 animate-in fade-in duration-500">
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
                    <Send className="size-8" />
                </div>
                <h2 className="text-xl font-black lowercase tracking-tighter">{t('contact.sent_title')}</h2>
                <p className="text-sm opacity-60 max-w-xs lowercase">
                    {t('contact.sent_desc')}
                </p>
                <OSButton 
                    variant="secondary" 
                    onClick={() => setSent(false)}
                    className="mt-4"
                >
                    <span className="px-4 lowercase">{t('contact.send_another')}</span>
                </OSButton>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col lowercase font-sans">
            <div className="p-6 border-b border-primary/10 bg-accent/40 supports-[backdrop-filter]:backdrop-blur-md">
                <div className="flex items-center gap-4 mb-3">
                    <div className="size-12 rounded-lg bg-primary border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-primary">
                        <Mail className="size-6 opacity-80" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-primary leading-none">{t('contact.title')}</h2>
                    </div>
                </div>
                <p className="text-[14px] text-secondary leading-relaxed max-w-sm">
                    {t('contact.desc')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-primary tracking-wide">{t('contact.name_label')}</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('contact.name_placeholder')}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-[20px] px-10 py-2.5 text-[15px] shadow-none outline-none focus:border-black/20 dark:focus:border-white/20 focus:bg-white dark:focus:bg-black transition-all duration-200 text-primary placeholder:text-muted"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-primary tracking-wide">{t('contact.email_label')}</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder={t('contact.email_placeholder')}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-[20px] px-10 py-2.5 text-[15px] shadow-none outline-none focus:border-black/20 dark:focus:border-white/20 focus:bg-white dark:focus:bg-black transition-all duration-200 text-primary placeholder:text-muted"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-primary tracking-wide">{t('contact.msg_label')}</label>
                        <div className="relative group">
                            <MessageSquare className="absolute left-3 top-3.5 size-4 text-muted group-focus-within:text-primary transition-colors" />
                            <textarea
                                required
                                rows={5}
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder={t('contact.msg_placeholder')}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-[24px] px-10 py-4 text-[15px] shadow-none focus:border-black/20 dark:focus:border-white/20 focus:bg-white dark:focus:bg-black transition-all duration-200 resize-none text-primary placeholder:text-primary/40 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <OSButton 
                        type="submit" 
                        variant="primary"
                        disabled={loading}
                    >
                        <div className="flex items-center gap-2">
                            <span>
                                {loading ? t('contact.sending_btn') : t('contact.send_btn')}
                            </span>
                            {!loading && <Send className="size-4 relative -top-[0.5px]" />}
                        </div>
                    </OSButton>
                </div>
            </form>
        </div>
    )
}
