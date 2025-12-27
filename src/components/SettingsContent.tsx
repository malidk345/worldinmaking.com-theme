'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserAvatar } from './UserAvatar';

const SettingsContent = () => {
    const { profile, updateProfile } = useAuth();
    const { addToast } = useToast();

    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setAvatarUrl(profile.avatar_url || '');
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const success = await updateProfile(username, avatarUrl);

        setLoading(false);
        if (success) {
            addToast('profile updated successfully', 'success');
        } else {
            addToast('failed to update profile', 'error');
        }
    };

    return (
        <div className="p-8 max-w-xl mx-auto animate-fade-up">
            <h2 className="text-xl font-bold mb-6 lowercase text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-4">
                user settings
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Avatar Preview */}
                <div className="flex items-center gap-6">
                    <UserAvatar
                        src={avatarUrl}
                        name={username || 'user'}
                        size={80}
                        className="ring-4 ring-white dark:ring-white/10"
                    />
                    <div className="text-sm text-zinc-500 lowercase">
                        <p>this is how you will appear in comments and posts.</p>
                        <p className="mt-1 text-xs opacity-60">if no image url is provided, your initial will be shown.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">display name (username)</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full p-3 bg-zinc-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:border-black dark:focus:border-white transition-colors lowercase"
                        required
                        minLength={3}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">avatar image url</label>
                    <input
                        type="url"
                        value={avatarUrl}
                        onChange={e => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/my-photo.jpg"
                        className="w-full p-3 bg-zinc-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:border-black dark:focus:border-white transition-colors lowercase"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1 lowercase">paste a direct link to an image (jpg, png). leave empty to use initials.</p>
                </div>

                <div className="pt-4">
                    <button
                        disabled={loading}
                        className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 lowercase disabled:opacity-50 transition-all"
                    >
                        {loading ? 'saving changes...' : 'save profile'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsContent;
