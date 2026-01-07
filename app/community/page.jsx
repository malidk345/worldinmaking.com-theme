"use client";

import React, { useEffect, useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import NewPostToggler from '../components/NewPostToggler';

export default function CommunityPage() {
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
    // Fetch from channel 1 (General)
    const { posts, replies, loading, fetchPosts, fetchReplies, createPost, createReply } = useCommunity();

    const [activePost, setActivePost] = useState(null);
    const [replyContent, setReplyContent] = useState('');

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

    const handlePostSubmit = async (content, title, imageUrl) => {
        const success = await createPost(1, title, content, imageUrl);
        if (success) {
            fetchPosts(1);
        }
        return success;
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!activePost || !replyContent.trim()) return;

        const success = await createReply(activePost.id, replyContent);
        if (success) {
            setReplyContent('');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />

            <div className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
                <div className="max-w-3xl mx-auto px-6 py-8 pb-24 h-full">

                    {/* Detail View */}
                    {activePost ? (
                        <div className="flex flex-col h-full relative">
                            {/* Header with Back Button */}
                            <div className="h-14 border-b border-black/10 flex items-center mb-4 gap-3">
                                <button
                                    onClick={() => setActivePost(null)}
                                    className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm leading-tight text-primary lowercase">thread</span>
                                    <span className="text-[10px] text-secondary uppercase tracking-wider">#{activePost.id} by @{activePost.profiles?.username || '?'}</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Main Post */}
                                <div className="p-4 bg-white border border-black/10 rounded-lg">
                                    <div className="flex items-start gap-4 mb-3">
                                        <UserAvatar src={activePost.profiles?.avatar_url} name={activePost.profiles?.username || '?'} size={32} />
                                        <div>
                                            <h2 className="font-bold text-lg leading-tight text-primary">{activePost.title}</h2>
                                            <p className="text-xs text-secondary mt-1">
                                                @{activePost.profiles?.username || '?'} • {new Date(activePost.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pl-[52px] prose prose-sm max-w-none text-primary">
                                        <p className="whitespace-pre-wrap">{activePost.content}</p>
                                    </div>
                                </div>

                                {/* Replies */}
                                <div className="pl-4 md:pl-8 space-y-4 border-l-2 border-black/5 ml-4">
                                    {replies.length === 0 && <div className="text-secondary text-sm italic pl-4 py-4">no replies yet... be the first.</div>}
                                    {replies.map(reply => (
                                        <div key={reply.id} className="bg-white/50 p-4 rounded-md border border-black/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <UserAvatar src={reply.profiles?.avatar_url} name={reply.profiles?.username || '?'} size={24} />
                                                <span className="font-bold text-xs text-primary">@{reply.profiles?.username || '?'}</span>
                                                <span className="text-[10px] text-secondary">{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-sm pl-8 whitespace-pre-wrap text-primary">{reply.content}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Reply Box */}
                                <div className="p-4 border-t border-black/10 bg-white/50 rounded-lg mt-6">
                                    <form onSubmit={handleReplySubmit} className="flex gap-2">
                                        <input
                                            className="flex-1 bg-white border border-black/10 rounded-md px-4 py-2 text-sm outline-none focus:border-primary transition-colors text-primary lowercase placeholder:text-secondary"
                                            placeholder="type a reply..."
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                        />
                                        <button type="submit" disabled={!replyContent.trim()} className="button-primitive button-primitive--primary px-4 py-2 rounded-md text-sm font-bold disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all lowercase">
                                            send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Feed View
                        <div className="flex flex-col">
                            {loading && posts.length === 0 ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 bg-black/5 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {posts.length === 0 && (
                                        <div className="text-center py-20 text-secondary">
                                            <p className="lowercase">it's quiet here...</p>
                                            <p className="text-xs mt-2 font-medium">be the first to share a thought.</p>
                                        </div>
                                    )}
                                    {posts.map(post => (
                                        <div
                                            key={post.id}
                                            onClick={() => setActivePost(post)}
                                            className="p-4 bg-white border border-black/10 rounded-lg hover:shadow-md hover:border-black/30 transition-all cursor-pointer group"
                                        >
                                            <h4 className="font-bold text-lg leading-tight text-primary mb-2 group-hover:underline decoration-2 underline-offset-2">{post.title}</h4>

                                            <div className="flex items-center gap-3 text-xs text-secondary">
                                                <UserAvatar src={post.profiles?.avatar_url} name={post.profiles?.username || '?'} size={24} />
                                                <span className="font-bold text-primary">@{post.profiles?.username || '?'}</span>
                                                <span>{timeAgo(post.created_at)} ago</span>
                                                <span className="w-1 h-1 rounded-full bg-black/20" />
                                                <div className="flex items-center gap-1 font-medium">
                                                    {post._count?.replies || 0} replies
                                                </div>
                                            </div>
                                            {post.content && (
                                                <p className="mt-3 text-sm text-secondary line-clamp-2">{post.content}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* New Post Toggler */}
            <NewPostToggler onPost={handlePostSubmit} />
        </div>
    );
}
