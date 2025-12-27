'use client';

import React, { useState, useEffect } from 'react';
import { ShareIcon, HeartIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useWindow } from '../contexts/WindowContext';

interface ReactionControlProps {
    postId: string | number; // Support ID
}

const ReactionControl: React.FC<ReactionControlProps> = ({ postId }) => {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { openWindow } = useWindow(); // For login prompt

    const [count, setCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [loading, setLoading] = useState(false);

    // Convert postId to string for DB consistency
    const pid = String(postId);

    useEffect(() => {
        const fetchLikes = async () => {
            // Get Total Count
            const { count: total, error } = await supabase
                .from('post_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', pid);

            if (!error && total !== null) {
                setCount(total);
            }

            // Check if User Liked
            if (user) {
                const { data } = await supabase
                    .from('post_likes')
                    .select('id')
                    .eq('post_id', pid)
                    .eq('user_id', user.id)
                    .single();

                if (data) setIsLiked(true);
            }
        };

        fetchLikes();
    }, [pid, user]);

    const handleToggleLike = async () => {
        if (!user) {
            addToast('please login to like posts', 'info');
            openWindow('login');
            return;
        }

        if (loading) return;
        setLoading(true);

        // Optimistic UI update
        const previousState = isLiked;
        const previousCount = count;

        setIsLiked(!isLiked);
        setCount(prev => isLiked ? prev - 1 : prev + 1);

        try {
            if (previousState) {
                // Unlike: Delete record
                const { error } = await supabase
                    .from('post_likes')
                    .delete()
                    .eq('post_id', pid)
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                // Like: Insert record
                const { error } = await supabase
                    .from('post_likes')
                    .insert({ post_id: pid, user_id: user.id });

                if (error) throw error;
            }
        } catch (error) {
            console.error('Like error:', error);
            // Revert on error
            setIsLiked(previousState);
            setCount(previousCount);
            addToast('failed to update like', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href; // In a real app with routing, this might need construction
        navigator.clipboard.writeText(url);
        addToast('link copied to clipboard', 'success');
    };

    return (
        <div className="flex items-center justify-between py-6 border-t border-black/5 dark:border-white/5 mt-8 mb-8 animate-fade-up">
            {/* Like Button */}
            <button
                onClick={handleToggleLike}
                disabled={loading}
                className={`flex items-center gap-2 h-[40px] px-5 rounded-full transition-all duration-300 font-bold lowercase transform active:scale-95 ${isLiked
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/20'
                    }`}
            >
                <div className={`${isLiked ? 'fill-current' : ''}`}>
                    <HeartIcon size={18} filled={isLiked} />
                </div>
                <span>{count} likes</span>
            </button>

            {/* Share Button */}
            <button
                onClick={handleShare}
                className="flex items-center gap-2 h-[40px] px-5 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors text-sm font-medium lowercase text-zinc-900 dark:text-zinc-100"
            >
                <ShareIcon />
                <span>share</span>
            </button>
        </div>
    );
};

export default ReactionControl;
