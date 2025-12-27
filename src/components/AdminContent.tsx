'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import Image from 'next/image';

interface AdminComment {
    id: number;
    content: string;
    created_at: string;
    profiles: {
        username: string;
        avatar_url: string;
    } | null;
    posts: {
        title: string;
        slug: string;
    } | null;
}

const AdminContent = () => {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const [tab, setTab] = useState<'new-post' | 'comments'>('new-post');
    const [loading, setLoading] = useState(false);

    // New Post State
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [category, setCategory] = useState('tech');
    const [authorAlias, setAuthorAlias] = useState('');

    // Comments State
    const [comments, setComments] = useState<AdminComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);

    useEffect(() => {
        if (profile?.username) setAuthorAlias(profile.username);
    }, [profile]);

    // Fetch comments when tab changes
    useEffect(() => {
        if (tab === 'comments') {
            fetchComments();
        }
    }, [tab]);

    const fetchComments = async () => {
        setCommentsLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles (username, avatar_url),
                posts (title, slug)
            `)
            .order('created_at', { ascending: false });

        if (data) {
            setComments(data);
        }
        setCommentsLoading(false);
    };

    const handleDeleteComment = async (id: number) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) {
            addToast('failed to delete comment', 'error');
        } else {
            addToast('comment deleted', 'success');
            setComments(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleSlugGen = () => {
        const s = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        setSlug(s);
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.from('posts').insert({
            title,
            slug: slug || title.toLowerCase().replace(/ /g, '-'),
            content,
            excerpt,
            category,
            author: authorAlias || 'Admin',
            author_avatar: profile?.avatar_url,
            published: true
        });

        setLoading(false);

        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('post published successfully', 'success');
            // Reset form
            setTitle('');
            setSlug('');
            setContent('');
            setExcerpt('');
        }
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-500 lowercase">access denied</h2>
                <p className="text-sm text-zinc-500 mt-2 lowercase">you need administrator privileges to view this console.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-48 bg-zinc-50 dark:bg-white/5 border-r border-black/5 dark:border-white/5 p-4 flex flex-col gap-2 shrink-0">
                <button
                    onClick={() => setTab('new-post')}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-bold lowercase ${tab === 'new-post' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    new post
                </button>
                <button
                    onClick={() => setTab('comments')}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-bold lowercase ${tab === 'comments' ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    manage comments
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {tab === 'new-post' && (
                    <form onSubmit={handleCreatePost} className="max-w-2xl mx-auto space-y-4 animate-fade-up">
                        <h2 className="text-lg font-bold mb-4 border-b border-black/10 dark:border-white/10 pb-2">new article</h2>
                        <div>
                            <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">title</label>
                            <input
                                value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSlugGen}
                                className="w-full p-2 bg-zinc-50 dark:bg-white/5 border border-black/10 rounded-lg outline-none lowercase" required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">slug (url)</label>
                                <input
                                    value={slug} onChange={e => setSlug(e.target.value)}
                                    className="w-full p-2 bg-zinc-50 dark:bg-white/5 border border-black/10 rounded-lg outline-none lowercase" required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">category</label>
                                <select
                                    value={category} onChange={e => setCategory(e.target.value)}
                                    className="w-full p-2 bg-zinc-50 dark:bg-white/5 border border-black/10 rounded-lg outline-none lowercase"
                                >
                                    <option value="tech">tech</option>
                                    <option value="design">design</option>
                                    <option value="life">life</option>
                                    <option value="philosophy">philosophy</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">author alias</label>
                            <input
                                value={authorAlias} onChange={e => setAuthorAlias(e.target.value)}
                                className="w-full p-2 bg-zinc-50 dark:bg-white/5 border border-black/10 rounded-lg outline-none lowercase"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">excerpt (short summary)</label>
                            <textarea
                                value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
                                className="w-full p-2 bg-zinc-50 dark:bg-white/5 border border-black/10 rounded-lg outline-none lowercase resize-none" required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 lowercase text-zinc-500">content (html supported)</label>
                            <textarea
                                value={content} onChange={e => setContent(e.target.value)} rows={12}
                                className="w-full p-2 bg-zinc-50 dark:bg-white/5 border border-black/10 rounded-lg outline-none font-mono text-sm resize-y" required
                            />
                        </div>
                        <button disabled={loading} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 lowercase disabled:opacity-50">
                            {loading ? 'publishing...' : 'publish article'}
                        </button>
                    </form>
                )}

                {tab === 'comments' && (
                    <div className="animate-fade-up">
                        <h2 className="text-lg font-bold mb-4 border-b border-black/10 dark:border-white/10 pb-2">all comments</h2>

                        {commentsLoading ? (
                            <div className="text-center py-8 text-zinc-400 text-xs lowercase animate-pulse">loading comments...</div>
                        ) : (
                            <div className="space-y-3">
                                {comments.length === 0 && <div className="text-center text-zinc-400 text-sm">no comments found</div>}
                                {comments.map(comment => (
                                    <div key={comment.id} className="p-4 bg-zinc-50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-sm">{comment.profiles?.username || 'Anon'}</span>
                                                <span className="text-xs text-zinc-400">on {comment.posts?.title || 'Unknown Post'}</span>
                                            </div>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-300 lowercase">{comment.content}</p>
                                            <span className="text-[10px] text-zinc-400 mt-2 block">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="px-3 py-1.5 h-fit bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        >
                                            delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminContent;
