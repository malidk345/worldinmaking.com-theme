"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useWindow } from '../contexts/WindowContext';

// Icons
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
);

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const { openWindow } = useWindow();
    const { signInWithEmail, user, profile, signOut, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    // Auto-open profile window on login
    React.useEffect(() => {
        if (user) {
            openWindow('profile', { id: 'profile-window', title: 'profile' });
        }
    }, [user, openWindow]);

    const handleClose = () => {
        router.push('/');
    };

    const handleSubmit = async (e) => {
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

    const handleSignOut = () => {
        signOut();
        addToast('signed out successfully', 'success');
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="login-window" title="login" onClose={handleClose}>
                    <main className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
                        <div className="animate-pulse text-gray-400">Loading...</div>
                    </main>
                </PageWindow>
            </div>
        );
    }

    // Logged in state
    if (user) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="login-window" title="profile" onClose={handleClose}>
                    <main className="flex-1 flex items-center justify-center bg-bg-3000 p-8 h-full">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-sm w-full bg-white rounded-xl p-8 shadow-lg border border-black/5 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6 text-green-600 mx-auto">
                                <UserIcon />
                            </div>

                            <h2 className="text-xl font-black mb-1">welcome back</h2>
                            <p className="text-sm text-gray-500 mb-8 font-medium">{profile?.username || user.email}</p>

                            {profile?.role === 'admin' && (
                                <Link
                                    href="/admin"
                                    className="mb-6 flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all w-full"
                                >
                                    <GridIcon />
                                    <span>open dashboard</span>
                                </Link>
                            )}

                            <div className="flex flex-col gap-3 w-full mt-4">
                                <Link
                                    href="/profile"
                                    className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 border-[1.5px] border-transparent hover:border-gray-200 rounded-md text-sm font-medium transition-all text-center"
                                >
                                    edit profile
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-all active:scale-95"
                                >
                                    sign out
                                </button>
                            </div>
                        </motion.div>
                    </main>
                </PageWindow>
            </div>
        );
    }

    // Magic link sent state
    if (sent) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="login-window" title="check inbox" onClose={handleClose}>
                    <main className="flex-1 flex items-center justify-center bg-bg-3000 p-8 h-full">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-sm w-full bg-white rounded-xl p-8 shadow-lg border border-black/5 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600 animate-pulse mx-auto">
                                <MailIcon />
                            </div>
                            <h2 className="text-xl font-black mb-2">check your inbox</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                we sent a magic link to <span className="font-bold text-gray-900">{email}</span>. click it to sign in.
                            </p>
                            <button
                                onClick={() => setSent(false)}
                                className="text-xs text-gray-400 hover:text-gray-900 underline"
                            >
                                try different email
                            </button>
                        </motion.div>
                    </main>
                </PageWindow>
            </div>
        );
    }

    // Login form
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="login-window" title="login" onClose={handleClose}>
                <main className="flex-1 flex items-center justify-center bg-bg-3000 p-8 h-full">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-sm w-full bg-white rounded-xl p-8 shadow-lg border border-black/5"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-gray-100 mb-4 text-gray-900">
                                <UserIcon />
                            </div>
                            <h2 className="text-xl font-black">member access</h2>
                            <p className="text-sm text-gray-500 mt-2">
                                enter your email to receive a magic login link. no password required.
                            </p>
                        </div>

                        {/* Form */}
                        <form className="space-y-3" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                required
                                placeholder="email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-400"
                            />

                            <button
                                disabled={loading}
                                className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:opacity-90 text-sm mt-2 disabled:opacity-50 transition-all shadow-[0_4px_0_0_#171717] hover:shadow-[0_6px_0_0_#171717] active:shadow-[0_2px_0_0_#171717] hover:-translate-y-0.5 active:translate-y-0.5"
                            >
                                {loading ? 'sending link...' : 'send magic link'}
                            </button>
                        </form>

                        <p className="text-xs text-gray-400 text-center mt-6">
                            by signing in, you agree to our terms and privacy policy.
                        </p>
                    </motion.div>
                </main>
            </PageWindow>
        </div>
    );
}
