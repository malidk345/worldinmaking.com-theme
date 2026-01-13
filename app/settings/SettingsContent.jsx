"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage({ isWindowMode = false }) {
    const router = useRouter();
    const { addToast } = useToast();
    const { user, profile, loading: authLoading, updateProfile } = useAuth();

    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setAvatarUrl(profile.avatar_url || '');
        }
    }, [profile]);

    useEffect(() => {
        // Redirect if not logged in
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            addToast('username is required', 'error');
            return;
        }

        setSaving(true);
        const success = await updateProfile(username.trim(), avatarUrl.trim());
        setSaving(false);

        if (success) {
            addToast('profile updated successfully', 'success');
        } else {
            addToast('failed to update profile', 'error');
        }
    };

    const renderLoading = () => (
        <main className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
            <div className="animate-pulse text-gray-400">Loading...</div>
        </main>
    );

    const mainContent = user ? (
        <main className="flex-1 flex items-center justify-center bg-bg-3000 p-8 h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-xl p-8 shadow-lg border border-black/5"
            >
                <h1 className="text-xl font-black mb-6">profile settings</h1>

                <form onSubmit={handleSave} className="space-y-5">
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">email</label>
                        <input
                            type="email"
                            value={user.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your username"
                            className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-400"
                        />
                    </div>

                    {/* Avatar URL */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">avatar url</label>
                        <input
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                            className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-400"
                        />
                        <p className="text-xs text-gray-400 mt-1">paste a url to your profile picture</p>
                    </div>

                    {/* Preview */}
                    {avatarUrl && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">preview</label>
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                                <img
                                    src={avatarUrl}
                                    alt="Avatar preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Role Badge */}
                    {profile?.role && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">role</label>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${profile.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                                }`}>
                                {profile.role}
                            </span>
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:opacity-90 text-sm mt-2 disabled:opacity-50 transition-all shadow-[0_4px_0_0_#171717] hover:shadow-[0_6px_0_0_#171717] active:shadow-[0_2px_0_0_#171717] hover:-translate-y-0.5 active:translate-y-0.5"
                    >
                        {saving ? 'saving...' : 'save changes'}
                    </button>
                </form>
            </motion.div>
        </main>
    ) : null;

    if (authLoading) {
        return isWindowMode ? renderLoading() : null;
    }

    if (!user) return null;

    if (isWindowMode) return mainContent;

    return null;
}
