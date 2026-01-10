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

export default function ProfilePage() {
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
        router.push('/');
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
            addToast('failed to save bio', 'error');
        } else {
            addToast('bio saved', 'success');
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
            addToast('failed to update photo', 'error');
        } else {
            addToast('photo updated', 'success');
            setIsPhotoModalOpen(false);
        }
    };

    const handleOpenPhotoModal = () => {
        setTempPhotoUrl(profile?.avatar_url || '');
        setIsPhotoModalOpen(true);
    };

    if (authLoading) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="profile-window" title="profile" onClose={handleClose}>
                    <div className="flex-1 flex items-center justify-center bg-white h-full">
                        <div className="animate-pulse text-[#2d2d2d]/50 text-xs font-black lowercase">loading...</div>
                    </div>
                </PageWindow>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="profile-window" title="profile" onClose={handleClose}>
                    <div className="flex-1 flex items-center justify-center bg-white h-full">
                        <div className="text-center p-8">
                            <h2 className="text-xl font-black text-[#2d2d2d] mb-2 lowercase">sign in required</h2>
                            <p className="text-[11px] text-[#2d2d2d]/50 font-bold mb-4 lowercase">please sign in to view your profile.</p>
                            <button
                                onClick={() => router.push('/login')}
                                className="px-4 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-lg text-xs font-black transition-all lowercase"
                            >
                                sign in
                            </button>
                        </div>
                    </div>
                </PageWindow>
            </div>
        );
    }

    const joinYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="profile-window" title="profile" onClose={handleClose}>
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">

                        {/* Profile Header - Compact Version */}
                        <div className="bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-xl p-3 md:p-4 mb-4 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-[1.5px] border-[#2d2d2d]/20 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center text-[#2d2d2d] text-xl font-black lowercase select-none">
                                            {profile?.avatar_url ? (
                                                <UserAvatar
                                                    src={profile?.avatar_url}
                                                    name={profile?.username || '?'}
                                                    size={56}
                                                    className="w-full h-full"
                                                />
                                            ) : (
                                                (profile?.username || 'u').charAt(0).toLowerCase()
                                            )}
                                        </div>
                                        <button
                                            onClick={handleOpenPhotoModal}
                                            className="absolute -bottom-1 -right-1 p-1 bg-white border-[1.5px] border-[#2d2d2d]/20 rounded-md hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100 z-10"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div>
                                        <h1 className="text-lg md:text-xl font-[900] tracking-tight leading-none mb-0.5 lowercase">{profile?.username || 'user'}</h1>
                                        <p className="text-[#2d2d2d]/50 text-[10px] md:text-[11px] font-bold flex items-center gap-1.5 lowercase">
                                            <span className="text-[#2d2d2d]">@{profile?.username || 'user'}</span>
                                            <span className="w-1 h-1 bg-current rounded-full opacity-20"></span>
                                            joined {joinYear}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className="flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-gray-50 border-[1.5px] border-[#2d2d2d]/10 rounded-md text-[11px] font-black transition-all text-center lowercase"
                                    >
                                        {isEditing ? 'cancel' : 'edit profile'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Folder Tabs */}
                        <div className="flex items-end gap-1 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 md:px-5 py-1.5 md:py-2 text-[11px] font-black transition-all relative rounded-t-lg border-x-[1.5px] border-t-[1.5px] border-[#2d2d2d]/10 whitespace-nowrap lowercase ${activeTab === tab
                                            ? 'bg-white translate-y-[2px] z-10 border-[#2d2d2d]/10'
                                            : 'bg-transparent hover:bg-white/40 text-[#2d2d2d]/40 border-transparent'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content Panel */}
                        <div className="bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-b-xl rounded-tr-xl p-4 md:p-6 shadow-sm">
                            {activeTab === 'bio' ? (
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <div>
                                            <h2 className="text-lg font-[900] tracking-tight mb-0.5 lowercase">biography</h2>
                                        </div>
                                        {isEditing && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-3 py-1.5 text-xs font-black hover:bg-gray-100 rounded-md transition-all lowercase"
                                                >
                                                    cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveBio}
                                                    disabled={isSaving}
                                                    className="px-4 py-1.5 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-md text-xs font-black transition-all lowercase disabled:opacity-50"
                                                >
                                                    {isSaving ? 'saving...' : 'save'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <RichTextEditor
                                            content={bioContent}
                                            onChange={setBioContent}
                                            placeholder="write something about yourself here..."
                                            minHeight="320px"
                                        />
                                    ) : (
                                        <div className="min-h-[120px] text-[14px] text-[#2d2d2d] leading-relaxed lowercase">
                                            {bioContent || profile?.bio ? (
                                                <div
                                                    className="prose-compact"
                                                    dangerouslySetInnerHTML={{ __html: bioContent || profile?.bio }}
                                                />
                                            ) : (
                                                <p className="text-[#2d2d2d]/40 italic">no bio yet... click edit to add one.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                                    <div className="w-14 h-14 bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-xl flex items-center justify-center mb-4 rotate-2 hover:rotate-0 transition-transform">
                                        <svg className="w-7 h-7 text-[#2d2d2d]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-black text-base mb-1 lowercase">{activeTab} empty</h3>
                                    <p className="text-[#2d2d2d]/40 text-[11px] font-bold max-w-[200px] lowercase">no items found in your collection.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </PageWindow>

            {/* Photo Modal */}
            {isPhotoModalOpen && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-[4px] z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-xl p-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[#2d2d2d] font-black text-xs lowercase">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                profile picture
                            </div>
                            <button onClick={() => setIsPhotoModalOpen(false)} className="text-gray-400 hover:text-black">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[10px] font-bold text-[#2d2d2d]/50 mb-3 lowercase">enter a direct image url to update your profile photo.</p>
                        <div className="relative mb-4">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <input
                                autoFocus
                                type="text"
                                placeholder="https://..."
                                className="w-full bg-[#f3f4f6] border-[1.5px] border-[#2d2d2d]/10 rounded-lg pl-9 pr-3 py-2 text-xs outline-none lowercase font-medium"
                                value={tempPhotoUrl}
                                onChange={(e) => setTempPhotoUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSavePhoto()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsPhotoModalOpen(false)}
                                className="flex-1 py-2 bg-white hover:bg-gray-50 border-[1.5px] border-[#2d2d2d]/10 rounded-lg text-xs font-black transition-all lowercase"
                            >
                                cancel
                            </button>
                            <button
                                onClick={handleSavePhoto}
                                className="flex-1 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-lg text-xs font-black transition-all lowercase"
                            >
                                save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .prose-compact blockquote {
                    border-left: 3px solid #2d2d2d;
                    padding-left: 1rem;
                    margin: 1rem 0;
                    font-style: italic;
                    opacity: 0.7;
                }
                .prose-compact ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 1rem 0;
                }
                .prose-compact a {
                    color: #254b85;
                    text-decoration: underline;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
}
