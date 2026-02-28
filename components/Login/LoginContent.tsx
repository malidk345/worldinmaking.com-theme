"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/App';
import { useToast } from '../../context/ToastContext';
import OSButton from 'components/OSButton';

// Icons
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
);

export default function LoginContent() {
    const { signInWithEmail, user, profile, signOut, loading: authLoading, isAdmin } = useAuth();
    const { addWindow } = useApp();
    const { addToast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        const { error } = await signInWithEmail(email);
        setLoading(false);

        if (error) {
            addToast(error.message?.toLowerCase() || 'login failed', 'error');
        } else {
            setSent(true);
            addToast('magic link sent. check your inbox.', 'success');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        addToast('signed out successfully', 'info');
    };

    if (authLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-accent/40">
                <span className="animate-pulse text-sm font-bold !text-black opacity-60 lowercase">initializing subsystem...</span>
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-accent/40 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <div className="border border-primary bg-accent shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.1)] flex flex-col">
                        <div className="bg-primary px-3 py-1.5 border-b border-primary flex items-center">
                            <span className="!text-black font-bold text-xs tracking-widest lowercase">system status</span>
                        </div>
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                                <UserIcon />
                            </div>
                            <h2 className="text-lg font-black !text-black lowercase mb-1">authenticated</h2>
                            <p className="text-sm !text-black mb-6 font-medium bg-primary/5 px-3 py-1 border border-primary/20 opacity-80 lowercase">
                                {profile?.username || user.email}
                            </p>

                            <div className="flex flex-col gap-2 w-full mt-2">
                                {isAdmin && (
                                    <OSButton
                                        variant="secondary"
                                        onClick={() => addWindow({ key: 'admin', path: '/admin', title: 'Admin Dashboard' })}
                                        className="w-full justify-center lowercase !text-black"
                                    >
                                        open dashboard
                                    </OSButton>
                                )}
                                <OSButton
                                    variant="default"
                                    onClick={handleSignOut}
                                    className="w-full justify-center opacity-80 hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 lowercase !text-black"
                                >
                                    sign out
                                </OSButton>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (sent) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-accent/40 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <div className="border border-primary bg-accent shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.1)] flex flex-col">
                        <div className="bg-primary px-3 py-1.5 border-b border-primary flex items-center">
                            <span className="!text-black font-bold text-xs tracking-widest lowercase">awaiting action</span>
                        </div>
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 animate-pulse">
                                <MailIcon />
                            </div>
                            <h2 className="text-lg font-black !text-black lowercase mb-2">check your inbox</h2>
                            <p className="text-sm !text-black opacity-80 mb-6 font-medium leading-relaxed lowercase">
                                we sent a magic link to <span className="font-bold border-b border-primary/30 pb-px !text-black">{email}</span>.<br />click it to sign in.
                            </p>
                            <OSButton
                                variant="default"
                                size="sm"
                                onClick={() => setSent(false)}
                                className="lowercase !text-black"
                            >
                                enter different email
                            </OSButton>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-accent/40 relative">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm relative z-10"
            >
                <div className="border border-primary bg-accent shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.1)] flex flex-col">
                    {/* Header */}
                    <div className="bg-primary px-3 py-1.5 border-b border-primary flex items-center">
                        <span className="!text-black font-bold text-[11px] tracking-widest lowercase">authentication request</span>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 flex-shrink-0 bg-primary/10 border border-primary flex items-center justify-center !text-black">
                                <UserIcon />
                            </div>
                            <div>
                                <h2 className="text-base font-black !text-black lowercase mb-1 leading-none">member login</h2>
                                <p className="text-xs font-semibold !text-black opacity-60 leading-snug lowercase">
                                    auth link will be sent to your email address. no password required.
                                </p>
                            </div>
                        </div>

                        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                required
                                placeholder="name@domain.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary !text-black placeholder:!text-black/50 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] font-medium lowercase"
                            />

                            <div className="flex justify-end mt-1">
                                <OSButton
                                    variant="secondary"
                                    type="submit"
                                    disabled={loading}
                                    className="!opacity-100 lowercase !text-black"
                                >
                                    {loading ? 'sending link...' : 'send magic link'}
                                </OSButton>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-[10px] font-semibold !text-black opacity-40 lowercase tracking-wider">
                        secure access system
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
