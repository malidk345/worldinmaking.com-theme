"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import RichTextEditor from '../components/RichTextEditor';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export default function ProfilePage({ zIndex, onFocus, onClose, isWindowMode = false }) {
    const router = useRouter();
    const { profile, user, loading: authLoading } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('bio');
    const [bioContent, setBioContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Photo modal state
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [tempPhotoUrl, setTempPhotoUrl] = useState('');

    const tabs = ['bio', 'saved posts'];

    useEffect(() => {
        if (profile?.bio) {
            setBioContent(profile.bio);
        }
    }, [profile]);

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            router.push('/');
        }
    };

    const handleSaveBio = async () => {
        if (!user) return;
        setIsSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({ bio: bioContent })
            .eq('id', user.id);

        setIsSaving(false);

        if (error) {
            addToast('Failed to save bio', 'error');
        } else {
            addToast('Bio saved', 'success');
            setIsEditing(false);
        }
    };

    const handleSavePhoto = async () => {
        if (!user || !tempPhotoUrl.trim()) return;

        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: tempPhotoUrl.trim() })
            .eq('id', user.id);

        if (error) {
            addToast('Failed to update photo', 'error');
        } else {
            addToast('Photo updated', 'success');
            setIsPhotoModalOpen(false);
        }
    };

    const handleOpenPhotoModal = () => {
        setTempPhotoUrl(profile?.avatar_url || '');
        setIsPhotoModalOpen(true);
    };

    const renderLoading = () => (
        <div className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
            <div className="animate-pulse text-secondary text-xs font-bold">Loading...</div>
        </div>
    );

    const renderNotSignedIn = () => (
        <div className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
            <div className="text-center p-8">
                <h2 className="text-xl font-bold text-primary mb-2">Sign in required</h2>
                <p className="text-sm text-secondary mb-4">Please sign in to view your profile.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="LemonButton LemonButton--primary LemonButton--small"
                >
                    <span className="LemonButton__chrome gap-2 mx-auto">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y y2="12" /></svg>
                        Sign In
                    </span>
                </button>
            </div>
        </div>
    );

    const joinYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

    const mainContent = (
        <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">

                {/* Profile Header */}
                <div className="bg-white border border-black/15 rounded-lg p-4 mb-4 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-md border border-black/15 overflow-hidden bg-white shrink-0 flex items-center justify-center text-primary text-xl font-bold select-none">
                                    {profile?.avatar_url ? (
                                        <UserAvatar
                                            src={profile?.avatar_url}
                                            name={profile?.username || '?'}
                                            size={56}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        (profile?.username || 'u').charAt(0)
                                    )}
                                </div>
                                <button
                                    onClick={handleOpenPhotoModal}
                                    className="absolute -bottom-1 -right-1 p-1 bg-white border border-black/15 rounded hover:bg-black/5 transition-all opacity-0 group-hover:opacity-100 z-10"
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                </button>
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none mb-0.5">{profile?.username || 'user'}</h1>
                                <p className="text-secondary text-[11px] font-medium flex items-center gap-1.5">
                                    <span className="text-primary">@{profile?.username || 'user'}</span>
                                    <span className="w-1 h-1 bg-secondary rounded-full opacity-40"></span>
                                    Joined {joinYear}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="LemonButton LemonButton--secondary LemonButton--small flex-1 sm:flex-none"
                            >
                                <span className="LemonButton__chrome gap-2 justify-center w-full sm:w-auto">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Folder Tabs */}
                <div className="flex items-end gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`LemonButton px-4 md:px-5 py-1.5 md:py-2 text-[11px] font-bold transition-all relative rounded-t-md border-x border-t border-black/15 whitespace-nowrap capitalize ${activeTab === tab
                                ? 'bg-white translate-y-px z-10 text-primary'
                                : 'bg-transparent hover:bg-white/60 text-secondary border-transparent'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Panel */}
                <div className="bg-white border border-black/15 rounded-b-lg rounded-tr-lg p-4 md:p-6">
                    {activeTab === 'bio' ? (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight mb-0.5">Biography</h2>
                                </div>
                                {isEditing && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="LemonButton LemonButton--secondary LemonButton--small"
                                        >
                                            <span className="LemonButton__chrome">
                                                Cancel
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveBio}
                                            disabled={isSaving}
                                            className="LemonButton LemonButton--primary LemonButton--small shadow-[0_3px_0_0_#171717]"
                                        >
                                            <span className="LemonButton__chrome gap-1.5 uppercase font-bold text-[10px]">
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <RichTextEditor
                                    value={bioContent}
                                    onChange={setBioContent}
                                    placeholder="Write something about yourself here..."
                                    minHeight="320px"
                                />
                            ) : (
                                <div className="min-h-[120px] text-sm text-primary leading-relaxed">
                                    {bioContent || profile?.bio ? (
                                        <div
                                            className="prose-content"
                                            dangerouslySetInnerHTML={{ __html: bioContent || profile?.bio }}
                                        />
                                    ) : (
                                        <p className="text-secondary italic font-medium opacity-60">No bio yet... click edit to add one.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                            <div className="w-14 h-14 bg-white border border-black/15 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-base mb-1 capitalize tracking-tight">{activeTab} Empty</h3>
                            <p className="text-secondary text-[11px] font-medium max-w-[200px] opacity-70">No items found in your collection.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );

    let finalContent;
    if (authLoading) {
        finalContent = renderLoading();
    } else if (!user) {
        finalContent = renderNotSignedIn();
    } else {
        finalContent = mainContent;
    }

    if (isWindowMode) return (
        <>
            {finalContent}
            {/* Photo Modal */}
            {isPhotoModalOpen && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-white border border-black/15 rounded-lg p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                                Profile Picture
                            </div>
                            <button onClick={() => setIsPhotoModalOpen(false)} className="text-secondary hover:text-primary">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[11px] font-medium text-secondary mb-3">Enter a direct image URL to update your profile photo.</p>
                        <div className="relative mb-4">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary opacity-40">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </div>
                            <input
                                autoFocus
                                type="text"
                                placeholder="https://..."
                                className="w-full bg-white border border-black/20 rounded pl-9 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors text-primary"
                                value={tempPhotoUrl}
                                onChange={(e) => setTempPhotoUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSavePhoto()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPhotoModalOpen(false)}
                                className="LemonButton LemonButton--secondary LemonButton--small flex-1"
                            >
                                <span className="LemonButton__chrome w-full justify-center">
                                    Cancel
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePhoto}
                                className="LemonButton LemonButton--primary LemonButton--small flex-1 shadow-[0_3px_0_0_#171717]"
                            >
                                <span className="LemonButton__chrome gap-1.5 w-full justify-center">
                                    Save
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden absolute inset-0">
            <DashboardHeader />
            <PageWindow id="profile-window" title="profile" onClose={handleClose} zIndex={zIndex} onFocus={onFocus}>
                {finalContent}
            </PageWindow>

            {/* Photo Modal */}
            {isPhotoModalOpen && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-white border border-black/15 rounded-lg p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs font-bold">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                                Profile Picture
                            </div>
                            <button onClick={() => setIsPhotoModalOpen(false)} className="text-secondary hover:text-primary">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[11px] font-medium text-secondary mb-3">Enter a direct image URL to update your profile photo.</p>
                        <div className="relative mb-4">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary opacity-40">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </div>
                            <input
                                autoFocus
                                type="text"
                                placeholder="https://..."
                                className="w-full bg-white border border-black/20 rounded pl-9 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors text-primary"
                                value={tempPhotoUrl}
                                onChange={(e) => setTempPhotoUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSavePhoto()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPhotoModalOpen(false)}
                                className="LemonButton LemonButton--secondary LemonButton--small flex-1"
                            >
                                <span className="LemonButton__chrome w-full justify-center">
                                    Cancel
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePhoto}
                                className="LemonButton LemonButton--primary LemonButton--small flex-1 shadow-[0_3px_0_0_#171717]"
                            >
                                <span className="LemonButton__chrome gap-1.5 w-full justify-center capitalize font-bold text-[10px]">
                                    Save Photo
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
