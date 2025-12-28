'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Icons } from './Icons'; // Assuming Icons are exported from here or used directly

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

interface AdminPost {
    id: number;
    title: string;
    slug: string;
    category: string;
    created_at: string;
    published: boolean;
    // Add other fields as needed for edit
    content: string;
    excerpt: string;
    author: string;
}

const AdminContent = () => {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const [tab, setTab] = useState<'create' | 'posts' | 'comments'>('posts');
    const [loading, setLoading] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [category, setCategory] = useState('');
    const [authorAlias, setAuthorAlias] = useState('');

    // Listings State
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [comments, setComments] = useState<AdminComment[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        if (profile?.username && !authorAlias) setAuthorAlias(profile.username);
    }, [profile, authorAlias]);

    // Data Fetching
    const fetchPosts = useCallback(async () => {
        setDataLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            addToast('failed to fetch posts', 'error');
        } else if (data) {
            setPosts(data);
        }
        setDataLoading(false);
    }, [addToast]);

    const fetchComments = useCallback(async () => {
        setDataLoading(true);
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles (username, avatar_url),
                posts (title, slug)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            addToast('failed to fetch comments', 'error');
        } else if (data) {
            setComments(data);
        }
        setDataLoading(false);
    }, [addToast]);

    // Tab Effects
    useEffect(() => {
        if (tab === 'posts') fetchPosts();
        if (tab === 'comments') fetchComments();
    }, [tab, fetchPosts, fetchComments]);

    // Handlers
    const handleSlugGen = () => {
        if (!slug && title) {
            const s = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            setSlug(s);
        }
    };

    const handleEditPost = (post: AdminPost) => {
        setEditingId(post.id);
        setTitle(post.title);
        setSlug(post.slug);
        setContent(post.content);
        setExcerpt(post.excerpt || '');
        setCategory(post.category || 'tech');
        setAuthorAlias(post.author || '');
        setTab('create');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setSlug('');
        setContent('');
        setExcerpt('');
        setCategory('');
        setTab('posts');
    };

    const handleDeletePost = async (id: number) => {
        if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) {
            addToast('failed to delete post', 'error');
        } else {
            addToast('post deleted', 'success');
            setPosts(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleDeleteComment = async (id: number) => {
        if (!confirm('Delete this comment?')) return;
        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) {
            addToast('failed to delete comment', 'error');
        } else {
            addToast('comment deleted', 'success');
            setComments(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleSavePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const postData = {
            title,
            slug: slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''),
            content,
            excerpt,
            category: category.toLowerCase(),
            author: authorAlias || 'Admin',
            author_avatar: profile?.avatar_url,
            published: true
        };

        let result;
        if (editingId) {
            // Update
            result = await supabase.from('posts').update(postData).eq('id', editingId);
        } else {
            // Insert
            result = await supabase.from('posts').insert(postData);
        }

        setLoading(false);

        if (result.error) {
            addToast(result.error.message, 'error');
        } else {
            addToast(editingId ? 'post updated' : 'post published', 'success');
            if (editingId) {
                // If updated, go back to list
                handleCancelEdit();
            } else {
                // If created, reset form
                setTitle('');
                setSlug('');
                setContent('');
                setExcerpt('');
            }
        }
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                    <h2 className="text-xl font-bold text-red-500 lowercase">access denied</h2>
                    <p className="text-sm text-zinc-500 mt-2 lowercase">administrator privileges required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col md:flex-row bg-zinc-50/50 dark:bg-black/20">
            {/* Sidebar */}
            <div className="w-full md:w-56 bg-zinc-50 dark:bg-white/5 border-r border-black/5 dark:border-white/5 p-4 flex flex-col gap-2 shrink-0">
                <div className="mb-4 px-2">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Dashboard</h2>
                </div>

                <button
                    onClick={() => { setEditingId(null); setTab('create'); }}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm font-bold lowercase transition-all flex items-center justify-between group ${tab === 'create'
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                            : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5'
                        }`}
                >
                    <span>{editingId ? 'edit post' : 'write new'}</span>
                    {tab === 'create' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black animate-pulse" />}
                </button>

                <button
                    onClick={() => setTab('posts')}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm font-bold lowercase transition-all flex items-center justify-between group ${tab === 'posts'
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                            : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5'
                        }`}
                >
                    <span>manage posts</span>
                    <span className="text-xs opacity-60 font-medium bg-white/20 px-1.5 rounded-md">{posts.length > 0 ? posts.length : ''}</span>
                </button>

                <button
                    onClick={() => setTab('comments')}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm font-bold lowercase transition-all flex items-center justify-between group ${tab === 'comments'
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                            : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5'
                        }`}
                >
                    <span>comments</span>
                    {comments.length > 0 && <span className="text-xs opacity-60 font-medium bg-white/20 px-1.5 rounded-md">{comments.length}</span>}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 md:p-8">

                    {/* --- CREATE / EDIT POST TAB --- */}
                    {tab === 'create' && (
                        <div className="max-w-3xl mx-auto animate-fade-up">
                            <div className="flex items-center justify-between mb-6 border-b border-black/10 dark:border-white/10 pb-4">
                                <h2 className="text-xl font-bold lowercase">{editingId ? 'edit article' : 'create new article'}</h2>
                                {editingId && (
                                    <button onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline">
                                        cancel edit
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleSavePost} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-500 lowercase ml-1">Title</label>
                                        <input
                                            value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSlugGen}
                                            className="w-full p-2.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-black dark:focus:ring-white/30 transition-all font-medium"
                                            placeholder="enter compelling title..." required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-500 lowercase ml-1">Slug (URL)</label>
                                        <input
                                            value={slug} onChange={e => setSlug(e.target.value)}
                                            className="w-full p-2.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-black dark:focus:ring-white/30 transition-all text-zinc-500 font-mono text-sm"
                                            placeholder="url-friendly-slug" required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-500 lowercase ml-1">Category (Type new or select)</label>
                                        <div className="relative">
                                            <input
                                                value={category} onChange={e => setCategory(e.target.value)}
                                                list="category-options"
                                                className="w-full p-2.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-black dark:focus:ring-white/30 transition-all font-medium"
                                                placeholder="e.g. technology"
                                            />
                                            <datalist id="category-options">
                                                <option value="tech" />
                                                <option value="design" />
                                                <option value="life" />
                                                <option value="philosophy" />
                                                <option value="coding" />
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-500 lowercase ml-1">Author Name</label>
                                        <input
                                            value={authorAlias} onChange={e => setAuthorAlias(e.target.value)}
                                            className="w-full p-2.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-black dark:focus:ring-white/30 transition-all font-medium"
                                            placeholder="your name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-500 lowercase ml-1">Excerpt (Preview text)</label>
                                    <textarea
                                        value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
                                        className="w-full p-3 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-black dark:focus:ring-white/30 transition-all resize-none"
                                        placeholder="short summary for post cards..." required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-xs font-bold text-zinc-500 lowercase">Content</label>
                                        <span className="text-[10px] text-zinc-400 lowercase">html / markdown supported</span>
                                    </div>
                                    <textarea
                                        value={content} onChange={e => setContent(e.target.value)} rows={15}
                                        className="w-full p-4 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-black dark:focus:ring-white/30 transition-all font-mono text-sm leading-relaxed"
                                        placeholder="write your story here..." required
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        disabled={loading}
                                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all lowercase disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-black/5"
                                    >
                                        {loading ? 'saving...' : (editingId ? 'update article' : 'publish article')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}


                    {/* --- MANAGE POSTS TAB --- */}
                    {tab === 'posts' && (
                        <div className="container mx-auto max-w-4xl animate-fade-up">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold">all posts ({posts.length})</h2>
                                <button
                                    onClick={() => { setEditingId(null); setTab('create'); }}
                                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-80 transition-opacity lowercase"
                                >
                                    + new post
                                </button>
                            </div>

                            {dataLoading ? (
                                <div className="text-center py-12">
                                    <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-xs text-zinc-400 lowercase">loading posts...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {posts.length === 0 && (
                                        <div className="text-center py-12 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-dashed border-zinc-200 dark:border-white/10">
                                            <p className="text-zinc-400 text-sm lowercase">no posts found yet.</p>
                                        </div>
                                    )}

                                    {posts.map(post => (
                                        <div key={post.id} className="group flex items-center gap-4 p-4 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl hover:border-black/20 dark:hover:border-white/20 transition-all">
                                            <div className="w-12 h-12 shrink-0 bg-zinc-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-lg font-bold text-zinc-300">
                                                {post.title.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm truncate pr-4">{post.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                                    <span className="bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">{post.category}</span>
                                                    <span>•</span>
                                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className={post.published ? 'text-green-500' : 'text-orange-500'}>{post.published ? 'published' : 'draft'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditPost(post)}
                                                    className="p-2 text-zinc-500 hover:text-black dark:hover:text-white bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                    title="edit"
                                                >
                                                    <span className="text-xs font-bold">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePost(post.id)}
                                                    className="p-2 text-red-400 hover:text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="delete"
                                                >
                                                    <span className="text-xs font-bold">del</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}


                    {/* --- MANAGE COMMENTS TAB --- */}
                    {tab === 'comments' && (
                        <div className="container mx-auto max-w-4xl animate-fade-up">
                            <h2 className="text-lg font-bold mb-6">comments ({comments.length})</h2>

                            {dataLoading ? (
                                <div className="text-center py-12 text-zinc-400 text-xs lowercase">loading comments...</div>
                            ) : (
                                <div className="space-y-3">
                                    {comments.length === 0 && <div className="text-center text-zinc-400 text-sm py-12">no comments found</div>}
                                    {comments.map(comment => (
                                        <div key={comment.id} className="p-4 bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 flex gap-4 hover:border-black/20 transition-all">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">{comment.profiles?.username || 'Anon'}</span>
                                                    <span className="text-xs text-zinc-400">on <span className="text-black dark:text-white font-medium">{comment.posts?.title || 'Unknown Post'}</span></span>
                                                </div>
                                                <p className="text-sm text-zinc-600 dark:text-zinc-300 lowercase mt-2 pl-1 border-l-2 border-zinc-200 dark:border-zinc-700">{comment.content}</p>
                                                <span className="text-[10px] text-zinc-400 mt-2 block">{new Date(comment.created_at).toLocaleString()}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="px-3 py-1.5 h-fit bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition-colors"
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
        </div>
    );
};

export default AdminContent;
