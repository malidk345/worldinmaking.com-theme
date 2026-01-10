"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

// Icons
const ChevronUpIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: size, height: size }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
);

const ChevronDownIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: size, height: size }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
    </svg>
);

const MAX_VOTES = 5;

export default function VoteControl({ postId, compact = false }) {
    const { addToast } = useToast();
    const { user } = useAuth();

    const [upvotes, setUpvotes] = useState(0);
    const [downvotes, setDownvotes] = useState(0);
    const [userUpvotes, setUserUpvotes] = useState(0);
    const [userDownvotes, setUserDownvotes] = useState(0);
    const [loading, setLoading] = useState(false);

    const pid = String(postId);

    // Fetch votes on mount
    useEffect(() => {
        const fetchVotes = async () => {
            // Get total upvotes
            const { data: upData } = await supabase
                .from('post_votes')
                .select('vote_count')
                .eq('post_id', pid)
                .eq('vote_type', 'up');

            const totalUp = upData?.reduce((sum, v) => sum + v.vote_count, 0) || 0;
            setUpvotes(totalUp);

            // Get total downvotes
            const { data: downData } = await supabase
                .from('post_votes')
                .select('vote_count')
                .eq('post_id', pid)
                .eq('vote_type', 'down');

            const totalDown = downData?.reduce((sum, v) => sum + v.vote_count, 0) || 0;
            setDownvotes(totalDown);

            // Get user's votes
            if (user) {
                const { data: userUpData } = await supabase
                    .from('post_votes')
                    .select('vote_count')
                    .eq('post_id', pid)
                    .eq('user_id', user.id)
                    .eq('vote_type', 'up')
                    .maybeSingle();

                setUserUpvotes(userUpData?.vote_count || 0);

                const { data: userDownData } = await supabase
                    .from('post_votes')
                    .select('vote_count')
                    .eq('post_id', pid)
                    .eq('user_id', user.id)
                    .eq('vote_type', 'down')
                    .maybeSingle();

                setUserDownvotes(userDownData?.vote_count || 0);
            }
        };

        fetchVotes();
    }, [pid, user]);

    const handleVote = async (type) => {
        if (!user) {
            addToast('please login to vote', 'info');
            return;
        }

        if (loading) return;
        setLoading(true);

        const currentUserVotes = type === 'up' ? userUpvotes : userDownvotes;
        const setUserVotes = type === 'up' ? setUserUpvotes : setUserDownvotes;
        const setTotalVotes = type === 'up' ? setUpvotes : setDownvotes;

        // Check if already at max
        if (currentUserVotes >= MAX_VOTES) {
            addToast(`max ${MAX_VOTES} ${type}votes reached`, 'info');
            setLoading(false);
            return;
        }

        // Optimistic update
        setUserVotes(prev => prev + 1);
        setTotalVotes(prev => prev + 1);

        try {
            // Check if vote record exists
            const { data: existing } = await supabase
                .from('post_votes')
                .select('id, vote_count')
                .eq('post_id', pid)
                .eq('user_id', user.id)
                .eq('vote_type', type)
                .maybeSingle();

            if (existing) {
                // Update existing vote
                const { error } = await supabase
                    .from('post_votes')
                    .update({
                        vote_count: existing.vote_count + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                // Insert new vote
                const { error } = await supabase
                    .from('post_votes')
                    .insert({
                        post_id: pid,
                        user_id: user.id,
                        vote_type: type,
                        vote_count: 1
                    });

                if (error) throw error;
            }
        } catch (error) {
            logger.error('[VoteControl] Vote error:', error);
            // Revert on error
            setUserVotes(prev => prev - 1);
            setTotalVotes(prev => prev - 1);
            addToast('failed to vote', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        addToast('link copied to clipboard', 'success');
    };

    const score = upvotes - downvotes;

    // Compact inline version
    if (compact) {
        return (
            <div className="inline-flex items-center gap-0 rounded-md border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden">
                <button
                    onClick={() => handleVote('up')}
                    disabled={loading}
                    className={`p-1.5 transition-all hover:bg-green-500/20 ${userUpvotes > 0 ? 'text-green-500' : 'text-gray-500'}`}
                    title={`upvote (${userUpvotes}/${MAX_VOTES})`}
                >
                    <ChevronUpIcon size={14} />
                </button>
                <span className={`text-xs font-bold min-w-[24px] text-center ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {score}
                </span>
                <button
                    onClick={() => handleVote('down')}
                    disabled={loading}
                    className={`p-1.5 transition-all hover:bg-red-500/20 ${userDownvotes > 0 ? 'text-red-500' : 'text-gray-500'}`}
                    title={`downvote (${userDownvotes}/${MAX_VOTES})`}
                >
                    <ChevronDownIcon size={14} />
                </button>
            </div>
        );
    }

    // Full version (for blog post footer)
    return (
        <div className="flex items-center justify-between py-3 border-t border-black/15 mt-4 mb-4">
            {/* Vote Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleVote('up')}
                    disabled={loading}
                    className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small"
                >
                    <span className={`LemonButton__chrome flex items-center gap-1.5 px-3 py-1.5 border border-black/20 rounded font-bold text-xs hover:border-black/30 bg-white transition-all shadow-sm ${userUpvotes > 0
                        ? 'text-green-600 border-green-200'
                        : 'text-secondary hover:text-primary'
                        }`}>
                        <ChevronUpIcon size={16} />
                        <span className="text-sm">{upvotes}</span>
                    </span>
                </button>

                <button
                    onClick={() => handleVote('down')}
                    disabled={loading}
                    className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small"
                >
                    <span className={`LemonButton__chrome flex items-center gap-1.5 px-3 py-1.5 border border-black/20 rounded font-bold text-xs hover:border-black/30 bg-white transition-all shadow-sm ${userDownvotes > 0
                        ? 'text-red-600 border-red-200'
                        : 'text-secondary hover:text-primary'
                        }`}>
                        <ChevronDownIcon size={16} />
                        <span className="text-sm">{downvotes}</span>
                    </span>
                </button>
            </div>

            {/* Share Button */}
            <button
                onClick={handleShare}
                className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small"
            >
                <span className="LemonButton__chrome flex items-center gap-2 px-3 py-1.5 border border-black/20 rounded font-bold text-xs text-secondary hover:text-primary hover:border-black/30 hover:bg-white bg-white transition-all shadow-sm">
                    <ShareIcon />
                    <span>share</span>
                </span>
            </button>
        </div>
    );
}

