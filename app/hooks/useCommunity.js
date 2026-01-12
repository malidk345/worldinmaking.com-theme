"use client";

import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import useSWR, { useSWRConfig } from 'swr';
import logger from '../utils/logger';

export const useCommunity = () => {
    const { addToast } = useToast();
    const { mutate } = useSWRConfig();
    const [userLikes, setUserLikes] = useState(new Set());

    // --- Fetchers ---
    const channelsFetcher = async () => {
        const { data, error } = await supabase.from('community_channels').select('*').order('id');
        if (error) throw error;
        return data;
    };

    const postsFetcher = async (channelId) => {
        if (!channelId) return [];
        const { data, error } = await supabase
            .from('community_posts')
            .select('*, profiles(username, avatar_url), replies:community_replies(count), likes:community_likes(count)')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(p => ({
            ...p,
            _count: {
                replies: p.replies?.[0]?.count || 0,
                likes: p.likes?.[0]?.count || 0
            }
        }));
    };

    const repliesFetcher = async (postId) => {
        if (!postId) return [];
        const { data, error } = await supabase
            .from('community_replies')
            .select('*, profiles(username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    };

    // --- SWR Hooks ---
    const { data: channels = [], isLoading: channelsLoading } = useSWR('community_channels', channelsFetcher);

    // We'll use these as dynamic fetchers based on state or params
    // For compatibility with the current imperative fetchPosts/fetchReplies:
    const [activeChannelId, setActiveChannelId] = useState(null);
    const [activePostId, setActivePostId] = useState(null);

    const { data: posts = [], isLoading: postsLoading, mutate: mutatePosts } = useSWR(
        activeChannelId ? ['community_posts', activeChannelId] : null,
        () => postsFetcher(activeChannelId)
    );

    const { data: replies = [], isLoading: repliesLoading, mutate: mutateReplies } = useSWR(
        activePostId ? ['community_replies', activePostId] : null,
        () => repliesFetcher(activePostId)
    );

    // --- Realtime Subscription ---
    useEffect(() => {
        const channel = supabase
            .channel('community_changes')
            .on('postgres_changes', { event: '*', theme: 'public', table: 'community_posts' }, () => {
                if (activeChannelId) mutate(['community_posts', activeChannelId]);
            })
            .on('postgres_changes', { event: '*', theme: 'public', table: 'community_replies' }, (payload) => {
                if (activePostId && payload.new.post_id === activePostId) mutate(['community_replies', activePostId]);
                // Also update post count if needed
                if (activeChannelId) mutate(['community_posts', activeChannelId]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChannelId, activePostId, mutate]);

    // Fetch user's likes
    useEffect(() => {
        const fetchLikes = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return;
            const { data } = await supabase.from('community_likes').select('post_id').eq('user_id', userData.user.id);
            if (data) setUserLikes(new Set(data.map(l => l.post_id)));
        };
        fetchLikes();
    }, []);

    // --- Actions ---
    const fetchChannels = useCallback(() => mutate('community_channels'), [mutate]);
    const fetchPosts = useCallback((id) => setActiveChannelId(id), []);
    const fetchReplies = useCallback((id) => setActivePostId(id), []);

    const toggleLike = useCallback(async (postId) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                addToast('please log in to like', 'error');
                return false;
            }

            const userId = userData.user.id;
            const isLiked = userLikes.has(postId);

            // Optimistic Update
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
            return true;
        } catch (e) {
            logger.error('[useCommunity] toggleLike error:', e);
            return false;
        }
    }, [activeChannelId, userLikes, addToast, mutate]);

    const createReply = useCallback(async (postId, content) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return addToast('please log in to reply', 'error');

        const { error } = await supabase.from('community_replies').insert({
            post_id: postId,
            author_id: userData.user.id,
            content
        });

        if (error) return addToast(error.message, 'error');
        addToast('reply sent', 'success');
        mutate(['community_replies', postId]);
        return true;
    }, [addToast, mutate]);

    const createPost = useCallback(async (channelId, title, content, imageUrl) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return addToast('please log in to post', 'error');

        const { error } = await supabase.from('community_posts').insert({
            channel_id: channelId,
            author_id: userData.user.id,
            title,
            content,
            image_url: imageUrl || null
        });

        if (error) return addToast(error.message, 'error');
        addToast('discussion started', 'success');
        mutate(['community_posts', channelId]);
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
