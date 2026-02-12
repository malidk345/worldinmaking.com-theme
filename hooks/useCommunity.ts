"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import useSWR, { useSWRConfig } from 'swr';
import { sanitizeString } from '../utils/security';
import logger from '../utils/logger';

export interface Profile {
    id: string;
    username: string;
    avatar_url: string;
}

export interface CommunityPost {
    id: number;
    channel_id: number;
    author_id: string;
    title: string;
    content: string;
    image_url: string | null;
    created_at: string;
    profiles: Profile;
    _count: {
        replies: number;
        likes: number;
    };
}

export interface CommunityReply {
    id: number;
    post_id: number;
    author_id: string;
    content: string;
    created_at: string;
    profiles: Profile;
}

export interface CommunityChannel {
    id: number;
    name: string;
    slug: string;
    description: string;
}

export const useCommunity = () => {
    const { addToast } = useToast();
    const { mutate } = useSWRConfig();
    const [userLikes, setUserLikes] = useState<Set<number | string>>(new Set());

    const channelsFetcher = async () => {
        const { data, error } = await supabase.from('community_channels').select('*').order('id');
        if (error) throw error;
        return data as CommunityChannel[];
    };

    const postsFetcher = async (channelId?: number, slug?: string) => {
        if (!channelId && !slug) return [];

        let query = supabase
            .from('community_posts')
            .select('*, profiles(id, username, avatar_url), community_replies(count), community_likes(count)')

        if (slug) {
            query = query.eq('post_slug', slug)
        } else if (channelId) {
            query = query.eq('channel_id', channelId)
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((p: any) => ({
            ...p,
            _count: {
                replies: p.community_replies?.[0]?.count || 0,
                likes: p.community_likes?.[0]?.count || 0
            }
        })) as CommunityPost[];
    };

    const repliesFetcher = async (postId: number | string) => {
        if (!postId) return [];
        const { data, error } = await supabase
            .from('community_replies')
            .select('*, profiles(id, username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data as CommunityReply[];
    };

    const { data: channels = [], isLoading: channelsLoading } = useSWR('community_channels', channelsFetcher);

    const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
    const [activePostSlug, setActivePostSlug] = useState<string | null>(null);
    const [activePostId, setActivePostId] = useState<number | string | null>(null);

    const { data: posts = [], isLoading: postsLoading } = useSWR(
        activePostSlug ? ['community_posts_slug', activePostSlug] : activeChannelId ? ['community_posts', activeChannelId] : null,
        () => postsFetcher(activeChannelId || undefined, activePostSlug || undefined)
    );

    const { data: replies = [], isLoading: repliesLoading } = useSWR(
        activePostId ? ['community_replies', activePostId] : null,
        () => repliesFetcher(activePostId!)
    );

    useEffect(() => {
        const channel = supabase
            .channel('community_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
                if (activeChannelId) mutate(['community_posts', activeChannelId]);
                if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_replies' }, (payload: any) => {
                if (activePostId && payload.new.post_id === activePostId) mutate(['community_replies', activePostId]);
                if (activeChannelId) mutate(['community_posts', activeChannelId]);
                if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChannelId, activePostSlug, activePostId, mutate]);

    useEffect(() => {
        const fetchLikes = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return;
            const { data } = await supabase.from('community_likes').select('post_id').eq('user_id', userData.user.id);
            if (data) setUserLikes(new Set(data.map(l => l.post_id)));
        };
        fetchLikes();
    }, []);

    const fetchChannels = useCallback(() => mutate('community_channels'), [mutate]);
    const fetchPosts = useCallback((id?: number, slug?: string) => {
        setActiveChannelId(id || null)
        setActivePostSlug(slug || null)
    }, []);
    const fetchReplies = useCallback((id: number | string) => setActivePostId(id), []);

    const toggleLike = useCallback(async (postId: number | string) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to like', 'error');
                return false;
            }

            const userId = userData.user.id;
            const isLiked = userLikes.has(postId);

            setUserLikes(prev => {
                const next = new Set(prev);
                isLiked ? next.delete(postId) : next.add(postId);
                return next;
            });

            if (isLiked) {
                await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', userId);
            } else {
                await supabase.from('community_likes').insert({ post_id: postId, user_id: userId });
            }

            if (activeChannelId) mutate(['community_posts', activeChannelId]);
            if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
            return true;
        } catch (e) {
            logger.error('[useCommunity] toggleLike error:', e);
            return false;
        }
    }, [activeChannelId, activePostSlug, userLikes, addToast, mutate]);

    const createReply = useCallback(async (postId: number | string, content: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return addToast('please log in to reply', 'error');

        const sanitizedContent = sanitizeString(content);
        if (!sanitizedContent) {
            return addToast('invalid reply content', 'error');
        }

        const { error } = await supabase.from('community_replies').insert({
            post_id: postId,
            author_id: userData.user.id,
            content: sanitizedContent
        });

        if (error) return addToast(error.message, 'error');
        addToast('reply sent', 'success');
        mutate(['community_replies', postId]);
        return true;
    }, [addToast, mutate]);

    const createPost = useCallback(async (channelId: number | string | undefined, title: string, content: string, postSlug?: string, imageUrl?: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return addToast('please log in to post', 'error');

        const sanitizedTitle = sanitizeString(title);
        const sanitizedContent = sanitizeString(content);

        if (!sanitizedTitle || !sanitizedContent) {
            return addToast('invalid post content', 'error');
        }

        const { error } = await supabase.from('community_posts').insert({
            channel_id: channelId || null,
            author_id: userData.user.id,
            title: sanitizedTitle,
            content: sanitizedContent,
            post_slug: postSlug || null,
            image_url: imageUrl || null
        });

        if (error) return addToast(error.message, 'error');
        addToast('discussion started', 'success');
        if (postSlug) mutate(['community_posts_slug', postSlug]);
        if (channelId) mutate(['community_posts', channelId]);
        return true;
    }, [addToast, mutate]);

    return {
        channels,
        posts,
        replies,
        userLikes,
        loading: channelsLoading || postsLoading || repliesLoading,
        error: null,
        fetchChannels,
        fetchPosts,
        fetchReplies,
        createPost,
        createReply,
        toggleLike
    };
};
