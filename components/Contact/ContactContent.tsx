"use client"

import React, { useState } from 'react'
import { LemonButton } from 'components/LemonUI'
import { LemonInput, LemonTextArea } from '@/components/LemonUI'
import { supabase } from 'lib/supabase'
import { useToast } from 'context/ToastContext'
import { IconChat, IconMessage, IconPerson, IconSend } from '@posthog/icons';
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
                    <IconSend className="size-8" />
                </div>
                <h2 className="text-xl font-black lowercase tracking-tighter">{t('contact.sent_title')}</h2>
                <p className="text-sm opacity-60 max-w-xs lowercase">
                    {t('contact.sent_desc')}
                </p>
                <LemonButton
                    type="secondary"
                    onClick={() => setSent(false)}
                    className="mt-4"
                >
                    <span className="px-4 lowercase">{t('contact.send_another')}</span>
                </LemonButton>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col lowercase font-sans">
            <div className="p-6 border-b border-primary/10 bg-accent/40 supports-[backdrop-filter]:backdrop-blur-md">
                <div className="flex items-center gap-4 mb-3">
                    <div className="size-12 rounded-lg bg-primary border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-primary">
                        <IconMessage className="size-6 opacity-80" />
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
                        <LemonInput
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('contact.name_placeholder')}
                            icon={<IconPerson className="size-4" />}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-primary tracking-wide">{t('contact.email_label')}</label>
                        <LemonInput
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder={t('contact.email_placeholder')}
                            icon={<IconMessage className="size-4" />}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-primary tracking-wide">{t('contact.msg_label')}</label>
                        <LemonTextArea
                            required
                            rows={5}
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            placeholder={t('contact.msg_placeholder')}
                        />
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <LemonButton
                        htmlType="submit" type="primary"
                        disabled={loading}
                    >
                        <div className="flex items-center gap-2">
                            <span>
                                {loading ? t('contact.sending_btn') : t('contact.send_btn')}
                            </span>
                            {!loading && <IconSend className="size-4 relative -top-[0.5px]" />}
                        </div>
                    </LemonButton>
                </div>
            </form>
        </div>
    )
}
