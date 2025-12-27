'use client';

import React, { useState } from 'react';
import { UserIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface LoginContentProps {
    onClose: () => void;
}

const LoginContent: React.FC<LoginContentProps> = ({ onClose }) => {
    const { addToast } = useToast();
    const { signInWithEmail, user, signOut } = useAuth();
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
            addToast(error.message.toLowerCase(), 'error');
        } else {
            setSent(true);
            addToast('magic link sent. check your inbox.', 'success');
        }
    };

    if (user) {
        return (
            <div className="p-8 max-w-sm mx-auto flex flex-col justify-center items-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <UserIcon />
                </div>
                <h2 className="text-xl font-black lowercase mb-2">welcome back</h2>
                <p className="text-sm text-zinc-500 lowercase mb-6">{user.email}</p>
                <button
                    onClick={() => { signOut(); onClose(); }}
                    className="px-6 py-2 border border-black/10 dark:border-white/10 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 lowercase text-sm font-bold"
                >
                    sign out
                </button>
            </div>
        );
    }

    if (sent) {
        return (
            <div className="p-8 max-w-sm mx-auto flex flex-col justify-center items-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                </div>
                <h2 className="text-xl font-black lowercase mb-2">check your inbox</h2>
                <p className="text-sm text-zinc-500 lowercase mb-6">
                    we sent a magic link to <span className="font-bold text-black dark:text-white">{email}</span>. click it to sign in.
                </p>
                <button
                    onClick={() => setSent(false)}
                    className="text-xs text-zinc-400 hover:text-black dark:hover:text-white underline lowercase"
                >
                    try different email
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-sm mx-auto flex flex-col justify-center min-h-[400px]">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 dark:bg-white/10 mb-4 text-black dark:text-white">
                    <UserIcon />
                </div>
                <h2 className="text-xl font-black lowercase">member access</h2>
                <p className="text-sm text-zinc-500 lowercase mt-2">
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
                    className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase text-sm transition-colors"
                />

                <button
                    disabled={loading}
                    className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg lowercase hover:opacity-90 text-sm mt-2 disabled:opacity-50 transition-opacity"
                >
                    {loading ? 'sending link...' : 'send magic link'}
                </button>
            </form>
        </div>
    );
}

export default LoginContent;
