"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/App';
import { useToast } from '../../context/ToastContext';

// Icons
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
);

export default function LoginContent() {
    const { signInWithEmail, user, profile, signOut, loading: authLoading, isAdmin } = useAuth();
    const { addWindow, closeWindow } = useApp();
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
            <div className="flex-1 flex items-center justify-center p-8 h-full bg-[#fcfcfc]">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 h-full bg-[#fcfcfc]">
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

                    <div className="flex flex-col gap-3 w-full mt-4">
                        {isAdmin && (
                            <button
                                onClick={() => addWindow({ key: 'admin', path: '/admin', title: 'Admin Dashboard' })}
                                className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:opacity-90 text-sm transition-all shadow-[0_4px_0_0_#171717] hover:shadow-[0_6px_0_0_#171717] active:shadow-[0_2px_0_0_#171717] hover:-translate-y-0.5 active:translate-y-0.5"
                            >
                                open dashboard
                            </button>
                        )}
                        <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-all active:scale-95"
                        >
                            sign out
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (sent) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 h-full bg-[#fcfcfc]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-sm w-full bg-white rounded-xl p-8 shadow-lg border border-black/5 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600 animate-pulse mx-auto">
                        <MailIcon />
                    </div>
                    <h2 className="text-xl font-black mb-2">check your inbox</h2>
                    <p className="text-sm text-gray-500 mb-6 font-medium">
                        we sent a magic link to <span className="font-bold text-gray-900">{email}</span>. click it to sign in.
                    </p>
                    <button
                        onClick={() => setSent(false)}
                        className="text-xs text-gray-400 hover:text-gray-900 underline"
                    >
                        try different email
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-8 h-full bg-[#fcfcfc]">
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
                    <p className="text-sm text-gray-500 mt-2 font-medium">
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
                        className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-400 font-medium"
                    />

                    <button
                        disabled={loading}
                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:opacity-90 text-sm mt-2 disabled:opacity-50 transition-all shadow-[0_3px_0_0_#171717] hover:shadow-[0_5px_0_0_#171717] active:shadow-[0_1px_0_0_#171717] hover:-translate-y-0.5 active:translate-y-0.5"
                    >
                        {loading ? 'sending link...' : 'send magic link'}
                    </button>
                </form>

                <p className="text-[10px] text-gray-400 text-center mt-6">
                    by signing in, you agree to our terms and privacy policy.
                </p>
            </motion.div>
        </div>
    );
}
