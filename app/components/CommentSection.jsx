"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

// Comment Item Component
const CommentItem = ({ comment, onReply, isReplying, replyDraft, setReplyDraft, onSubmitReply, onCancelReply }) => {
    const date = new Date(comment.created_at).toLocaleDateString();

    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-200">
                {comment.profiles?.avatar_url ? (
                    <Image
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles?.username || 'user'}
                        width={32}
                        height={32}
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                        {(comment.profiles?.username || 'U')[0].toUpperCase()}
                    </div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-gray-900">{comment.profiles?.username || 'anon'}</span>
                    <span className="text-[10px] text-gray-400">{date}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{comment.content}</p>

                {onReply && (
                    <button
                        onClick={onReply}
                        className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        reply
                    </button>
                )}

                {isReplying && (
                    <div className="mt-4 mb-4">
                        <textarea
                            rows={2}
                            placeholder={`replying to ${comment.profiles?.username}...`}
                            value={replyDraft}
                            onChange={e => setReplyDraft?.(e.target.value)}
                            className="w-full bg-gray-50 border-[1.5px] border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none text-gray-900 placeholder:text-gray-400"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={onCancelReply} className="px-3 py-1.5 text-gray-500 text-xs font-bold hover:text-gray-900 transition-colors">cancel</button>
                            <button onClick={onSubmitReply} className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-xs font-bold hover:opacity-90 active:scale-95 transition-all">reply</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function CommentSection({ postId }) {
    const { addToast } = useToast();
    const { user } = useAuth();

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyDraft, setReplyDraft] = useState("");

    const fetchComments = useCallback(async () => {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                id,
                content,
                created_at,
                parent_id,
                profiles (
                    username,
                    avatar_url
                )
            `)
            .eq('post_id', String(postId))
            .order('created_at', { ascending: true });

        if (error) {
            logger.error('[CommentSection] Error fetching comments:', error);
            return;
        }

        if (data) {
            // Transform flat list to tree
            const commentMap = new Map();
            const roots = [];

            // Initialize map
            data.forEach((c) => {
                const profileData = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                const comment = {
                    id: c.id,
                    content: c.content,
                    created_at: c.created_at,
                    parent_id: c.parent_id,
                    profiles: profileData || null,
                    replies: []
                };
                commentMap.set(c.id, comment);
            });

            // Build tree
            data.forEach((c) => {
                if (c.parent_id) {
                    const parent = commentMap.get(c.parent_id);
                    const child = commentMap.get(c.id);
                    if (parent && child) {
                        parent.replies.push(child);
                    }
                } else {
                    const root = commentMap.get(c.id);
                    if (root) {
                        roots.push(root);
                    }
                }
            });

            setComments(roots);
        }
        setLoading(false);
    }, [postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handlePost = async (parentId = null) => {
        if (!user) {
            addToast('please login to comment', 'info');
            return;
        }

        const content = parentId ? replyDraft : draft;
        if (!content.trim()) return;

        const { error } = await supabase.from('comments').insert({
            content,
            post_id: String(postId),
            user_id: user.id,
            parent_id: parentId
        });

        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('comment posted', 'success');
            if (parentId) {
                setReplyDraft("");
                setReplyingTo(null);
            } else {
                setDraft("");
            }
            fetchComments();
        }
    };

    if (loading) {
        return (
            <div className="mt-8 border border-black/10 rounded-xl p-5 bg-gray-50/50 shadow-sm">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 border border-black/10 rounded-xl p-5 bg-gray-50/50 shadow-sm">
            <h3 className="font-bold text-sm mb-6 text-gray-900">
                comments
            </h3>

            {/* Comments List */}
            <div className="space-y-4 mb-6">
                {comments.length === 0 && (
                    <div className="text-gray-400 text-xs italic">no comments yet. start the discussion.</div>
                )}

                {comments.map((comment) => (
                    <div key={comment.id} className="group">
                        {/* Main Comment */}
                        <CommentItem
                            comment={comment}
                            onReply={() => setReplyingTo(comment.id)}
                            isReplying={replyingTo === comment.id}
                            replyDraft={replyDraft}
                            setReplyDraft={setReplyDraft}
                            onSubmitReply={() => handlePost(comment.id)}
                            onCancelReply={() => setReplyingTo(null)}
                        />

                        {/* Replies */}
                        {comment.replies.length > 0 && (
                            <div className="ml-10 mt-3 space-y-3 border-l-2 border-gray-200 pl-3">
                                {comment.replies.map(reply => (
                                    <CommentItem key={reply.id} comment={reply} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Main Input */}
            <div className="relative">
                <textarea
                    rows={3}
                    placeholder="write a comment..."
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="w-full bg-gray-50 border-[1.5px] border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none text-gray-900 placeholder:text-gray-400"
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={() => handlePost(null)}
                        className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small"
                    >
                        <span className="LemonButton__chrome px-4 py-1.5 border border-black/10 rounded font-bold text-xs text-secondary hover:text-primary hover:border-black/30 hover:bg-white bg-white transition-all shadow-sm">
                            {user ? 'post comment' : 'login to post'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
