"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import RichTextEditor from '../components/RichTextEditor';
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
                <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">

                        {/* Detail View */}
                        {activePost ? (
                            <div className="flex flex-col h-full relative">
                                {/* Header with Back Button */}
                                <div className="h-14 border-b border-[var(--border-primary)] flex items-center mb-4 gap-3">
                                    <button
                                        onClick={() => setActivePost(null)}
                                        className="LemonButton LemonButton--tertiary p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm leading-tight text-primary">thread</span>
                                        <span className="text-[10px] text-secondary font-medium">#{activePost.id} by @{activePost.profiles?.username || '?'}</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Main Post */}
                                    <div className="p-4 md:p-5 bg-white border border-[var(--border-primary)] rounded-lg">
                                        <div className="flex gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-md border border-[var(--border-primary)] bg-white flex-shrink-0 flex items-center justify-center text-primary text-xs md:text-sm font-bold select-none overflow-hidden">
                                                {activePost.profiles?.avatar_url ? (
                                                    <UserAvatar src={activePost.profiles?.avatar_url} name={activePost.profiles?.username || '?'} size={40} />
                                                ) : (
                                                    (activePost.profiles?.username || '?').charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
                                                    <span className="text-xs md:text-sm font-bold">{activePost.profiles?.username || '?'}</span>
                                                    <span className="text-[10px] md:text-[11px] font-medium text-secondary">@{activePost.profiles?.username || '?'}</span>
                                                    <span className="hidden sm:inline w-0.5 h-0.5 bg-secondary/30 rounded-full"></span>
                                                    <span className="text-[10px] md:text-[11px] font-medium text-secondary">{new Date(activePost.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <h2 className="font-bold text-lg leading-tight text-primary mb-3">{activePost.title}</h2>
                                                <div
                                                    className="text-sm leading-relaxed text-primary prose-content"
                                                    dangerouslySetInnerHTML={{ __html: activePost.content }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    <div className="pl-4 md:pl-6 space-y-3 border-l-2 border-[var(--border-primary)]/20 ml-4">
                                        {replies.length === 0 && <div className="text-secondary text-sm font-medium pl-4 py-4 italic">no replies yet... be the first.</div>}
                                        {replies.map(reply => (
                                            <div key={reply.id} className="bg-white p-4 rounded-lg border border-[var(--border-primary)]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-md border border-[var(--border-primary)] overflow-hidden flex items-center justify-center text-primary text-[10px] font-bold">
                                                        {reply.profiles?.avatar_url ? (
                                                            <UserAvatar src={reply.profiles?.avatar_url} name={reply.profiles?.username || '?'} size={24} />
                                                        ) : (
                                                            (reply.profiles?.username || '?').charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-xs text-primary">@{reply.profiles?.username || '?'}</span>
                                                    <span className="text-[10px] text-secondary font-medium">{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-sm pl-8 whitespace-pre-wrap text-primary">{reply.content}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Reply Box */}
                                    <div className="p-4 border-t border-[var(--border-primary)] bg-white rounded-lg mt-6">
                                        <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(activePost.id); }} className="flex gap-2">
                                            <input
                                                className="flex-1 bg-white border border-[var(--border-primary)] rounded-md px-4 py-2 text-sm outline-none focus:border-primary transition-colors text-primary placeholder:text-secondary"
                                                placeholder="type a reply..."
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                            />
                                            <button type="submit" disabled={!replyContent.trim()} className="LemonButton LemonButton--primary LemonButton--small">
                                                <span className="LemonButton__chrome px-4 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border border-[#254b85] rounded font-bold text-xs transition-all disabled:opacity-50">
                                                    send
                                                </span>
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
                                            className="LemonButton LemonButton--primary LemonButton--small w-full sm:w-auto"
                                        >
                                            <span className="LemonButton__chrome flex items-center justify-center gap-2 px-4 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border border-[#254b85] rounded font-bold text-xs transition-all">
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                                                </svg>
                                                new post
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Post Creator - Single Container with Title */}
                                {isCreating && (
                                    <div className="mb-8 space-y-4">
                                        {/* Title Input - Simple Container */}
                                        <input
                                            type="text"
                                            placeholder="post title..."
                                            value={newPostTitle}
                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                            className="w-full bg-white border border-[var(--border-primary)] rounded-lg px-4 py-3 text-base font-bold text-primary outline-none focus:border-primary transition-colors placeholder:text-secondary placeholder:font-normal"
                                        />

                                        {/* Rich Text Editor for Post Content */}
                                        <RichTextEditor
                                            content={newPostContent}
                                            onChange={setNewPostContent}
                                            placeholder="what's on your mind..."
                                            minHeight="240px"
                                        />

                                        {/* Action Buttons - LemonButton Style */}
                                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setIsCreating(false); setNewPostTitle(''); setNewPostContent(''); }}
                                                className="LemonButton LemonButton--secondary LemonButton--small order-2 sm:order-1"
                                            >
                                                <span className="LemonButton__chrome px-4 py-2 border border-[var(--border-primary)] rounded font-bold text-xs text-secondary hover:text-primary hover:bg-black/5 bg-white transition-all w-full sm:w-auto justify-center">
                                                    discard
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handlePostSubmit}
                                                disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                                className="LemonButton LemonButton--primary LemonButton--small order-1 sm:order-2"
                                            >
                                                <span className="LemonButton__chrome px-6 py-2 bg-[#254b85] hover:bg-[#335d9d] text-white border border-[#254b85] rounded font-bold text-xs transition-all disabled:opacity-50 w-full sm:w-auto justify-center">
                                                    publish post
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Posts Feed */}
                                {loading && posts.length === 0 ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-24 bg-black/5 rounded-lg animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {posts.length === 0 && (
                                            <div className="text-center py-20 text-secondary">
                                                <p className="font-bold">it&apos;s quiet here...</p>
                                                <p className="text-xs mt-2 font-medium">be the first to share a thought.</p>
                                            </div>
                                        )}
                                        {posts.map(post => (
                                            <div
                                                key={post.id}
                                                className={`bg-white border border-[var(--border-primary)] rounded-lg p-4 md:p-5 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer ${expandedPostId === post.id ? 'ring-2 ring-primary/10' : ''}`}
                                                onClick={() => toggleReply(post.id)}
                                            >
                                                <div className="flex gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-md border border-[var(--border-primary)] bg-white flex-shrink-0 flex items-center justify-center text-primary text-xs md:text-sm font-bold select-none overflow-hidden">
                                                        {post.profiles?.avatar_url ? (
                                                            <UserAvatar src={post.profiles?.avatar_url} name={post.profiles?.username || '?'} size={40} />
                                                        ) : (
                                                            (post.profiles?.username || '?').charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span className="text-xs md:text-sm font-bold truncate max-w-[120px] sm:max-w-none">{post.profiles?.username || '?'}</span>
                                                                <span className="text-[10px] md:text-[11px] font-medium text-secondary">@{post.profiles?.username || '?'}</span>
                                                                <span className="hidden sm:inline w-0.5 h-0.5 bg-secondary/30 rounded-full"></span>
                                                                <span className="text-[10px] md:text-[11px] font-medium text-secondary">{timeAgo(post.created_at)}</span>
                                                            </div>
                                                            <button onClick={(e) => e.stopPropagation()} className="LemonButton LemonButton--tertiary text-secondary hover:text-primary transition-colors p-1">
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        <h4 className="font-bold text-base md:text-lg leading-tight text-primary mb-2">{post.title}</h4>

                                                        {post.content && (
                                                            <div
                                                                className="text-sm leading-relaxed text-secondary mb-4 line-clamp-2 prose-content"
                                                                dangerouslySetInnerHTML={{ __html: post.content }}
                                                            />
                                                        )}

                                                        <div className="flex items-center gap-4 md:gap-6 pt-3 border-t border-[var(--border-primary)]">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleReply(post.id); }}
                                                                className={`LemonButton LemonButton--tertiary flex items-center gap-1.5 text-[11px] font-bold transition-colors ${expandedPostId === post.id ? 'text-primary' : 'text-secondary hover:text-primary'}`}
                                                            >
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                                </svg>
                                                                {post._count?.replies || 0}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                                                                className={`LemonButton LemonButton--tertiary flex items-center gap-1.5 text-[11px] font-bold transition-colors ${likedPosts.has(post.id) ? 'text-rose-500' : 'text-secondary hover:text-rose-500'}`}
                                                            >
                                                                <svg className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-rose-500' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                                                </svg>
                                                                {(post.likes || 0) + (likedPosts.has(post.id) ? 1 : 0)}
                                                            </button>
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="LemonButton LemonButton--tertiary flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-primary transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                                                                </svg>
                                                                <span className="hidden xs:inline">share</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActivePost(post); }}
                                                                className="LemonButton LemonButton--tertiary flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-primary transition-colors ml-auto"
                                                            >
                                                                view thread
                                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                                    <path d="m9 18 6-6-6-6" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Inline Reply Area */}
                                                        {expandedPostId === post.id && (
                                                            <div className="mt-4 md:mt-6 pt-4 border-t border-[var(--border-primary)]" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex gap-2 md:gap-3">
                                                                    <div className="mt-2 text-secondary shrink-0">
                                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                            <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-3">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="write a quick reply..."
                                                                            value={replyContent}
                                                                            onChange={(e) => setReplyContent(e.target.value)}
                                                                            className="w-full bg-white border border-[var(--border-primary)] rounded-md px-4 py-3 text-sm text-primary outline-none focus:border-primary transition-colors placeholder:text-secondary"
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(post.id)}
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setExpandedPostId(null)}
                                                                                className="LemonButton LemonButton--secondary LemonButton--small"
                                                                            >
                                                                                <span className="LemonButton__chrome px-3 py-1.5 border border-[var(--border-primary)] rounded font-bold text-xs text-secondary hover:text-primary hover:bg-black/5 bg-white transition-all">
                                                                                    cancel
                                                                                </span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleReplySubmit(post.id)}
                                                                                disabled={!replyContent.trim()}
                                                                                className="LemonButton LemonButton--primary LemonButton--small"
                                                                            >
                                                                                <span className="LemonButton__chrome px-4 py-1.5 bg-[#254b85] hover:bg-[#335d9d] text-white border border-[#254b85] rounded font-bold text-xs transition-all disabled:opacity-50">
                                                                                    reply
                                                                                </span>
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

            <style jsx>{`
                .prose-content b, .prose-content strong { font-weight: 700; }
                .prose-content i, .prose-content em { font-style: italic; }
                .prose-content blockquote {
                    border-left: 3px solid var(--border-primary);
                    padding-left: 0.75rem;
                    margin: 0.5rem 0;
                    font-style: italic;
                }
                .prose-content ul { list-style-type: disc; padding-left: 1.25rem; }
                .prose-content ol { list-style-type: decimal; padding-left: 1.25rem; }
                .prose-content a { color: #254b85; text-decoration: underline; }
            `}</style>
        </div>
    );
}
