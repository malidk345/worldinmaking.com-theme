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
}

export const useAdminData = () => {
    const { addToast } = useToast();
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [loading, setLoading] = useState(false);
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
                addToast('failed to fetch posts from database', 'warning');
                // We'll still show local posts if DB fails
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
                addToast('failed to create post: ' + createError.message, 'error');
                return null;
            }

            addToast('post published successfully', 'success');
            if (data) setPosts(prev => [data, ...prev]);
            return data;
        } catch (e) {
            logger.error('[useAdminData] createPost exception:', e);
            addToast('failed to create post', 'error');
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
                addToast('failed to update post: ' + updateError.message, 'error');
                return null;
            }

            addToast('post updated successfully', 'success');
            if (data) {
                setPosts(prev => prev.map(p => p.id === id ? data : p));
            }
            return data;
        } catch (e) {
            logger.error('[useAdminData] updatePost exception:', e);
            addToast('failed to update post', 'error');
            return null;
        }
    }, [addToast]);

    return {
        posts,
        loading,
        error,
        fetchPosts,
        deletePost,
        createPost,
        updatePost
    };
};
