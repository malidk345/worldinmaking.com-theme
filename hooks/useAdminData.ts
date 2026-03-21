"use client";

import { useState, useCallback } from 'react';
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
    translations?: Record<string, { title: string, content: string, excerpt?: string, slug?: string }>;
    language?: string;
    is_approved: boolean;
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
    const [totalUsers, setTotalUsers] = useState(0);
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

            setPosts(data || []);
        } catch (e: unknown) {
            logger.error('[useAdminData] fetchPosts exception:', e);
            addToast('failed to fetch posts', 'error');
            if (e instanceof Error) setError(e.message);
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
        } catch (e: unknown) {
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
        } catch (e: unknown) {
            logger.error('[useAdminData] createPost exception:', e);
            addToast((e as Error).message || 'failed to create post', 'error');
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
        } catch (e: unknown) {
            logger.error('[useAdminData] updatePost exception:', e);
            addToast((e as Error).message || 'failed to update post', 'error');
            return null;
        }
    }, [addToast]);

    const approvePost = useCallback(async (id: string, approved: boolean = true) => {
        try {
            const { data, error: updateError } = await supabase
                .from('posts')
                .update({ is_approved: approved })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                logger.error('[useAdminData] approvePost error:', updateError);
                addToast(updateError.message || 'failed to update approval status', 'error');
                return null;
            }

            addToast(approved ? 'post approved' : 'approval revoked', 'success');
            if (data) {
                setPosts(prev => prev.map(p => p.id === id ? (data as AdminPost) : p));
            }
            return data as AdminPost;
        } catch (e: unknown) {
            logger.error('[useAdminData] approvePost exception:', e);
            addToast('failed to update approval status', 'error');
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
        } catch (e: unknown) {
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
        } catch (e: unknown) {
            logger.error('[useAdminData] updateWriterApplicationStatus exception:', e);
            addToast('failed to update application status', 'error');
            return null;
        }
    }, [addToast]);

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
        } catch (e: unknown) {
            logger.error('[useAdminData] fetchCommunityPosts exception:', e);
            addToast('failed to fetch community posts', 'error');
        } finally {
            setCommunityLoading(false);
        }
    }, [addToast]);

    const updateCommunityPost = useCallback(async (id: number, updates: { title?: string; content?: string }) => {
        try {
            const { data: refreshed, error: updateError } = await supabase
                .from('community_posts')
                .update(updates)
                .eq('id', id)
                .select('*, profiles(id, username, avatar_url)')
                .single();

            if (updateError) {
                logger.error('[useAdminData] updateCommunityPost error:', updateError);
                addToast('failed to update comment — you might not have permission', 'error');
                return null;
            }

            addToast('comment updated', 'success');
            if (refreshed) {
                setCommunityPosts(prev => prev.map(p => p.id === id ? (refreshed as unknown as AdminCommunityPost) : p));
            } else {
                setCommunityPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
            }
            return refreshed;
        } catch (e: unknown) {
            logger.error('[useAdminData] updateCommunityPost exception:', e);
            addToast('failed to update comment', 'error');
            return null;
        }
    }, [addToast]);

    const deleteCommunityPost = useCallback(async (id: number) => {
        try {
            await supabase.from('community_replies').delete().eq('post_id', id);
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
        } catch (e: unknown) {
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
        } catch (e: unknown) {
            logger.error('[useAdminData] fetchCommunityReplies exception:', e);
            addToast('failed to fetch replies', 'error');
        }
    }, [addToast]);

    const updateCommunityReply = useCallback(async (id: number, content: string) => {
        try {
            const { data: refreshed, error: updateError } = await supabase
                .from('community_replies')
                .update({ content })
                .eq('id', id)
                .select('*, profiles(id, username, avatar_url)')
                .single();

            if (updateError) {
                logger.error('[useAdminData] updateCommunityReply error:', updateError);
                addToast('failed to update reply — you might not have permission', 'error');
                return null;
            }

            addToast('reply updated', 'success');
            if (refreshed) {
                setCommunityReplies(prev => prev.map(r => r.id === id ? (refreshed as unknown as AdminCommunityReply) : r));
            } else {
                setCommunityReplies(prev => prev.map(r => r.id === id ? { ...r, content } : r));
            }
            return refreshed;
        } catch (e: unknown) {
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
        } catch (e: unknown) {
            logger.error('[useAdminData] deleteCommunityReply exception:', e);
            addToast('failed to delete reply', 'error');
            return false;
        }
    }, [addToast]);

    const fetchTotalUsers = useCallback(async () => {
        try {
            const { count, error: fetchError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (fetchError) {
                logger.error('[useAdminData] fetchTotalUsers error:', fetchError);
                return;
            }
            setTotalUsers(count || 0);
        } catch (e: unknown) {
            logger.error('[useAdminData] fetchTotalUsers exception:', e);
        }
    }, []);

    return {
        posts,
        writerApplications,
        communityPosts,
        communityReplies,
        loading,
        writerApplicationsLoading,
        communityLoading,
        totalUsers,
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
        fetchTotalUsers,
        approvePost,
    };
};
