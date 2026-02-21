"use client";

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import logger from '../utils/logger';



export interface AdminPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    published: boolean;
    created_at: string;
    category?: string;
    image_url?: string;
    author?: string;
    author_avatar?: string;
    excerpt?: string;
    isLocal?: boolean;
    translations?: Record<string, { title: string, content: string, excerpt?: string }>;
    language?: string;
}

export interface WriterApplication {
    id: string;
    name: string;
    email: string;
    message: string;
    status: 'new' | 'reviewed';
    source?: string;
    created_at: string;
}

export interface AdminCommunityPost {
    id: number;
    channel_id?: number | null;
    author_id: string;
    title: string;
    content: string;
    post_slug?: string | null;
    image_url?: string | null;
    created_at: string;
    profiles?: { id: string; username: string; avatar_url: string } | { id: string; username: string; avatar_url: string }[];
}

export interface AdminCommunityReply {
    id: number;
    post_id: number;
    author_id: string;
    content: string;
    created_at: string;
    profiles?: { id: string; username: string; avatar_url: string } | { id: string; username: string; avatar_url: string }[];
}

export const useAdminData = () => {
    const { addToast } = useToast();
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [writerApplications, setWriterApplications] = useState<WriterApplication[]>([]);
    const [communityPosts, setCommunityPosts] = useState<AdminCommunityPost[]>([]);
    const [communityReplies, setCommunityReplies] = useState<AdminCommunityReply[]>([]);
    const [loading, setLoading] = useState(false);
    const [writerApplicationsLoading, setWriterApplicationsLoading] = useState(false);
    const [communityLoading, setCommunityLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                logger.error('[useAdminData] fetchPosts error:', fetchError);
                addToast(`failed to fetch posts: ${fetchError.message}`, 'warning');
            }

            const dbPosts = data || [];

            setPosts(dbPosts.sort((a: AdminPost, b: AdminPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (e: any) {
            logger.error('[useAdminData] fetchPosts exception:', e);
            addToast('failed to fetch posts', 'error');
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const deletePost = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('posts')
                .delete()
                .eq('id', id);

            if (deleteError) {
                logger.error('[useAdminData] deletePost error:', deleteError);
                addToast('failed to delete post', 'error');
                return false;
            }

            addToast('post deleted', 'success');
            setPosts(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (e) {
            logger.error('[useAdminData] deletePost exception:', e);
            addToast('failed to delete post', 'error');
            return false;
        }
    }, [addToast]);

    const createPost = useCallback(async (post: Partial<AdminPost>) => {
        try {
            const { data, error: createError } = await supabase
                .from('posts')
                .insert(post)
                .select()
                .single();

            if (createError) {
                logger.error('[useAdminData] createPost error:', createError);
                addToast(createError.message || 'failed to create post', 'error');
                return null;
            }

            addToast('post published successfully', 'success');
            if (data) setPosts(prev => [data, ...prev]);
            return data;
        } catch (e: any) {
            logger.error('[useAdminData] createPost exception:', e);
            addToast(e.message || 'failed to create post', 'error');
            return null;
        }
    }, [addToast]);

    const updatePost = useCallback(async (id: string, updates: Partial<AdminPost>) => {
        try {
            const { data, error: updateError } = await supabase
                .from('posts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                logger.error('[useAdminData] updatePost error:', updateError);
                addToast(updateError.message || 'failed to update post', 'error');
                return null;
            }

            addToast('post updated successfully', 'success');
            if (data) {
                setPosts(prev => prev.map(p => p.id === id ? data : p));
            }
            return data;
        } catch (e: any) {
            logger.error('[useAdminData] updatePost exception:', e);
            addToast(e.message || 'failed to update post', 'error');
            return null;
        }
    }, [addToast]);

    const fetchWriterApplications = useCallback(async () => {
        try {
            setWriterApplicationsLoading(true);

            const { data, error: fetchError } = await supabase
                .from('writer_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                logger.error('[useAdminData] fetchWriterApplications error:', fetchError);
                addToast('failed to fetch writer applications', 'warning');
                return;
            }

            setWriterApplications((data || []) as WriterApplication[]);
        } catch (e: any) {
            logger.error('[useAdminData] fetchWriterApplications exception:', e);
            addToast('failed to fetch writer applications', 'error');
        } finally {
            setWriterApplicationsLoading(false);
        }
    }, [addToast]);

    const updateWriterApplicationStatus = useCallback(async (id: string, status: WriterApplication['status']) => {
        try {
            const { data, error: updateError } = await supabase
                .from('writer_applications')
                .update({ status })
                .eq('id', id)
                .select('*')
                .single();

            if (updateError) {
                logger.error('[useAdminData] updateWriterApplicationStatus error:', updateError);
                addToast('failed to update application status', 'error');
                return null;
            }

            addToast('application updated', 'success');
            if (data) {
                setWriterApplications(prev => prev.map(item => item.id === id ? (data as WriterApplication) : item));
            }
            return data as WriterApplication;
        } catch (e: any) {
            logger.error('[useAdminData] updateWriterApplicationStatus exception:', e);
            addToast('failed to update application status', 'error');
            return null;
        }
    }, [addToast]);

    // ─── Community Comments Management ───────────────────────────

    const fetchCommunityPosts = useCallback(async () => {
        try {
            setCommunityLoading(true);
            const { data, error: fetchError } = await supabase
                .from('community_posts')
                .select('id, author_id, title, content, created_at, profiles(id, username, avatar_url)')
                .order('created_at', { ascending: false });

            if (fetchError) {
                logger.error('[useAdminData] fetchCommunityPosts error:', fetchError);
                addToast('failed to fetch community posts', 'warning');
                return;
            }
            setCommunityPosts((data || []) as unknown as AdminCommunityPost[]);
        } catch (e: any) {
            logger.error('[useAdminData] fetchCommunityPosts exception:', e);
            addToast('failed to fetch community posts', 'error');
        } finally {
            setCommunityLoading(false);
        }
    }, [addToast]);

    const updateCommunityPost = useCallback(async (id: number, updates: { title?: string; content?: string }) => {
        try {
            const { error: updateError, count } = await supabase
                .from('community_posts')
                .update(updates)
                .eq('id', id)
                .select('id')
                .then(res => ({ error: res.error, count: res.data?.length || 0 }));

            if (updateError) {
                logger.error('[useAdminData] updateCommunityPost error:', updateError);
                addToast('failed to update comment — you might not have permission', 'error');
                return null;
            }

            if (count === 0) {
                // RLS policy likely blocked the update (admin can't edit others' comments)
                addToast('update blocked — only the comment author or a service-role admin can edit', 'warning');
                return null;
            }

            // Fetch the updated post with profile data
            const { data: refreshed } = await supabase
                .from('community_posts')
                .select('*, profiles(id, username, avatar_url)')
                .eq('id', id)
                .single();

            addToast('comment updated', 'success');
            if (refreshed) {
                setCommunityPosts(prev => prev.map(p => p.id === id ? (refreshed as AdminCommunityPost) : p));
            } else {
                // Even if we can't re-fetch, update the local state optimistically
                setCommunityPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
            }
            return refreshed;
        } catch (e: any) {
            logger.error('[useAdminData] updateCommunityPost exception:', e);
            addToast('failed to update comment', 'error');
            return null;
        }
    }, [addToast]);

    const deleteCommunityPost = useCallback(async (id: number) => {
        try {
            // First delete all replies for this post
            await supabase.from('community_replies').delete().eq('post_id', id);
            // Then delete the post itself
            const { error: deleteError } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', id);

            if (deleteError) {
                logger.error('[useAdminData] deleteCommunityPost error:', deleteError);
                addToast('failed to delete comment', 'error');
                return false;
            }

            addToast('comment deleted', 'success');
            setCommunityPosts(prev => prev.filter(p => p.id !== id));
            setCommunityReplies(prev => prev.filter(r => r.post_id !== id));
            return true;
        } catch (e) {
            logger.error('[useAdminData] deleteCommunityPost exception:', e);
            addToast('failed to delete comment', 'error');
            return false;
        }
    }, [addToast]);

    const fetchCommunityReplies = useCallback(async (postId?: number) => {
        try {
            let query = supabase
                .from('community_replies')
                .select('*, profiles(id, username, avatar_url)')
                .order('created_at', { ascending: false });

            if (postId) {
                query = query.eq('post_id', postId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                logger.error('[useAdminData] fetchCommunityReplies error:', fetchError);
                addToast('failed to fetch replies', 'warning');
                return;
            }
            setCommunityReplies((data || []) as unknown as AdminCommunityReply[]);
        } catch (e: any) {
            logger.error('[useAdminData] fetchCommunityReplies exception:', e);
            addToast('failed to fetch replies', 'error');
        }
    }, [addToast]);

    const updateCommunityReply = useCallback(async (id: number, content: string) => {
        try {
            const { error: updateError, count } = await supabase
                .from('community_replies')
                .update({ content })
                .eq('id', id)
                .select('id')
                .then(res => ({ error: res.error, count: res.data?.length || 0 }));

            if (updateError) {
                logger.error('[useAdminData] updateCommunityReply error:', updateError);
                addToast('failed to update reply — you might not have permission', 'error');
                return null;
            }

            if (count === 0) {
                addToast('update blocked — only the reply author or a service-role admin can edit', 'warning');
                return null;
            }

            // Fetch the updated reply with profile data
            const { data: refreshed } = await supabase
                .from('community_replies')
                .select('*, profiles(id, username, avatar_url)')
                .eq('id', id)
                .single();

            addToast('reply updated', 'success');
            if (refreshed) {
                setCommunityReplies(prev => prev.map(r => r.id === id ? (refreshed as AdminCommunityReply) : r));
            } else {
                setCommunityReplies(prev => prev.map(r => r.id === id ? { ...r, content } : r));
            }
            return refreshed;
        } catch (e: any) {
            logger.error('[useAdminData] updateCommunityReply exception:', e);
            addToast('failed to update reply', 'error');
            return null;
        }
    }, [addToast]);

    const deleteCommunityReply = useCallback(async (id: number) => {
        try {
            const { error: deleteError } = await supabase
                .from('community_replies')
                .delete()
                .eq('id', id);

            if (deleteError) {
                logger.error('[useAdminData] deleteCommunityReply error:', deleteError);
                addToast('failed to delete reply', 'error');
                return false;
            }

            addToast('reply deleted', 'success');
            setCommunityReplies(prev => prev.filter(r => r.id !== id));
            return true;
        } catch (e) {
            logger.error('[useAdminData] deleteCommunityReply exception:', e);
            addToast('failed to delete reply', 'error');
            return false;
        }
    }, [addToast]);

    return {
        posts,
        writerApplications,
        communityPosts,
        communityReplies,
        loading,
        writerApplicationsLoading,
        communityLoading,
        error,
        fetchPosts,
        fetchWriterApplications,
        deletePost,
        createPost,
        updatePost,
        updateWriterApplicationStatus,
        fetchCommunityPosts,
        updateCommunityPost,
        deleteCommunityPost,
        fetchCommunityReplies,
        updateCommunityReply,
        deleteCommunityReply,
    };
};
