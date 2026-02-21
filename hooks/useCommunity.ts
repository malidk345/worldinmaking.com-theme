"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import useSWR, { useSWRConfig } from 'swr';
import { sanitizeString, sanitizePlainText, stripHtmlTags } from '../utils/security';
import logger from '../utils/logger';

export interface Profile {
    id: string;
    username: string;
    avatar_url: string;
}

export interface CommunityPost {
    id: number;
    channel_id?: number;
    author_id: string;
    title: string;
    content: string;
    image_url?: string | null;
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
        try {
            const { data, error } = await supabase.from('community_channels').select('*').order('id');
            if (error) {
                logger.warn('[useCommunity] community_channels table may not exist:', error.message);
                return [] as CommunityChannel[];
            }
            return data as CommunityChannel[];
        } catch {
            return [] as CommunityChannel[];
        }
    };

    const postsFetcher = async (channelId?: number, slug?: string, postId?: number | string) => {
        if (!channelId && !slug && !postId) return [];

        try {
            // Try full query first
            let query = supabase
                .from('community_posts')
                .select('*, profiles(id, username, avatar_url), community_replies(count), community_likes(count)')

            if (postId) {
                query = query.eq('id', Number(postId))
            } else if (slug) {
                // Match by post_slug OR by title pattern (for legacy comments where post_slug was null)
                query = query.or(`post_slug.eq.${slug},title.ilike.comment_${slug}_%`)
            } else if (channelId) {
                query = query.eq('channel_id', channelId)
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                // If full query fails (missing columns/tables), try a simpler query
                logger.warn('[useCommunity] Full query failed, trying fallback:', error.message);

                let fallbackQuery = supabase
                    .from('community_posts')
                    .select('id, author_id, title, content, created_at, post_slug, profiles(id, username, avatar_url)')

                if (postId) {
                    fallbackQuery = fallbackQuery.eq('id', Number(postId))
                } else if (slug) {
                    fallbackQuery = fallbackQuery.or(`post_slug.eq.${slug},title.ilike.comment_${slug}_%`)
                }

                const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('created_at', { ascending: false });

                if (fallbackError) throw fallbackError;

                return (fallbackData || []).map((p: any) => ({
                    ...p,
                    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
                    _count: { replies: 0, likes: 0 }
                })) as CommunityPost[];
            }

            return (data || []).map((p: any) => ({
                ...p,
                profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
                _count: {
                    replies: p.community_replies?.[0]?.count || 0,
                    likes: p.community_likes?.[0]?.count || 0
                }
            })) as CommunityPost[];
        } catch (e: any) {
            logger.error('[useCommunity] postsFetcher error:', e);
            return [];
        }
    };

    const repliesFetcher = async (postId: number | string) => {
        if (!postId) return [];
        try {
            const { data, error } = await supabase
                .from('community_replies')
                .select('*, profiles(id, username, avatar_url)')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });
            if (error) {
                logger.warn('[useCommunity] repliesFetcher error:', error.message);
                return [];
            }
            return (data || []).map((r: any) => ({
                ...r,
                profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
            })) as CommunityReply[];
        } catch (e) {
            logger.error('[useCommunity] repliesFetcher exception:', e);
            return [];
        }
    };

    const { data: channels = [], isLoading: channelsLoading } = useSWR('community_channels', channelsFetcher);

    const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
    const [activePostSlug, setActivePostSlug] = useState<string | null>(null);
    const [activePostLookupId, setActivePostLookupId] = useState<number | string | null>(null);
    const [activePostId, setActivePostId] = useState<number | string | null>(null);

    const { data: posts = [], isLoading: postsLoading } = useSWR(
        activePostSlug
            ? ['community_posts_slug', activePostSlug]
            : activeChannelId
                ? ['community_posts', activeChannelId]
                : activePostLookupId
                    ? ['community_post_id', activePostLookupId]
                    : null,
        () => postsFetcher(activeChannelId || undefined, activePostSlug || undefined, activePostLookupId || undefined)
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
                if (activePostId && payload.new?.post_id === activePostId) mutate(['community_replies', activePostId]);
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
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (!userData?.user) return;
                const { data } = await supabase.from('community_likes').select('post_id').eq('user_id', userData.user.id);
                if (data) setUserLikes(new Set(data.map(l => l.post_id)));
            } catch {
                // community_likes table may not exist
            }
        };
        fetchLikes();
    }, []);

    const fetchChannels = useCallback(() => mutate('community_channels'), [mutate]);
    const fetchPosts = useCallback((id?: number, slug?: string, postId?: number | string) => {
        setActiveChannelId(id || null)
        setActivePostSlug(slug || null)
        setActivePostLookupId(postId || null)
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
            if (activePostLookupId) mutate(['community_post_id', activePostLookupId]);
            return true;
        } catch (e) {
            logger.error('[useCommunity] toggleLike error:', e);
            return false;
        }
    }, [activeChannelId, activePostSlug, activePostLookupId, userLikes, addToast, mutate]);

    const createReply = useCallback(async (postId: number | string, content: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return addToast('please log in to reply', 'error');

        const sanitizedContent = sanitizeString(content);
        if (!stripHtmlTags(sanitizedContent)) {
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

        const sanitizedTitle = sanitizePlainText(title);
        const sanitizedContent = sanitizeString(content);

        if (!sanitizedTitle || !stripHtmlTags(sanitizedContent)) {
            return addToast('invalid post content', 'error');
        }

        // Build insert payload — always include post_slug and channel_id
        const insertPayload: Record<string, any> = {
            author_id: userData.user.id,
            title: sanitizedTitle,
            content: sanitizedContent,
            post_slug: postSlug || null,
            channel_id: channelId || 1, // default to General channel (NOT NULL constraint)
        };
        if (imageUrl) insertPayload.image_url = imageUrl;

        const { error } = await supabase.from('community_posts').insert(insertPayload);

        if (error) return addToast(error.message, 'error');
        addToast('discussion started', 'success');
        if (postSlug) mutate(['community_posts_slug', postSlug]);
        if (channelId) mutate(['community_posts', channelId]);
        if (activePostLookupId) mutate(['community_post_id', activePostLookupId]);
        return true;
    }, [addToast, mutate, activePostLookupId]);

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
