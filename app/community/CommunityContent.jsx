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

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="community-window" title="community" onClose={handleClose}>
                <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">

                        {/* Detail View */}
                        {activePost ? (
                            <div className="flex flex-col h-full relative">
                                {/* Header with Back Button */}
                                <div className="h-14 border-b border-[var(--border-primary)] flex items-center mb-4 gap-3">
                                    <button
                                        onClick={() => setActivePost(null)}
                                        className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm leading-tight text-primary">thread</span>
                                        <span className="text-[10px] text-secondary uppercase tracking-wider">#{activePost.id} by @{activePost.profiles?.username || '?'}</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Main Post */}
                                    <div className="p-4 md:p-5 bg-white border border-[var(--border-primary)] rounded-xl">
                                        <div className="flex items-start gap-3 md:gap-4 mb-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border border-[var(--border-primary)] overflow-hidden flex-shrink-0">
                                                <UserAvatar src={activePost.profiles?.avatar_url} name={activePost.profiles?.username || '?'} size={40} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="font-black text-lg leading-tight text-primary">{activePost.title}</h2>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                                    <span className="text-[11px] font-bold text-secondary">@{activePost.profiles?.username || '?'}</span>
                                                    <span className="w-0.5 h-0.5 bg-secondary/30 rounded-full"></span>
                                                    <span className="text-[11px] font-bold text-secondary">{new Date(activePost.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm leading-relaxed text-primary whitespace-pre-wrap">
                                            {activePost.content}
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    <div className="pl-4 md:pl-6 space-y-3 border-l-2 border-[var(--border-primary)]/20 ml-4">
                                        {replies.length === 0 && <div className="text-secondary text-sm italic pl-4 py-4">no replies yet... be the first.</div>}
                                        {replies.map(reply => (
                                            <div key={reply.id} className="bg-white/50 p-4 rounded-xl border border-[var(--border-primary)]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-lg border border-[var(--border-primary)] overflow-hidden">
                                                        <UserAvatar src={reply.profiles?.avatar_url} name={reply.profiles?.username || '?'} size={24} />
                                                    </div>
                                                    <span className="font-black text-xs text-primary">@{reply.profiles?.username || '?'}</span>
                                                    <span className="text-[10px] text-secondary">{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-sm pl-8 whitespace-pre-wrap text-primary">{reply.content}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Reply Box */}
                                    <div className="p-4 border-t border-[var(--border-primary)] bg-white/50 rounded-xl mt-6">
                                        <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(activePost.id); }} className="flex gap-2">
                                            <input
                                                className="flex-1 bg-white border border-[var(--border-primary)] rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors text-primary placeholder:text-secondary"
                                                placeholder="type a reply..."
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                            />
                                            <button type="submit" disabled={!replyContent.trim()} className="px-4 py-2 bg-primary text-white border border-[var(--border-primary)] rounded-lg text-sm font-black disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all">
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
                                            className="w-full sm:w-auto px-4 py-2 bg-primary hover:opacity-90 text-white border border-[var(--border-primary)] rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                            new post
                                        </button>
                                    )}
                                </div>

                                {/* Post Creator Box */}
                                {isCreating && (
                                    <div className="mb-8 space-y-3">
                                        <div className="bg-white border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm">
                                            <div className="px-4 py-2 bg-[#f9fafb] border-b border-[var(--border-primary)] flex items-center justify-between">
                                                <span className="text-[10px] font-black text-secondary">creating community post...</span>
                                                <button onClick={() => setIsCreating(false)} className="text-secondary hover:text-primary">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="post title..."
                                                    value={newPostTitle}
                                                    onChange={(e) => setNewPostTitle(e.target.value)}
                                                    className="w-full bg-[#f9fafb] border border-[var(--border-primary)] rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors font-bold"
                                                />
                                                <textarea
                                                    placeholder="what's on your mind..."
                                                    value={newPostContent}
                                                    onChange={(e) => setNewPostContent(e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-[#f9fafb] border border-[var(--border-primary)] rounded-lg px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                                            <button
                                                onClick={() => setIsCreating(false)}
                                                className="px-4 py-2 text-xs font-black hover:bg-gray-200 rounded-lg transition-all order-2 sm:order-1"
                                            >
                                                discard
                                            </button>
                                            <button
                                                onClick={handlePostSubmit}
                                                disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                                className="px-6 py-2 bg-primary hover:opacity-90 text-white border border-[var(--border-primary)] rounded-lg text-xs font-black transition-all order-1 sm:order-2 disabled:opacity-50"
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
                                            <div className="text-center py-20 text-secondary">
                                                <p>it&apos;s quiet here...</p>
                                                <p className="text-xs mt-2 font-medium">be the first to share a thought.</p>
                                            </div>
                                        )}
                                        {posts.map(post => (
                                            <div
                                                key={post.id}
                                                className={`bg-white border border-[var(--border-primary)] rounded-xl p-4 md:p-5 transition-all hover:bg-[#fcfcfc] shadow-sm group cursor-pointer ${expandedPostId === post.id ? 'ring-2 ring-primary/10' : ''}`}
                                                onClick={() => toggleReply(post.id)}
                                            >
                                                <div className="flex gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border border-[var(--border-primary)] bg-white flex-shrink-0 overflow-hidden">
                                                        <UserAvatar src={post.profiles?.avatar_url} name={post.profiles?.username || '?'} size={40} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span className="text-xs md:text-sm font-black truncate max-w-[120px] sm:max-w-none">{post.profiles?.username || '?'}</span>
                                                                <span className="text-[10px] md:text-[11px] font-bold text-secondary">@{post.profiles?.username || '?'}</span>
                                                                <span className="hidden sm:inline w-0.5 h-0.5 bg-secondary/30 rounded-full"></span>
                                                                <span className="text-[10px] md:text-[11px] font-bold text-secondary">{timeAgo(post.created_at)} ago</span>
                                                            </div>
                                                            <button onClick={(e) => e.stopPropagation()} className="text-secondary/30 hover:text-primary transition-colors p-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        <h4 className="font-black text-base md:text-lg leading-tight text-primary mb-2">{post.title}</h4>

                                                        {post.content && (
                                                            <div className="text-xs md:text-sm leading-relaxed text-secondary mb-4 line-clamp-2">
                                                                {post.content}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-4 md:gap-6 pt-3 border-t border-[var(--border-primary)]/10">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleReply(post.id); }}
                                                                className={`flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black transition-colors ${expandedPostId === post.id ? 'text-primary' : 'text-secondary hover:text-primary'}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                </svg>
                                                                {post._count?.replies || 0}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActivePost(post); }}
                                                                className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black text-secondary hover:text-primary transition-colors ml-auto"
                                                            >
                                                                view thread
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Inline Reply Area */}
                                                        {expandedPostId === post.id && (
                                                            <div className="mt-4 md:mt-6 pt-4 border-t border-[var(--border-primary)]/10" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex gap-2 md:gap-3">
                                                                    <div className="mt-2 text-secondary/30 shrink-0">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-3">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="write a quick reply..."
                                                                            value={replyContent}
                                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                                            className="w-full bg-white border border-[var(--border-primary)] rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(post.id)}
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                onClick={() => setExpandedPostId(null)}
                                                                                className="px-3 py-1.5 text-[10px] font-black hover:bg-gray-100 rounded-md transition-all"
                                                                            >
                                                                                cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReplySubmit(post.id)}
                                                                                disabled={!replyContent.trim()}
                                                                                className="px-4 py-1.5 bg-primary hover:opacity-90 text-white border border-[var(--border-primary)] rounded-md text-[10px] font-black transition-all disabled:opacity-50"
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
                            </div>
                        )}
                    </div>
                </div>
            </PageWindow>
        </div>
    );
}
