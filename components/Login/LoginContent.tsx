"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/App';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'hooks/useTranslation';

// Icons
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
);

export default function LoginContent() {
    const { signInWithEmail, user, profile, signOut, loading: authLoading, isAdmin } = useAuth();
    const { addWindow } = useApp();
    const { addToast } = useToast();
    const { t } = useTranslation();
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
            addToast(error.message?.toLowerCase() || t('login.failed'), 'error');
        } else {
            setSent(true);
            addToast(t('login.magic_sent_success'), 'success');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        addToast(t('login.signout_success'), 'info');
    };

    if (authLoading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-6 h-full w-full bg-transparent">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-8 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                    <span className="text-xs font-bold text-primary opacity-60 lowercase">{t('login.initializing')}</span>
                </div>
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-transparent relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <div className="bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[30px] rounded-[28px] border border-black/5 dark:border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                            <UserIcon />
                        </div>
                        <h2 className="text-lg font-black text-primary lowercase mb-1">{t('login.authenticated')}</h2>
                        <p className="text-xs text-primary/80 mb-6 font-bold bg-white/50 dark:bg-black/50 px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5 shadow-sm lowercase">
                            {profile?.username || user.email}
                        </p>

                        <div className="flex flex-col gap-2 w-full">
                            {isAdmin && (
                                <button
                                    onClick={() => addWindow({ key: 'admin', path: '/admin', title: t('menu.admin_dashboard') })}
                                    className="w-full py-2.5 rounded-full bg-black/85 hover:bg-black dark:bg-white/80 dark:hover:bg-white text-white dark:text-black font-semibold text-xs transition-all cursor-pointer shadow-sm lowercase"
                                >
                                    {t('login.open_dashboard')}
                                </button>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="w-full py-2.5 rounded-full bg-transparent hover:bg-red-500/10 border border-red-500/20 text-red-500 font-semibold text-xs transition-all cursor-pointer lowercase"
                            >
                                {t('menu.sign_out')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (sent) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-transparent relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <div className="bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[30px] rounded-[28px] border border-black/5 dark:border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                            <MailIcon />
                        </div>
                        <h2 className="text-lg font-black text-primary lowercase mb-2">{t('login.check_inbox')}</h2>
                        <p className="text-xs text-primary/70 mb-6 font-medium leading-relaxed lowercase">
                            {t('login.magic_sent_to')} <span className="font-bold border-b border-primary/20 pb-px text-primary">{email}</span>.<br />{t('login.click_to_signin')}
                        </p>
                        
                        <button
                            onClick={() => setSent(false)}
                            className="px-6 py-2 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 text-primary font-bold text-xs transition-all cursor-pointer lowercase"
                        >
                            {t('login.diff_email')}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 h-full w-full bg-transparent relative">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-sm relative z-10"
            >
                <div className="bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[30px] rounded-[28px] border border-black/5 dark:border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-11 h-11 rounded-[16px] flex-shrink-0 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center text-primary">
                            <UserIcon />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-primary lowercase mb-0.5 leading-none">{t('login.member_login')}</h2>
                            <p className="text-[11px] font-bold text-primary/50 leading-snug lowercase">
                                {t('login.auth_desc')}
                            </p>
                        </div>
                    </div>

                    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            required
                            placeholder={t('login.placeholder')}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white/60 dark:bg-black/60 border border-black/5 dark:border-white/5 rounded-full px-4 py-2.5 text-sm text-primary font-bold outline-none placeholder:text-primary/40 focus:bg-white focus:border-black/10 dark:focus:bg-black/80 dark:focus:border-white/10 shadow-inner transition-all duration-300 lowercase"
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-full bg-black/85 hover:bg-black dark:bg-white/80 dark:hover:bg-white text-white dark:text-black font-semibold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2 lowercase"
                        >
                            {loading ? t('login.sending_link') : t('login.send_link')}
                        </button>
                    </form>
                </div>

                <div className="mt-5 text-center">
                    <p className="text-[10px] font-bold text-primary/40 lowercase tracking-wider">
                        {t('login.secure_system')}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
