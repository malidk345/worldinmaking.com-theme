"use client";

import React, { useState } from 'react';
import Image from 'next/image';

// Sample comments data
const sampleComments = [
    {
        id: 1,
        content: "great article! really helped me understand the basics.",
        created_at: "2024-01-05",
        profiles: {
            username: "devuser",
            avatar_url: "https://i.pravatar.cc/150?u=1"
        },
        replies: [
            {
                id: 2,
                content: "agreed, very well explained.",
                created_at: "2024-01-06",
                profiles: {
                    username: "coder42",
                    avatar_url: "https://i.pravatar.cc/150?u=2"
                },
                replies: []
            }
        ]
    }
];

// Comment Item Component - worldinmaking.com style
const CommentItem = ({ comment, onReply, isReplying, replyDraft, setReplyDraft, onSubmitReply, onCancelReply }) => {
    const date = new Date(comment.created_at).toLocaleDateString();

    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <Image
                    src={comment.profiles?.avatar_url || "https://i.pravatar.cc/150?u=default"}
                    alt={comment.profiles?.username || 'user'}
                    width={32}
                    height={32}
                    className="object-cover"
                    unoptimized
                />
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
    const [comments, setComments] = useState(sampleComments);
    const [draft, setDraft] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyDraft, setReplyDraft] = useState("");

    const handlePost = (parentId = null) => {
        const content = parentId ? replyDraft : draft;
        if (!content.trim()) return;

        const newComment = {
            id: Date.now(),
            content,
            created_at: new Date().toISOString(),
            profiles: {
                username: "you",
                avatar_url: "https://i.pravatar.cc/150?u=you"
            },
            replies: []
        };

        if (parentId) {
            // Add reply to parent comment
            setComments(prevComments => {
                return prevComments.map(c => {
                    if (c.id === parentId) {
                        return { ...c, replies: [...c.replies, newComment] };
                    }
                    return c;
                });
            });
            setReplyDraft("");
            setReplyingTo(null);
        } else {
            setComments(prev => [...prev, newComment]);
            setDraft("");
        }
    };

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
                            post comment
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
