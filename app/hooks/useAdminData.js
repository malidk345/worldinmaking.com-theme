"use client";

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import logger from '../utils/logger';

export const useAdminData = () => {
    const { addToast } = useToast();
    const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
                addToast('failed to fetch posts', 'error');
                setError(fetchError.message);
            } else if (data) {
                setPosts(data);
            }
        } catch (e) {
            logger.error('[useAdminData] fetchPosts exception:', e);
            addToast('failed to fetch posts', 'error');
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles (username, avatar_url),
                    posts (title, slug)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) {
                logger.error('[useAdminData] fetchComments error:', fetchError);
                addToast('failed to fetch comments', 'error');
                setError(fetchError.message);
            } else if (data) {
                setComments(data);
            }
        } catch (e) {
            logger.error('[useAdminData] fetchComments exception:', e);
            addToast('failed to fetch comments', 'error');
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const deletePost = useCallback(async (id) => {
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

    const deleteComment = useCallback(async (id) => {
        try {
            const { error: deleteError } = await supabase
                .from('comments')
                .delete()
                .eq('id', id);

            if (deleteError) {
                logger.error('[useAdminData] deleteComment error:', deleteError);
                addToast('failed to delete comment', 'error');
                return false;
            }

            addToast('comment deleted', 'success');
            setComments(prev => prev.filter(c => c.id !== id));
            return true;
        } catch (e) {
            logger.error('[useAdminData] deleteComment exception:', e);
            addToast('failed to delete comment', 'error');
            return false;
        }
    }, [addToast]);

    const createPost = useCallback(async (post) => {
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

    const updatePost = useCallback(async (id, updates) => {
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

    // Memoize return value
    const result = useMemo(() => ({
        posts,
        comments,
        loading,
        error,
        fetchPosts,
        fetchComments,
        deletePost,
        deleteComment,
        createPost,
        updatePost
    }), [posts, comments, loading, error, fetchPosts, fetchComments, deletePost, deleteComment, createPost, updatePost]);

    return result;
};
