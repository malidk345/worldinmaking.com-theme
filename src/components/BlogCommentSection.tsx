'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserAvatar } from './UserAvatar';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useWindow } from '../contexts/WindowContext';
import { supabase } from '../lib/supabase';

interface BlogCommentSectionProps {
    initialComments?: any[]; // Deprecated, we load from DB
    postId: number;
}

interface DbComment {
    id: number;
    content: string;
    created_at: string;
    parent_id: number | null;
    profiles: {
        username: string;
        avatar_url: string;
    };
}

interface ThreadedComment extends DbComment {
    replies: ThreadedComment[];
}

const BlogCommentSection: React.FC<BlogCommentSectionProps> = ({ postId }) => {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { openWindow } = useWindow();

    const [comments, setComments] = useState<ThreadedComment[]>([]);
    const [loading, setLoading] = useState(true);

    const [draft, setDraft] = useState("");
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
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
            .eq('post_id', postId.toString())
            .order('created_at', { ascending: true }); // We order chronologically to build thread

        if (error) {
            console.error('Error fetching comments:', error);
            return;
        }

        if (data) {
            // Transform flat list to tree
            const commentMap = new Map();
            const roots: ThreadedComment[] = [];

            // Initialize map
            data.forEach((c: any) => {
                commentMap.set(c.id, { ...c, replies: [] });
            });

            // Build tree
            data.forEach((c: any) => {
                if (c.parent_id) {
                    const parent = commentMap.get(c.parent_id);
                    if (parent) {
                        parent.replies.push(commentMap.get(c.id));
                    }
                } else {
                    roots.push(commentMap.get(c.id));
                }
            });

            // Sort roots: newest at bottom for linear feeling, or top?
            // Usually comments: Newest logs at bottom (chat style) or top?
            // Blog style: Oldest first (chronological conversation).
            // Let's keep chronological.
            setComments(roots);
        }
        setLoading(false);
    }, [postId]);

    useEffect(() => {
        fetchComments();

        // Optional: Realtime subscription could go here
    }, [fetchComments]);

    const handlePost = async (parentId: number | null = null) => {
        if (!user) {
            addToast('please login to comment', 'info');
            openWindow('login');
            return;
        }

        const content = parentId ? replyDraft : draft;
        if (!content.trim()) return;

        const { error } = await supabase.from('comments').insert({
            content,
            post_id: postId.toString(),
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

    return (
        <div className="px-3 mt-12 pt-8 border-t border-black/5 dark:border-white/5">
            <h3 className="font-bold text-sm mb-6 lowercase text-black dark:text-white">
                comments
            </h3>

            {/* Comments List */}
            {loading ? (
                <div className="text-center py-8 text-zinc-400 text-xs lowercase animate-pulse">loading thoughts...</div>
            ) : (
                <div className="space-y-6 mb-10">
                    {comments.length === 0 && (
                        <div className="text-zinc-400 text-xs italic lowercase">no comments yet. start the discussion.</div>
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
                                <div className="ml-11 mt-4 space-y-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-4">
                                    {comment.replies.map(reply => (
                                        <CommentItem key={reply.id} comment={reply} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Main Input */}
            <div className="relative">
                <textarea
                    rows={3}
                    placeholder="write a comment..."
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none lowercase text-black dark:text-white placeholder:text-zinc-400"
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={() => handlePost(null)}
                        className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-80 transition-opacity lowercase"
                    >
                        {user ? 'post comment' : 'login to post'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Component for rendering a single comment
const CommentItem: React.FC<{
    comment: ThreadedComment,
    onReply?: () => void,
    isReplying?: boolean,
    replyDraft?: string,
    setReplyDraft?: (s: string) => void,
    onSubmitReply?: () => void,
    onCancelReply?: () => void
}> = ({ comment, onReply, isReplying, replyDraft, setReplyDraft, onSubmitReply, onCancelReply }) => {
    // Format date simple
    const date = new Date(comment.created_at).toLocaleDateString();

    return (
        <div className="flex gap-3">
            <UserAvatar
                src={comment.profiles?.avatar_url}
                name={comment.profiles?.username || 'user'}
                size={32}
            />
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-black dark:text-white">{comment.profiles?.username || 'anon'}</span>
                    <span className="text-[10px] text-zinc-400">{date}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 lowercase mb-2">{comment.content}</p>

                {onReply && (
                    <button
                        onClick={onReply}
                        className="text-[10px] font-bold text-zinc-400 hover:text-black dark:hover:text-white lowercase transition-colors"
                    >
                        reply
                    </button>
                )}

                {isReplying && (
                    <div className="mt-4 mb-4 animate-fade-up">
                        <textarea
                            rows={2}
                            placeholder={`replying to ${comment.profiles?.username}...`}
                            value={replyDraft}
                            onChange={e => setReplyDraft?.(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none lowercase text-black dark:text-white placeholder:text-zinc-400"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={onCancelReply} className="px-3 py-1.5 text-zinc-500 text-xs font-bold hover:text-black dark:hover:text-white lowercase">cancel</button>
                            <button onClick={onSubmitReply} className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-80 transition-opacity lowercase">reply</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogCommentSection;
