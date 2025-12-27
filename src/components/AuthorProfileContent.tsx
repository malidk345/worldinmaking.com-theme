'use client';

import React, { useState, useEffect } from 'react';
import { usePosts } from '../hooks/usePosts';
import { supabase } from '../lib/supabase';
import { ReaderIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface AuthorProfileProps {
    authorName: string;
    openWindow: (type: string, data?: any) => void;
}

const AuthorProfileContent: React.FC<AuthorProfileProps> = ({ authorName, openWindow }) => {
    const { posts } = usePosts();
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Filter posts by this author (Safe check)
    const authorPosts = posts.filter(post =>
        (post.author || '').toLowerCase() === authorName.toLowerCase()
    );

    useEffect(() => {
        const fetchProfile = async () => {
            // Try to find author profile in DB
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url')
                .ilike('username', authorName)
                .single();

            if (data?.avatar_url) {
                setAvatarUrl(data.avatar_url);
            } else if (authorPosts.length > 0 && authorPosts[0].authorAvatar) {
                // Fallback to avatar from their first post if DB profile not found
                setAvatarUrl(authorPosts[0].authorAvatar || '');
            }
            setLoading(false);
        };
        fetchProfile();
    }, [authorName, authorPosts]);

    return (
        <div className="flex flex-col h-full animate-fade-up">
            {/* Header Profile Section */}
            <div className="p-8 border-b border-black/10 dark:border-white/10 flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-white/5">
                <UserAvatar
                    src={avatarUrl}
                    name={authorName}
                    size={96}
                    className="shadow-lg ring-4 ring-white dark:ring-white/10"
                />
                <div className="text-center">
                    <h2 className="text-2xl font-black lowercase text-black dark:text-white">{authorName}</h2>
                    <p className="text-sm text-zinc-500 lowercase mt-1 font-medium">
                        {authorPosts.length} published articles
                    </p>
                </div>
            </div>

            {/* Posts Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-xs font-bold text-zinc-400 mb-4 lowercase tracking-wider">recent publications</h3>

                {authorPosts.length === 0 ? (
                    <div className="text-center text-zinc-400 text-sm mt-10">
                        this author hasn't published anything yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {authorPosts.map(post => (
                            <button
                                key={post.id}
                                onClick={() => openWindow('post', post)}
                                className="group text-left p-4 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-black/20 hover:bg-zinc-50 dark:hover:bg-white/10 hover:border-black/10 dark:hover:border-white/20 transition-all flex flex-col gap-2 relative overflow-hidden"
                            >
                                <div className="absolute top-4 right-4 text-zinc-300 dark:text-zinc-600">
                                    <ReaderIcon />
                                </div>
                                <span className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 w-fit lowercase">
                                    {post.category}
                                </span>
                                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white leading-tight lowercase pr-6">
                                    {post.title}
                                </h4>
                                <div className="mt-auto pt-2 text-[10px] text-zinc-400 font-medium">
                                    {post.date}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthorProfileContent;
