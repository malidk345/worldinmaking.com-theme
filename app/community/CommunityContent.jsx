"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import RichTextEditor from '../components/RichTextEditor';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { useWindow } from '../contexts/WindowContext';

export default function CommunityPage({ isWindowMode = false }) {
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
    const { openWindow } = useWindow();
    const { posts, replies, userLikes, loading, fetchPosts, fetchReplies, createPost, createReply, toggleLike } = useCommunity();

    const handleAuthorClick = (e, username) => {
        e.preventDefault();
        e.stopPropagation();
        if (!username) return;

        openWindow('author-profile', {
            id: `author-${username}`,
            title: `Author: @${username}`,
            username: username,
            isMaximized: false
        });
    };

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

    const toggleReplyPanel = (postId) => {
        setExpandedPostId(expandedPostId === postId ? null : postId);
        setReplyContent('');
    };

    const handleLike = async (e, postId) => {
        e.stopPropagation();
        await toggleLike(postId);
    };

    const mainContent = (
        <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-8">

                {/* Detail View */}
                {activePost ? (
                    <div className="flex flex-col h-full relative">
                        {/* Header with Back Button */}
                        <div className="h-12 md:h-14 border-b border-black/15 flex items-center mb-4 gap-2 md:gap-3">
                            <button
                                onClick={() => setActivePost(null)}
                                className="LemonButton LemonButton--tertiary"
                            >
                                <span className="LemonButton__chrome p-1.5 md:p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                                </span>
                            </button>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-xs md:text-sm leading-tight text-primary truncate">Thread</span>
                                <span className="text-[9px] md:text-[10px] text-secondary font-medium truncate">#{activePost.id} by @{activePost.profiles?.username || '?'}</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Main Post */}
                            <div className="p-4 md:p-5 bg-white border border-black/15 rounded-lg">
                                <div className="flex gap-3 md:gap-4">
                                    <div
                                        className="w-8 h-8 md:w-10 md:h-10 rounded-md border border-black/15 bg-white shrink-0 flex items-center justify-center text-primary text-xs md:text-sm font-bold select-none overflow-hidden pb-px cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={(e) => handleAuthorClick(e, activePost.profiles?.username)}
                                    >
                                        {activePost.profiles?.avatar_url ? (
                                            <UserAvatar
                                                src={activePost.profiles?.avatar_url}
                                                name={activePost.profiles?.username || '?'}
                                                size={40}
                                                className="w-full h-full border-none"
                                            />
                                        ) : (
                                            (activePost.profiles?.username || '?').charAt(0)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
                                            <span
                                                className="text-xs md:text-sm font-bold cursor-pointer hover:text-[#254b85] transition-colors"
                                                onClick={(e) => handleAuthorClick(e, activePost.profiles?.username)}
                                            >
                                                {activePost.profiles?.username || '?'}
                                            </span>
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
                            <div className="pl-3 md:pl-6 space-y-3 border-l-2 border-black/10 ml-3 md:ml-4">
                                {replies.length === 0 && <div className="text-secondary text-sm font-medium pl-4 py-4 italic">No replies yet... be the first.</div>}
                                {replies.map(reply => (
                                    <div key={reply.id} className="bg-white p-4 rounded-lg border border-black/15">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-md border border-black/15 overflow-hidden flex items-center justify-center text-primary text-[10px] font-bold">
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
                            <div className="p-4 border-t border-black/15 bg-white rounded-lg mt-6">
                                <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(activePost.id); }} className="flex gap-2">
                                    <input
                                        className="flex-1 bg-white border border-black/20 rounded px-4 py-2.5 text-base md:text-sm outline-none focus:border-primary transition-colors text-primary placeholder:text-secondary"
                                        placeholder="Type a reply..."
                                        value={replyContent}
                                        onChange={e => setReplyContent(e.target.value)}
                                    />
                                    <button type="submit" disabled={!replyContent.trim()} className="LemonButton LemonButton--primary LemonButton--small shadow-[0_3px_0_0_#171717] hover:shadow-[0_4px_0_0_#171717] active:shadow-[0_2px_0_0_#171717]">
                                        <span className="LemonButton__chrome flex items-center gap-2 px-4 py-1.5 font-bold uppercase text-[10px]">
                                            Send
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
                                    className="LemonButton LemonButton--primary LemonButton--small w-full shadow-[0_3px_0_0_#171717] hover:shadow-[0_4px_0_0_#171717] active:shadow-[0_2px_0_0_#171717]"
                                >
                                    <span className="LemonButton__chrome gap-2 px-6 py-2.5 font-bold uppercase text-xs">
                                        + Create Post
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Post Creator */}
                        {isCreating && (
                            <div className="mb-8 space-y-4">
                                <input
                                    type="text"
                                    placeholder="Post title..."
                                    value={newPostTitle}
                                    onChange={(e) => setNewPostTitle(e.target.value)}
                                    className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-base font-bold text-primary outline-none focus:border-primary transition-colors placeholder:text-secondary placeholder:font-normal"
                                />

                                <RichTextEditor
                                    content={newPostContent}
                                    onChange={setNewPostContent}
                                    placeholder="What's on your mind..."
                                    minHeight="240px"
                                />

                                <div className="flex flex-col sm:flex-row justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreating(false); setNewPostTitle(''); setNewPostContent(''); }}
                                        className="LemonButton LemonButton--secondary LemonButton--small px-4 py-2 text-xs font-bold order-2 sm:order-1"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePostSubmit}
                                        disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                        className="LemonButton LemonButton--primary LemonButton--small order-1 sm:order-2 shadow-[0_3px_0_0_#171717]"
                                    >
                                        <span className="LemonButton__chrome px-6 py-2 font-black text-xs uppercase">
                                            Publish Post
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
                                        <p className="font-bold">It&apos;s quiet here...</p>
                                        <p className="text-xs mt-2 font-medium">Be the first to share a thought.</p>
                                    </div>
                                )}
                                {posts.map(post => (
                                    <div
                                        key={post.id}
                                        className={`bg-white border border-black/15 rounded-lg p-4 md:p-5 transition-all hover:border-black/25 hover:shadow-sm cursor-pointer ${expandedPostId === post.id ? 'ring-2 ring-primary/10' : ''}`}
                                        onClick={() => toggleReplyPanel(post.id)}
                                    >
                                        <div className="flex gap-3 md:gap-4">
                                            <div
                                                className="w-8 h-8 md:w-10 md:h-10 rounded-md border border-black/15 bg-white shrink-0 flex items-center justify-center text-primary text-xs md:text-sm font-bold select-none overflow-hidden pb-px cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={(e) => handleAuthorClick(e, post.profiles?.username)}
                                            >
                                                {post.profiles?.avatar_url ? (
                                                    <UserAvatar
                                                        src={post.profiles?.avatar_url}
                                                        name={post.profiles?.username || '?'}
                                                        size={40}
                                                        className="w-full h-full border-none"
                                                    />
                                                ) : (
                                                    (post.profiles?.username || '?').charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex flex-wrap items-center gap-x-1.5 md:gap-x-2 gap-y-0.5">
                                                        <span
                                                            className="text-xs md:text-sm font-bold truncate max-w-[100px] sm:max-w-none cursor-pointer hover:text-[#254b85] transition-colors"
                                                            onClick={(e) => handleAuthorClick(e, post.profiles?.username)}
                                                        >
                                                            {post.profiles?.username || '?'}
                                                        </span>
                                                        <span className="text-[9px] md:text-[11px] font-medium text-secondary truncate max-w-[80px] sm:max-w-none">@{post.profiles?.username || '?'}</span>
                                                        <span className="hidden xs:inline w-0.5 h-0.5 bg-secondary/30 rounded-full"></span>
                                                        <span className="text-[9px] md:text-[11px] font-medium text-secondary">{timeAgo(post.created_at)}</span>
                                                    </div>
                                                </div>

                                                <h4 className="font-bold text-base md:text-lg leading-tight text-primary mb-2">{post.title}</h4>

                                                {post.content && (
                                                    <div
                                                        className="text-sm leading-relaxed text-secondary mb-4 line-clamp-2 prose-content"
                                                        dangerouslySetInnerHTML={{ __html: post.content }}
                                                    />
                                                )}

                                                <div className="flex items-center gap-2 md:gap-6 pt-3 border-t border-black/10">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleReplyPanel(post.id); }}
                                                        className="LemonButton LemonButton--tertiary"
                                                    >
                                                        <span className={`LemonButton__chrome flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold transition-colors ${expandedPostId === post.id ? 'text-[#254b85]' : 'text-secondary hover:text-[#254b85]'}`}>
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                            </svg>
                                                            <span>{post._count?.replies || 0}</span>
                                                            <span className="hidden sm:inline">replies</span>
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleLike(e, post.id)}
                                                        className="LemonButton LemonButton--tertiary"
                                                    >
                                                        <span className={`LemonButton__chrome flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold transition-colors ${userLikes.has(post.id) ? 'text-rose-500' : 'text-secondary hover:text-rose-500'}`}>
                                                            <svg className={`w-4 h-4 ${userLikes.has(post.id) ? 'fill-rose-500' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                                            </svg>
                                                            <span>{post._count?.likes || 0}</span>
                                                            <span className="hidden sm:inline">likes</span>
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActivePost(post); }}
                                                        className="LemonButton LemonButton--tertiary ml-auto"
                                                    >
                                                        <span className="LemonButton__chrome flex items-center gap-1 text-[10px] md:text-[11px] font-bold text-secondary hover:text-primary transition-colors">
                                                            <span className="hidden xs:inline">View thread</span>
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                                <path d="m9 18 6-6-6-6" />
                                                            </svg>
                                                        </span>
                                                    </button>
                                                </div>

                                                {/* Inline Reply Area */}
                                                {expandedPostId === post.id && (
                                                    <div className="mt-4 md:mt-6 pt-4 border-t border-black/10" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex gap-2 md:gap-3">
                                                            <div className="mt-2 text-secondary shrink-0">
                                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                                    <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Write a quick reply..."
                                                                    value={replyContent}
                                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                                    className="w-full bg-white border border-black/20 rounded px-4 py-3 text-base md:text-sm text-primary outline-none focus:border-primary transition-colors placeholder:text-secondary"
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(post.id)}
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandedPostId(null)}
                                                                        className="LemonButton LemonButton--secondary LemonButton--small px-3 py-1 font-bold text-[10px]"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReplySubmit(post.id)}
                                                                        disabled={!replyContent.trim()}
                                                                        className="LemonButton LemonButton--primary LemonButton--small shadow-[0_3px_0_0_#171717]"
                                                                    >
                                                                        <span className="LemonButton__chrome gap-1.5 px-4 py-1 font-bold text-[10px] uppercase">
                                                                            Reply
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
    );

    if (isWindowMode) return mainContent;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="community-window" title="community" onClose={handleClose}>
                {mainContent}
            </PageWindow>
        </div>
    );
}
