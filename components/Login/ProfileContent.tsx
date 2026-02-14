"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { IconUser, IconUpload, IconLock, IconChevronRight } from '@posthog/icons';
import Input from '../OSForm/input';

export default function ProfileContent() {
    const { user, profile, updateProfile, signOut } = useAuth();
    const { addToast } = useToast();

    const [username, setUsername] = useState(profile?.username || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [updating, setUpdating] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        const success = await updateProfile(username, avatarUrl);
        setUpdating(false);

        if (success) {
            addToast('profile updated successfully', 'success');
        } else {
            addToast('failed to update profile', 'error');
        }
    };

    if (!user) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-accent overflow-y-auto custom-scrollbar">
            <div className="p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto w-full space-y-8"
                >
                    {/* Header Card */}
                    <div className="bg-primary border border-primary rounded p-6 shadow-sm flex items-center gap-6">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary shadow-inner bg-accent flex-shrink-0">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-secondary">
                                        <IconUser className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconUpload className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black lowercase m-0 text-primary">{profile?.username || 'anonymous'}</h2>
                            <p className="text-[15px] text-secondary lowercase m-0 font-medium">{user.email}</p>
                            <div className="mt-3 flex gap-2">
                                <span className="px-2 py-0.5 bg-accent border border-primary rounded text-[11px] font-bold lowercase text-secondary">
                                    {profile?.role || 'member'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Edit Form */}
                    <div className="bg-primary border border-primary rounded overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-primary bg-accent/30 flex items-center justify-between">
                            <h3 className="text-sm font-black lowercase m-0 opacity-70">account settings</h3>
                            <IconLock className="w-4 h-4 opacity-30" />
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <Input
                                label="username"
                                direction="column"
                                value={username}
                                onChange={(e: any) => setUsername(e.target.value)}
                                placeholder="choose a display name"
                                description="this is how you'll appear to others in the community."
                            />

                            <Input
                                label="avatar url"
                                direction="column"
                                value={avatarUrl}
                                onChange={(e: any) => setAvatarUrl(e.target.value)}
                                placeholder="https://..."
                                description="provide a direct link to an image (unoptimized)."
                                tooltip="we recommend using a cloudinary or imgur link for best performance."
                                showClearButton
                                onClear={() => setAvatarUrl('')}
                            />

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-primary">
                                <button
                                    type="button"
                                    onClick={() => signOut()}
                                    className="px-4 py-2 text-red font-bold text-[13px] hover:bg-red/5 rounded transition-colors lowercase"
                                >
                                    sign out
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-2 bg-gray-900 text-white font-bold rounded hover:opacity-90 text-[13px] disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {updating ? 'saving...' : 'save changes'}
                                    {!updating && <IconChevronRight className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-center gap-4 py-4 opacity-30 group hover:opacity-100 transition-opacity">
                        <div className="h-px bg-primary flex-1" />
                        <div className="text-[11px] font-bold lowercase tracking-wider flex items-center gap-2">
                            <span>posthog os v1.0.4</span>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            <span>secured by magic link</span>
                        </div>
                        <div className="h-px bg-primary flex-1" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
