"use client";

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export const useAdminData = () => {
    const { addToast } = useToast();
    const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            addToast('failed to fetch posts', 'error');
        } else if (data) {
            setPosts(data);
        }
        setLoading(false);
    }, [addToast]);

    const fetchComments = useCallback(async () => {
        setLoading(true);
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
        setLoading(false);
    }, [addToast]);

    const deletePost = useCallback(async (id) => {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) {
            addToast('failed to delete post', 'error');
            return false;
        } else {
            addToast('post deleted', 'success');
            setPosts(prev => prev.filter(p => p.id !== id));
            return true;
        }
    }, [addToast]);

    const deleteComment = useCallback(async (id) => {
        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) {
            addToast('failed to delete comment', 'error');
            return false;
        } else {
            addToast('comment deleted', 'success');
            setComments(prev => prev.filter(c => c.id !== id));
            return true;
        }
    }, [addToast]);

    const createPost = useCallback(async (post) => {
        const { data, error } = await supabase
            .from('posts')
            .insert(post)
            .select()
            .single();

        if (error) {
            addToast('failed to create post: ' + error.message, 'error');
            return null;
        } else {
            addToast('post published successfully', 'success');
            if (data) setPosts(prev => [data, ...prev]);
            return data;
        }
    }, [addToast]);

    const updatePost = useCallback(async (id, updates) => {
        const { data, error } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            addToast('failed to update post: ' + error.message, 'error');
            return null;
        } else {
            addToast('post updated successfully', 'success');
            if (data) {
                setPosts(prev => prev.map(p => p.id === id ? data : p));
            }
            return data;
        }
    }, [addToast]);

    return {
        posts,
        comments,
        loading,
        fetchPosts,
        fetchComments,
        deletePost,
        deleteComment,
        createPost,
        updatePost
    };
};
