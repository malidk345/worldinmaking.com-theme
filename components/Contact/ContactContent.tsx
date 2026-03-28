"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import OSButton from 'components/OSButton'
import { supabase } from 'lib/supabase'
import { useToast } from 'context/ToastContext'
import { Mail, User, Send, MessageSquare } from 'lucide-react'

export default function ContactContent() {
    const { addToast } = useToast()
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
            addToast('please fill in all fields', 'warning')
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
            addToast('message transmitted successfully', 'success')
        } catch (err: any) {
            console.error('Contact error:', err)
            addToast(`failed to send message: ${err.message || 'unknown error'}`, 'error')
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
                <h2 className="text-xl font-black lowercase tracking-tighter">transmission complete</h2>
                <p className="text-sm opacity-60 max-w-xs lowercase">
                    your message has been archived in the system. we will respond if action is required.
                </p>
                <OSButton 
                    variant="secondary" 
                    onClick={() => setSent(false)}
                    className="mt-4"
                >
                    <span className="px-4 lowercase">send another</span>
                </OSButton>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col lowercase font-mono">
            <div className="p-6 border-b border-primary/10 bg-accent/50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 bg-primary/10 border border-primary flex items-center justify-center">
                        <Mail className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black leading-none">contact</h2>
                    </div>
                </div>
                <p className="text-xs opacity-60 leading-relaxed max-w-sm">
                    direct line for inquiries, collaborations, or system reports.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase opacity-30 tracking-widest pl-1">name</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="your identity..."
                                className="w-full bg-white dark:bg-zinc-800 border border-primary/20 focus:border-primary px-9 py-2.5 text-sm outline-none transition-all rounded-[1px] shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase opacity-30 tracking-widest pl-1">return email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="address@domain.com..."
                                className="w-full bg-white dark:bg-zinc-800 border border-primary/20 focus:border-primary px-9 py-2.5 text-sm outline-none transition-all rounded-[1px] shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase opacity-30 tracking-widest pl-1">message body</label>
                        <div className="relative group">
                            <MessageSquare className="absolute left-3 top-3 size-3.5 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                            <textarea
                                required
                                rows={5}
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder="type your transmission here..."
                                className="w-full bg-white dark:bg-zinc-800 border border-primary/20 focus:border-primary px-9 py-3 text-sm outline-none transition-all rounded-[1px] shadow-inner resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <OSButton 
                        type="submit" 
                        variant="secondary"
                        disabled={loading}
                        className="!opacity-100 lowercase !text-black"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-bold">
                                {loading ? 'sending...' : 'send message'}
                            </span>
                            {!loading && <Send className="size-3.5" />}
                        </div>
                    </OSButton>
                </div>
            </form>
        </div>
    )
}
