"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';

export default function CommunityPage() {
    const router = useRouter();

    function timeAgo(dateString) {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    }

    const { user } = useAuth();
    const { posts, replies, loading, fetchPosts, fetchReplies, createPost, createReply } = useCommunity();

    const [activePost, setActivePost] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [likedPosts, setLikedPosts] = useState(new Set());

    useEffect(() => {
        fetchPosts(1);
        const timer = setInterval(() => fetchPosts(1), 15000);
        return () => clearInterval(timer);
    }, [fetchPosts]);

    useEffect(() => {
        if (activePost) {
            fetchReplies(activePost.id);
        }
    }, [activePost, fetchReplies]);

    const handlePostSubmit = async () => {
        if (!newPostTitle.trim() || !newPostContent.trim()) return;
        const success = await createPost(1, newPostTitle, newPostContent);
        if (success) {
            setNewPostTitle('');
            setNewPostContent('');
            setIsCreating(false);
            fetchPosts(1);
        }
    };

    const handleReplySubmit = async (postId) => {
        if (!replyContent.trim()) return;
        const success = await createReply(postId, replyContent);
        if (success) {
            setReplyContent('');
            setExpandedPostId(null);
        }
    };

    const handleClose = () => {
        router.push('/');
    };

    const toggleReply = (postId) => {
        setExpandedPostId(expandedPostId === postId ? null : postId);
        setReplyContent('');
    };

    const toggleLike = (postId) => {
        setLikedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="community-window" title="community" onClose={handleClose}>
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">

                        {/* Detail View */}
                        {activePost ? (
                            <div className="flex flex-col h-full relative">
                                {/* Header with Back Button */}
                                <div className="h-14 border-b-[1.5px] border-[#2d2d2d]/10 flex items-center mb-4 gap-3">
                                    <button
                                        onClick={() => setActivePost(null)}
                                        className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm leading-tight text-[#2d2d2d] lowercase">thread</span>
                                        <span className="text-[10px] text-[#2d2d2d]/40 font-bold lowercase">#{activePost.id} by @{activePost.profiles?.username || '?'}</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Main Post */}
                                    <div className="p-4 md:p-5 bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-xl">
                                        <div className="flex gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border-[1.5px] border-[#2d2d2d]/10 bg-white flex-shrink-0 flex items-center justify-center text-[#2d2d2d] text-xs md:text-sm font-black lowercase select-none overflow-hidden">
                                                {activePost.profiles?.avatar_url ? (
                                                    <UserAvatar src={activePost.profiles?.avatar_url} name={activePost.profiles?.username || '?'} size={40} />
                                                ) : (
                                                    (activePost.profiles?.username || '?').charAt(0).toLowerCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
                                                    <span className="text-xs md:text-sm font-black lowercase">{activePost.profiles?.username || '?'}</span>
                                                    <span className="text-[10px] md:text-[11px] font-bold text-[#2d2d2d]/30 lowercase">@{activePost.profiles?.username || '?'}</span>
                                                    <span className="hidden sm:inline w-0.5 h-0.5 bg-[#2d2d2d]/10 rounded-full"></span>
                                                    <span className="text-[10px] md:text-[11px] font-bold text-[#2d2d2d]/30 lowercase">{new Date(activePost.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <h2 className="font-[900] text-lg leading-tight text-[#2d2d2d] mb-3 lowercase">{activePost.title}</h2>
                                                <div className="text-xs md:text-sm leading-relaxed text-[#2d2d2d] lowercase whitespace-pre-wrap">
                                                    {activePost.content}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    <div className="pl-4 md:pl-6 space-y-3 border-l-[1.5px] border-[#2d2d2d]/5 ml-4">
                                        {replies.length === 0 && <div className="text-[#2d2d2d]/40 text-sm font-bold pl-4 py-4 lowercase italic">no replies yet... be the first.</div>}
                                        {replies.map(reply => (
                                            <div key={reply.id} className="bg-white p-4 rounded-xl border-[1.5px] border-[#2d2d2d]/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-lg border-[1.5px] border-[#2d2d2d]/10 overflow-hidden flex items-center justify-center text-[#2d2d2d] text-[10px] font-black lowercase">
                                                        {reply.profiles?.avatar_url ? (
                                                            <UserAvatar src={reply.profiles?.avatar_url} name={reply.profiles?.username || '?'} size={24} />
                                                        ) : (
                                                            (reply.profiles?.username || '?').charAt(0).toLowerCase()
                                                        )}
                                                    </div>
                                                    <span className="font-black text-xs text-[#2d2d2d] lowercase">@{reply.profiles?.username || '?'}</span>
                                                    <span className="text-[10px] text-[#2d2d2d]/30 font-bold lowercase">{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-sm pl-8 whitespace-pre-wrap text-[#2d2d2d] lowercase">{reply.content}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Reply Box */}
                                    <div className="p-4 border-t-[1.5px] border-[#2d2d2d]/10 bg-white rounded-xl mt-6">
                                        <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(activePost.id); }} className="flex gap-2">
                                            <input
                                                className="flex-1 bg-[#f3f4f6] border-[1.5px] border-[#2d2d2d]/10 rounded-lg px-4 py-2 text-xs outline-none focus:border-[#254b85] transition-colors text-[#2d2d2d] placeholder:text-[#2d2d2d]/30 lowercase font-medium"
                                                placeholder="type a reply..."
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                            />
                                            <button type="submit" disabled={!replyContent.trim()} className="px-4 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-lg text-xs font-black disabled:opacity-50 active:scale-95 transition-all lowercase">
                                                send
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Feed View
                            <div className="flex flex-col">
                                {/* New Post Button */}
                                <div className="flex justify-end mb-6">
                                    {!isCreating && (
                                        <button
                                            onClick={() => setIsCreating(true)}
                                            className="w-full sm:w-auto px-4 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 lowercase"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                            new post
                                        </button>
                                    )}
                                </div>

                                {/* Post Creator Box */}
                                {isCreating && (
                                    <div className="mb-8 space-y-3 animate-in zoom-in-95 duration-200">
                                        <div className="bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-xl overflow-hidden shadow-sm">
                                            <div className="px-4 py-2 bg-[#f9fafb] border-b-[1.5px] border-[#2d2d2d]/10 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-[#2d2d2d]/40 lowercase">creating community post...</span>
                                                <button onClick={() => setIsCreating(false)} className="text-[#2d2d2d]/40 hover:text-black">
                                                    <svg className="w-4 h-4 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="p-4 md:p-5 bg-[#fffefc] space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="post title..."
                                                    value={newPostTitle}
                                                    onChange={(e) => setNewPostTitle(e.target.value)}
                                                    className="w-full bg-transparent text-[14px] font-[900] text-[#2d2d2d] outline-none placeholder:text-[#2d2d2d]/30 lowercase"
                                                />
                                                <textarea
                                                    placeholder="what's on your mind..."
                                                    value={newPostContent}
                                                    onChange={(e) => setNewPostContent(e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-transparent text-[14px] leading-relaxed text-[#2d2d2d] outline-none resize-none placeholder:text-[#2d2d2d]/30 lowercase"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                                            <button
                                                onClick={() => setIsCreating(false)}
                                                className="px-4 py-2 text-xs font-black hover:bg-gray-200 rounded-lg transition-all order-2 sm:order-1 lowercase"
                                            >
                                                discard
                                            </button>
                                            <button
                                                onClick={handlePostSubmit}
                                                disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                                className="px-6 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-lg text-xs font-black transition-all order-1 sm:order-2 disabled:opacity-50 lowercase"
                                            >
                                                publish post
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Posts Feed */}
                                {loading && posts.length === 0 ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-24 bg-black/5 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {posts.length === 0 && (
                                            <div className="text-center py-20 text-[#2d2d2d]/40">
                                                <p className="font-black lowercase">it&apos;s quiet here...</p>
                                                <p className="text-xs mt-2 font-bold lowercase">be the first to share a thought.</p>
                                            </div>
                                        )}
                                        {posts.map(post => (
                                            <div
                                                key={post.id}
                                                className={`bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-xl p-4 md:p-5 transition-all hover:bg-[#fcfcfc] shadow-sm group cursor-pointer ${expandedPostId === post.id ? 'ring-2 ring-[#254b85]/10' : ''}`}
                                                onClick={() => toggleReply(post.id)}
                                            >
                                                <div className="flex gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border-[1.5px] border-[#2d2d2d]/10 bg-white flex-shrink-0 flex items-center justify-center text-[#2d2d2d] text-xs md:text-sm font-black lowercase select-none overflow-hidden">
                                                        {post.profiles?.avatar_url ? (
                                                            <UserAvatar src={post.profiles?.avatar_url} name={post.profiles?.username || '?'} size={40} />
                                                        ) : (
                                                            (post.profiles?.username || '?').charAt(0).toLowerCase()
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span className="text-xs md:text-sm font-black lowercase truncate max-w-[120px] sm:max-w-none">{post.profiles?.username || '?'}</span>
                                                                <span className="text-[10px] md:text-[11px] font-bold text-[#2d2d2d]/30 lowercase">@{post.profiles?.username || '?'}</span>
                                                                <span className="hidden sm:inline w-0.5 h-0.5 bg-[#2d2d2d]/10 rounded-full"></span>
                                                                <span className="text-[10px] md:text-[11px] font-bold text-[#2d2d2d]/30 lowercase">{timeAgo(post.created_at)}</span>
                                                            </div>
                                                            <button onClick={(e) => e.stopPropagation()} className="text-[#2d2d2d]/20 hover:text-black transition-colors p-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        <h4 className="font-[900] text-base md:text-lg leading-tight text-[#2d2d2d] mb-2 lowercase">{post.title}</h4>

                                                        {post.content && (
                                                            <div
                                                                className="text-xs md:text-sm leading-relaxed text-[#2d2d2d] lowercase mb-4 line-clamp-2"
                                                                dangerouslySetInnerHTML={{ __html: post.content }}
                                                            />
                                                        )}

                                                        <div className="flex items-center gap-4 md:gap-6 pt-3 border-t-[1.5px] border-[#2d2d2d]/5">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleReply(post.id); }}
                                                                className={`flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black transition-colors lowercase ${expandedPostId === post.id ? 'text-[#254b85]' : 'text-[#2d2d2d]/40 hover:text-[#254b85]'}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                </svg>
                                                                {post._count?.replies || 0}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                                                                className={`flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black transition-colors lowercase ${likedPosts.has(post.id) ? 'text-rose-500' : 'text-[#2d2d2d]/40 hover:text-rose-500'}`}
                                                            >
                                                                <svg className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-rose-500 stroke-rose-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                                </svg>
                                                                {(post.likes || 0) + (likedPosts.has(post.id) ? 1 : 0)}
                                                            </button>
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black text-[#2d2d2d]/40 hover:text-black transition-colors lowercase"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                                </svg>
                                                                <span className="hidden xs:inline">share</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActivePost(post); }}
                                                                className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black text-[#2d2d2d]/40 hover:text-black transition-colors ml-auto lowercase"
                                                            >
                                                                view thread
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Inline Reply Area */}
                                                        {expandedPostId === post.id && (
                                                            <div className="mt-4 md:mt-6 pt-4 border-t-[1.5px] border-[#2d2d2d]/5 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex gap-2 md:gap-3">
                                                                    <div className="mt-2 text-[#2d2d2d]/20 shrink-0">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-3">
                                                                        <div className="bg-white border-[1.5px] border-[#2d2d2d]/10 rounded-lg overflow-hidden">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="write a quick reply..."
                                                                                value={replyContent}
                                                                                onChange={(e) => setReplyContent(e.target.value)}
                                                                                className="w-full px-4 py-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#2d2d2d]/30 lowercase"
                                                                                onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(post.id)}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                onClick={() => setExpandedPostId(null)}
                                                                                className="px-3 py-1.5 text-[10px] font-black hover:bg-gray-100 rounded-md transition-all lowercase"
                                                                            >
                                                                                cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReplySubmit(post.id)}
                                                                                disabled={!replyContent.trim()}
                                                                                className="px-4 py-1.5 bg-[#254b85] hover:bg-[#335d9d] text-white border-[1.5px] border-[#2d2d2d]/10 rounded-md text-[10px] font-black transition-all disabled:opacity-50 lowercase"
                                                                            >
                                                                                reply
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Mini Status */}
                                <div className="mt-12 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.1em] text-[#2d2d2d]/30 px-2 pb-12">
                                    <span className="flex items-center gap-1 lowercase tracking-normal">
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                        system: ok
                                    </span>
                                    <span className="lowercase tracking-normal">© 2024 posthog</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PageWindow>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
