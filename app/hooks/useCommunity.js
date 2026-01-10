"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import logger from '../utils/logger';

export const useCommunity = () => {
    const { addToast } = useToast();
    const [channels, setChannels] = useState([]);
    const [posts, setPosts] = useState([]);
    const [replies, setReplies] = useState([]);
    const [userLikes, setUserLikes] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch user's likes on mount
    const fetchUserLikes = useCallback(async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return;

            const { data, error: fetchError } = await supabase
                .from('community_likes')
                .select('post_id')
                .eq('user_id', userData.user.id);

            if (!fetchError && data) {
                setUserLikes(new Set(data.map(like => like.post_id)));
            }
        } catch (e) {
            logger.error('[useCommunity] fetchUserLikes exception:', e);
        }
    }, []);

    // Fetch Channels
    const fetchChannels = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('community_channels')
                .select('*')
                .order('id');

            if (fetchError) {
                logger.error('[useCommunity] fetchChannels error:', fetchError);
                addToast('failed to load channels', 'error');
                setError(fetchError.message);
            } else if (data) {
                setChannels(data);
            }
        } catch (e) {
            logger.error('[useCommunity] fetchChannels exception:', e);
            addToast('failed to load channels', 'error');
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Fetch Posts for a Channel
    const fetchPosts = useCallback(async (channelId) => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('community_posts')
                .select(`
                    *,
                    profiles (username, avatar_url),
                    replies:community_replies(count),
                    likes:community_likes(count)
                `)
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false });

            if (fetchError) {
                logger.error('[useCommunity] fetchPosts error:', fetchError);
                addToast('failed to load discussions', 'error');
                setError(fetchError.message);
            } else if (data) {
                // Manual mapping for reply and like count
                const mapData = data.map((p) => ({
                    ...p,
                    _count: {
                        replies: p.replies?.[0]?.count || 0,
                        likes: p.likes?.[0]?.count || 0
                    }
                }));
                setPosts(mapData);
            }

            // Also fetch user likes
            await fetchUserLikes();
        } catch (e) {
            logger.error('[useCommunity] fetchPosts exception:', e);
            addToast('failed to load discussions', 'error');
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [addToast, fetchUserLikes]);

    // Fetch Replies
    const fetchReplies = useCallback(async (postId) => {
        try {
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('community_replies')
                .select(`
                    *,
                    profiles (username, avatar_url)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (fetchError) {
                logger.error('[useCommunity] fetchReplies error:', fetchError);
                addToast('failed to load replies', 'error');
                setError(fetchError.message);
            } else if (data) {
                setReplies(data);
            }
        } catch (e) {
            logger.error('[useCommunity] fetchReplies exception:', e);
            addToast('failed to load replies', 'error');
            setError(e.message);
        }
    }, [addToast]);

    // Like/Unlike Post
    const toggleLike = useCallback(async (postId) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to like', 'error');
                return false;
            }

            const userId = userData.user.id;
            const isLiked = userLikes.has(postId);

            if (isLiked) {
                // Unlike - delete the like
                const { error: deleteError } = await supabase
                    .from('community_likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', userId);

                if (deleteError) {
                    logger.error('[useCommunity] unlike error:', deleteError);
                    return false;
                }

                // Update local state
                setUserLikes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(postId);
                    return newSet;
                });

                // Update post like count locally
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, _count: { ...p._count, likes: Math.max(0, (p._count?.likes || 1) - 1) } }
                        : p
                ));
            } else {
                // Like - insert new like
                const { error: insertError } = await supabase
                    .from('community_likes')
                    .insert({
                        post_id: postId,
                        user_id: userId
                    });

                if (insertError) {
                    // Might be duplicate, ignore
                    if (!insertError.message.includes('duplicate')) {
                        logger.error('[useCommunity] like error:', insertError);
                        return false;
                    }
                }

                // Update local state
                setUserLikes(prev => new Set([...prev, postId]));

                // Update post like count locally
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, _count: { ...p._count, likes: (p._count?.likes || 0) + 1 } }
                        : p
                ));
            }

            return true;
        } catch (e) {
            logger.error('[useCommunity] toggleLike exception:', e);
            return false;
        }
    }, [addToast, userLikes]);

    // Create Reply
    const createReply = useCallback(async (postId, content) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to reply', 'error');
                return false;
            }

            const { error: insertError } = await supabase
                .from('community_replies')
                .insert({
                    post_id: postId,
                    author_id: userData.user.id,
                    content
                });

            if (insertError) {
                logger.error('[useCommunity] createReply error:', insertError);
                addToast(insertError.message, 'error');
                return false;
            }

            addToast('reply sent', 'success');
            await fetchReplies(postId);
            return true;
        } catch (e) {
            logger.error('[useCommunity] createReply exception:', e);
            addToast('failed to send reply', 'error');
            return false;
        }
    }, [addToast, fetchReplies]);

    // Create Post
    const createPost = useCallback(async (channelId, title, content, imageUrl) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to post', 'error');
                return false;
            }

            const { error: insertError } = await supabase
                .from('community_posts')
                .insert({
                    channel_id: channelId,
                    author_id: userData.user.id,
                    title,
                    content,
                    image_url: imageUrl || null
                });

            if (insertError) {
                logger.error('[useCommunity] createPost error:', insertError);
                addToast(insertError.message, 'error');
                return false;
            }

            addToast('discussion started', 'success');
            await fetchPosts(channelId);
            return true;
        } catch (e) {
            logger.error('[useCommunity] createPost exception:', e);
            addToast('failed to create post', 'error');
            return false;
        }
    }, [addToast, fetchPosts]);

    // Memoize return value
    const result = useMemo(() => ({
        channels,
        posts,
        replies,
        userLikes,
        loading,
        error,
        fetchChannels,
        fetchPosts,
        fetchReplies,
        createPost,
        createReply,
        toggleLike
    }), [channels, posts, replies, userLikes, loading, error, fetchChannels, fetchPosts, fetchReplies, createPost, createReply, toggleLike]);

    return result;
};
