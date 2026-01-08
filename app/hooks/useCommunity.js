"use client";

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export const useCommunity = () => {
    const { addToast } = useToast();
    const [channels, setChannels] = useState([]);
    const [posts, setPosts] = useState([]);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch Channels
    const fetchChannels = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('community_channels')
            .select('*')
            .order('id');

        if (error) addToast('failed to load channels', 'error');
        else if (data) setChannels(data);
        setLoading(false);
    }, [addToast]);

    // Fetch Posts for a Channel
    const fetchPosts = useCallback(async (channelId) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('community_posts')
            .select(`
                *,
                profiles (username, avatar_url),
                replies:community_replies(count)
            `)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false });

        if (error) {
            addToast('failed to load discussions', 'error');
        } else if (data) {
            // Manual mapping
            const mapData = data.map((p) => ({
                ...p,
                _count: { replies: p.replies?.[0]?.count || 0 }
            }));
            setPosts(mapData);
        }
        setLoading(false);
    }, [addToast]);

    // Fetch Replies
    const fetchReplies = useCallback(async (postId) => {
        const { data, error } = await supabase
            .from('community_replies')
            .select(`
                *,
                profiles (username, avatar_url)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            addToast('failed to load replies', 'error');
        } else if (data) {
            setReplies(data);
        }
    }, [addToast]);

    // Create Reply
    const createReply = useCallback(async (postId, content) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            addToast('please log in to reply', 'error');
            return false;
        }

        const { error } = await supabase.from('community_replies').insert({
            post_id: postId,
            author_id: userData.user.id,
            content
        });

        if (error) {
            addToast(error.message, 'error');
            return false;
        } else {
            addToast('reply sent', 'success');
            fetchReplies(postId);
            return true;
        }
    }, [addToast, fetchReplies]);

    // Create Post
    const createPost = useCallback(async (channelId, title, content, imageUrl) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            addToast('please log in to post', 'error');
            return false;
        }

        const { error } = await supabase.from('community_posts').insert({
            channel_id: channelId,
            author_id: userData.user.id,
            title,
            content,
            image_url: imageUrl || null
        });

        if (error) {
            addToast(error.message, 'error');
            return false;
        } else {
            addToast('discussion started', 'success');
            fetchPosts(channelId); // Refresh
            return true;
        }
    }, [addToast, fetchPosts]);

    return {
        channels,
        posts,
        replies,
        loading,
        fetchChannels,
        fetchPosts,
        fetchReplies,
        createPost,
        createReply
    };
};
