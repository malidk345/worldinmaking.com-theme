"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
import { useAuth } from '../contexts/AuthContext';
import { useAdminData } from '../hooks/useAdminData';

export default function AdminPage() {
    const router = useRouter();
    const { profile, user, loading: authLoading } = useAuth();
    const [tab, setTab] = useState('posts');

    // Use Custom Hook for Data
    const {
        posts,
        comments,
        loading: dataLoading,
        fetchPosts,
        fetchComments,
        deletePost,
        deleteComment,
        createPost,
        updatePost
    } = useAdminData();

    // Derive unique categories from existing posts
    const uniqueCategories = useMemo(() => {
        const cats = new Set(posts.map(p => p.category).filter(c => !!c));
        cats.add('tech');
        cats.add('design');
        cats.add('life');
        return Array.from(cats).sort();
    }, [posts]);

    const [loading, setLoading] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [category, setCategory] = useState('');
    const [authorAlias, setAuthorAlias] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');

    // Initialize author alias when profile loads
    useEffect(() => {
        if (profile?.username && authorAlias === '') {
            setAuthorAlias(profile.username);
        }
    }, [profile, authorAlias]);

    // Tab Effects - Fetch data when tab changes
    useEffect(() => {
        if (tab === 'posts') fetchPosts();
        if (tab === 'comments') fetchComments();
    }, [tab, fetchPosts, fetchComments]);

    // Redirect if not admin
    useEffect(() => {
        if (!authLoading && (!user || profile?.role !== 'admin')) {
            router.push('/login');
        }
    }, [authLoading, user, profile, router]);

    // Handlers
    const handleSlugGen = () => {
        if (!slug && title) {
            const s = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            setSlug(s);
        }
    };

    const handleEditPost = (post) => {
        setEditingId(post.id);
        setTitle(post.title);
        setSlug(post.slug || '');
        setContent(post.content);
        setExcerpt(post.excerpt || '');
        setCategory(post.category || 'tech');
        setAuthorAlias(post.author);
        setFeaturedImage(post.image_url || '');
        setTab('create');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setSlug('');
        setContent('');
        setExcerpt('');
        setCategory('');
        setFeaturedImage('');
        setTab('posts');
    };

    const handleDeletePost = async (id) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        await deletePost(id);
    };

    const handleDeleteComment = async (id) => {
        if (!confirm('Delete this comment?')) return;
        await deleteComment(id);
    };

    const handleSavePost = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Build post data - only include image fields if they have values
        // This prevents errors if the Supabase table doesn't have these columns yet
        const postData = {
            title,
            slug: slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''),
            content,
            excerpt,
            category: category.toLowerCase(),
            author: authorAlias || 'Admin',
            published: true
        };

        // Only add image_url if provided (requires column in Supabase 'posts' table)
        if (featuredImage && featuredImage.trim() !== '') {
            postData.image_url = featuredImage.trim();
        }

        // Only add author_avatar if available (requires column in Supabase 'posts' table)
        if (profile?.avatar_url) {
            postData.author_avatar = profile.avatar_url;
        }

        let success;
        if (editingId) {
            const result = await updatePost(editingId, postData);
            success = !!result;
        } else {
            const result = await createPost(postData);
            success = !!result;
        }

        setLoading(false);

        if (success) {
            if (editingId) {
                handleCancelEdit();
            } else {
                setTitle('');
                setSlug('');
                setContent('');
                setExcerpt('');
                setFeaturedImage('');
            }
        }
    };

    const handleClose = () => {
        router.push('/');
    };

    if (authLoading) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="admin-window" title="admin" onClose={handleClose}>
                    <main className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
                        <div className="animate-pulse text-gray-400">Loading...</div>
                    </main>
                </PageWindow>
            </div>
        );
    }

    if (!user || profile?.role !== 'admin') {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <DashboardHeader />
                <PageWindow id="admin-window" title="access denied" onClose={handleClose}>
                    <main className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
                        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-100">
                            <h2 className="text-xl font-bold text-red-500">access denied</h2>
                            <p className="text-sm text-gray-500 mt-2">administrator privileges required.</p>
                        </div>
                    </main>
                </PageWindow>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <PageWindow id="admin-window" title="admin dashboard" onClose={handleClose}>
                <main className="flex-1 flex overflow-hidden bg-bg-3000 h-full">
                    {/* Sidebar */}
                    <div className="w-56 bg-white border-r border-black/5 p-4 flex flex-col gap-2 shrink-0">
                        <div className="mb-4 px-2">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">dashboard</h2>
                        </div>

                        <button
                            onClick={() => { setEditingId(null); setTab('create'); }}
                            className={`text-left px-3 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-between ${tab === 'create'
                                ? 'bg-gray-900 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span>{editingId ? 'edit post' : 'write new'}</span>
                            {tab === 'create' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>

                        <button
                            onClick={() => setTab('posts')}
                            className={`text-left px-3 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-between ${tab === 'posts'
                                ? 'bg-gray-900 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span>manage posts</span>
                            {posts.length > 0 && <span className="text-xs opacity-60">{posts.length}</span>}
                        </button>

                        <button
                            onClick={() => setTab('comments')}
                            className={`text-left px-3 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-between ${tab === 'comments'
                                ? 'bg-gray-900 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span>comments</span>
                            {comments.length > 0 && <span className="text-xs opacity-60">{comments.length}</span>}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {/* CREATE / EDIT POST TAB */}
                        {tab === 'create' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-3xl mx-auto"
                            >
                                <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                                    <h2 className="text-xl font-bold">{editingId ? 'edit article' : 'create new article'}</h2>
                                    {editingId && (
                                        <button onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline">
                                            cancel edit
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleSavePost} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">Title</label>
                                            <input
                                                value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSlugGen}
                                                className="w-full p-2.5 bg-white border-[1.5px] border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all font-medium"
                                                placeholder="enter compelling title..." required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">Slug (URL)</label>
                                            <input
                                                value={slug} onChange={e => setSlug(e.target.value)}
                                                className="w-full p-2.5 bg-white border-[1.5px] border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all text-gray-500 font-mono text-sm"
                                                placeholder="url-friendly-slug" required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">Category</label>
                                            <input
                                                value={category} onChange={e => setCategory(e.target.value)}
                                                list="category-options"
                                                className="w-full p-2.5 bg-white border-[1.5px] border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all font-medium"
                                                placeholder="e.g. technology"
                                            />
                                            <datalist id="category-options">
                                                {uniqueCategories.map(c => (
                                                    <option key={c} value={c} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">Author Name</label>
                                            <input
                                                value={authorAlias || ''} onChange={e => setAuthorAlias(e.target.value)}
                                                className="w-full p-2.5 bg-white border-[1.5px] border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all font-medium"
                                                placeholder="your name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Featured Image URL</label>
                                        <input
                                            value={featuredImage} onChange={e => setFeaturedImage(e.target.value)}
                                            className="w-full p-2.5 bg-white border-[1.5px] border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all font-medium text-sm text-gray-600"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Excerpt</label>
                                        <textarea
                                            value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all resize-none"
                                            placeholder="short summary for post cards..." required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end px-1">
                                            <label className="text-xs font-bold text-gray-500">Content</label>
                                            <span className="text-[10px] text-gray-400">markdown supported</span>
                                        </div>
                                        <textarea
                                            value={content} onChange={e => setContent(e.target.value)} rows={15}
                                            className="w-full p-4 bg-white border border-gray-200 rounded-md outline-none focus:border-gray-400 transition-all font-mono text-sm leading-relaxed"
                                            placeholder="write your story here..." required
                                        />
                                    </div>

                                    <button
                                        disabled={loading}
                                        className="w-full py-4 bg-gray-900 text-white font-bold text-sm rounded-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {loading ? 'saving...' : (editingId ? 'update article' : 'publish article')}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* MANAGE POSTS TAB */}
                        {tab === 'posts' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-4xl mx-auto"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold">all posts ({posts.length})</h2>
                                    <button
                                        onClick={() => { setEditingId(null); setTab('create'); }}
                                        className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:opacity-80 transition-opacity"
                                    >
                                        + new post
                                    </button>
                                </div>

                                {dataLoading ? (
                                    <div className="text-center py-12">
                                        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-xs text-gray-400">loading posts...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {posts.length === 0 && (
                                            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                <p className="text-gray-400 text-sm">no posts found yet.</p>
                                            </div>
                                        )}

                                        {posts.map(post => (
                                            <div key={post.id} className="group flex items-center gap-4 p-4 bg-white border-[1.5px] border-gray-200 rounded-md hover:border-gray-300 transition-all">
                                                <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-300">
                                                    {post.title.charAt(0).toUpperCase()}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm truncate pr-4">{post.title}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{post.category}</span>
                                                        <span>•</span>
                                                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className={post.published ? 'text-green-500' : 'text-orange-500'}>{post.published ? 'published' : 'draft'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditPost(post)}
                                                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <span className="text-xs font-bold">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <span className="text-xs font-bold">del</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* MANAGE COMMENTS TAB */}
                        {tab === 'comments' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-4xl mx-auto"
                            >
                                <h2 className="text-lg font-bold mb-6">comments ({comments.length})</h2>

                                {dataLoading ? (
                                    <div className="text-center py-12 text-gray-400 text-xs">loading comments...</div>
                                ) : (
                                    <div className="space-y-3">
                                        {comments.length === 0 && <div className="text-center text-gray-400 text-sm py-12">no comments found</div>}
                                        {comments.map(comment => (
                                            <div key={comment.id} className="p-4 bg-white rounded-md border-[1.5px] border-gray-200 flex gap-4 hover:border-gray-300 transition-all">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm bg-gray-100 px-2 py-0.5 rounded-md">{comment.profiles?.username || 'Anon'}</span>
                                                        <span className="text-xs text-gray-400">on <span className="text-black font-medium">{comment.posts?.title || 'Unknown Post'}</span></span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-2 pl-1 border-l-2 border-gray-200">{comment.content}</p>
                                                    <span className="text-[10px] text-gray-400 mt-2 block">{new Date(comment.created_at).toLocaleString()}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="px-3 py-1.5 h-fit bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    delete
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </main>
            </PageWindow>
        </div>
    );
}
