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
        views: number;
    };
}

export interface CommunityReply {
    id: number;
    post_id: number;
    author_id: string;
    content: string;
    created_at: string;
    profiles: Profile;
    upvotes: number;
}

export interface CommunityChannel {
    id: number;
    name: string;
    slug: string;
    description: string;
}

interface DBCommunityPost {
    id: number;
    channel_id?: number;
    author_id: string;
    title: string;
    content: string;
    created_at: string;
    post_slug?: string | null;
    profiles: Profile | Profile[];
    total_votes?: number;
    reply_count?: number;
    // Fallback fields for when view doesn't exist
    community_replies?: { count: number }[];
    community_likes?: { count: number }[];
    view_count?: number;
}

interface DBCommunityReply {
    id: number;
    post_id: number;
    author_id: string;
    content: string;
    created_at: string;
    profiles: Profile | Profile[];
    total_votes?: number;
}

export const useCommunity = () => {
    const { addToast } = useToast();
    const { mutate } = useSWRConfig();

    const channelsFetcher = async () => {
        try {
            const { data, error } = await supabase.from('community_channels').select('*').order('id');
            if (error) return [] as CommunityChannel[];
            return data as CommunityChannel[];
        } catch {
            return [] as CommunityChannel[];
        }
    };

    const postsFetcher = async (channelId?: number, slug?: string, postId?: number | string) => {
        if (!channelId && !slug && !postId) return [];

        try {
            // First try fetching from the stats view (ideal for new vote system)
            const response = await (async () => {
                let q = supabase.from('community_posts_with_stats').select('*, profiles(id, username, avatar_url)')
                if (postId) q = q.eq('id', Number(postId))
                else if (slug) q = q.or(`post_slug.eq.${slug},title.ilike.comment_${slug}_%`)
                else if (channelId) {
                    q = q.eq('channel_id', channelId).is('post_slug', null).not('title', 'ilike', 'comment_%')
                }
                return q.order('created_at', { ascending: false });
            })();
            
            let data = response.data;
            const error = response.error;

            // Fallback to direct table if view doesn't exist yet
            if (error) {
                logger.warn('[useCommunity] Stats view not found, falling back to direct table:', error.message);
                let q = supabase.from('community_posts').select('*, profiles(id, username, avatar_url), community_replies(count), community_likes(count)')
                if (postId) q = q.eq('id', Number(postId))
                else if (slug) q = q.or(`post_slug.eq.${slug},title.ilike.comment_${slug}_%`)
                else if (channelId) {
                    q = q.eq('channel_id', channelId).is('post_slug', null).not('title', 'ilike', 'comment_%')
                }
                const fallback = await q.order('created_at', { ascending: false });
                if (fallback.error) throw fallback.error;
                data = fallback.data;
            }

            return ((data || []) as unknown as DBCommunityPost[]).map((p) => ({
                ...p,
                profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
                _count: {
                    replies: p.reply_count ?? p.community_replies?.[0]?.count ?? 0,
                    likes: p.total_votes ?? p.community_likes?.[0]?.count ?? 0,
                    views: p.view_count || 0
                }
            })) as unknown as CommunityPost[];
        } catch (e: unknown) {
            logger.error('[useCommunity] postsFetcher absolute error:', e instanceof Error ? e.message : String(e));
            return [];
        }
    };

    const repliesFetcher = async (postId: number | string) => {
        if (!postId) return [];
        try {
            const response = await supabase
                .from('community_replies_with_stats')
                .select('*, profiles(id, username, avatar_url)')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });
            
            let data = response.data;
            const error = response.error;

            if (error) {
                // Fallback for replies if view doesn't exist
                const fallback = await supabase
                    .from('community_replies')
                    .select('*, profiles(id, username, avatar_url)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });
                if (fallback.error) throw fallback.error;
                data = fallback.data;
            }

            return ((data || []) as unknown as DBCommunityReply[]).map((r) => ({
                ...r,
                profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
                upvotes: r.total_votes || 0
            })) as unknown as CommunityReply[];
        } catch (e: unknown) {
            logger.error('[useCommunity] repliesFetcher exception:', e instanceof Error ? e.message : String(e));
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_votes' }, () => {
                if (activeChannelId) mutate(['community_posts', activeChannelId]);
                if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
            })
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'community_replies' },
                () => {
                    if (activePostId) mutate(['community_replies', activePostId]);
                    if (activeChannelId) mutate(['community_posts', activeChannelId]);
                    if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChannelId, activePostSlug, activePostId, mutate]);

    const fetchChannels = useCallback(() => mutate('community_channels'), [mutate]);
    const fetchPosts = useCallback((id?: number, slug?: string, postId?: number | string) => {
        setActiveChannelId(id || null)
        setActivePostSlug(slug || null)
        setActivePostLookupId(postId || null)
    }, []);
    const fetchReplies = useCallback((id: number | string) => setActivePostId(id), []);

    const handleVote = useCallback(async (postId: number | string, direction: 'up' | 'down') => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to vote', 'error');
                return false;
            }

            const userId = userData.user.id;
            const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;

            if (isNaN(numericPostId)) {
                logger.error('[useCommunity] handleVote: Invalid postId', postId);
                return false;
            }

            const { data: existing } = await supabase
                .from('community_post_votes')
                .select('vote')
                .eq('post_id', numericPostId)
                .eq('user_id', userId)
                .maybeSingle();

            const currentVoteValue = existing?.vote || 0;
            const directionValue = direction === 'up' ? 1 : -1;
            const nextVote = currentVoteValue === directionValue ? 0 : directionValue;

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('community_post_votes')
                    .update({ vote: nextVote })
                    .eq('post_id', numericPostId)
                    .eq('user_id', userId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('community_post_votes')
                    .insert({
                        post_id: numericPostId,
                        user_id: userId,
                        vote: nextVote
                    });
                error = insertError;
            }

            if (error) {
                addToast(`failed to save vote: ${error.message}`, 'error');
                return false;
            }

            if (activeChannelId) mutate(['community_posts', activeChannelId]);
            if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
            if (activePostLookupId) mutate(['community_post_id', activePostLookupId]);
            return true;
        } catch (e: unknown) {
            logger.error('[useCommunity] handleVote error:', e instanceof Error ? e.message : String(e));
            addToast('an unexpected error occurred while voting', 'error');
            return false;
        }
    }, [activeChannelId, activePostSlug, activePostLookupId, addToast, mutate]);

    const handleReplyVote = useCallback(async (replyId: number | string, postId: number | string, direction: 'up' | 'down') => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to vote', 'error');
                return false;
            }

            const userId = userData.user.id;
            const numericReplyId = typeof replyId === 'string' ? parseInt(replyId, 10) : replyId;

            if (isNaN(numericReplyId)) {
                logger.error('[useCommunity] handleReplyVote: Invalid replyId', replyId);
                return false;
            }

            const { data: existing } = await supabase
                .from('community_reply_votes')
                .select('vote')
                .eq('reply_id', numericReplyId)
                .eq('user_id', userId)
                .maybeSingle();

            const currentVoteValue = existing?.vote || 0;
            const directionValue = direction === 'up' ? 1 : -1;
            const nextVote = currentVoteValue === directionValue ? 0 : directionValue;

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('community_reply_votes')
                    .update({ vote: nextVote })
                    .eq('reply_id', numericReplyId)
                    .eq('user_id', userId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('community_reply_votes')
                    .insert({
                        reply_id: numericReplyId,
                        user_id: userId,
                        vote: nextVote
                    });
                error = insertError;
            }

            if (error) {
                addToast(`failed to save vote: ${error.message}`, 'error');
                return false;
            }

            mutate(['community_replies', postId]);
            return true;
        } catch (e: unknown) {
            logger.error('[useCommunity] handleReplyVote error:', e instanceof Error ? e.message : String(e));
            addToast('an unexpected error occurred while voting', 'error');
            return false;
        }
    }, [addToast, mutate]);

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

        const insertPayload: Record<string, unknown> = {
            author_id: userData.user.id,
            title: sanitizedTitle,
            content: sanitizedContent,
            post_slug: postSlug || null,
            channel_id: channelId || 1,
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

    const deletePost = useCallback(async (postId: number | string) => {
        const { error } = await supabase.from('community_posts').delete().eq('id', Number(postId));
        if (error) {
            addToast(`failed to delete post: ${error.message}`, 'error');
            return false;
        }
        addToast('post deleted', 'success');
        if (activeChannelId) mutate(['community_posts', activeChannelId]);
        if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
        if (activePostLookupId) mutate(['community_post_id', activePostLookupId]);
        return true;
    }, [addToast, mutate, activeChannelId, activePostSlug, activePostLookupId]);

    const deleteReply = useCallback(async (replyId: number | string, postId: number | string) => {
        const { error } = await supabase.from('community_replies').delete().eq('id', Number(replyId));
        if (error) {
            addToast(`failed to delete reply: ${error.message}`, 'error');
            return false;
        }
        addToast('reply deleted', 'success');
        mutate(['community_replies', postId]);
        if (activeChannelId) mutate(['community_posts', activeChannelId]);
        if (activePostSlug) mutate(['community_posts_slug', activePostSlug]);
        return true;
    }, [addToast, mutate, activeChannelId, activePostSlug]);

    return {
        channels,
        posts,
        replies,
        loading: channelsLoading || postsLoading || repliesLoading,
        error: null,
        fetchChannels,
        fetchPosts,
        fetchReplies,
        createPost,
        createReply,
        handleVote,
        handleReplyVote,
        deletePost,
        deleteReply
    };
};
