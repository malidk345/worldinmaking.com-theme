'use client';

import React, { useState, useEffect } from 'react';
import Window from './Window';
import UserAvatar from './UserAvatar';
import { supabase } from '../lib/supabase';
import Image from 'next/image';
import { stripMarkdown } from '../lib/markdown';

export default function AuthorProfileWindow({ username, onClose, zIndex, onFocus }) {
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!username) return;
            setLoading(true);

            try {
                // Fetch profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (profileError) throw profileError;
                setProfile(profileData);

                // Fetch posts by this author
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('author', username)
                    .eq('published', true)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (postsError) throw postsError;
                setPosts(postsData || []);

            } catch (err) {
                console.error('Error fetching author profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [username]);

    return (
        <Window
            id={`author-profile-${username}`}
            title={`Author: @${username}`}
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
            initialWidth={400}
            initialHeight={500}
            isMaximized={false}
        >
            <div className="flex flex-col h-full bg-bg-3000 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className="animate-pulse text-secondary text-xs font-bold uppercase tracking-widest">Loading Author Details...</div>
                    </div>
                ) : profile ? (
                    <>
                        {/* Profile Header Block */}
                        <div className="p-6 bg-white border-b border-black/10">
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-xl border border-black/15 overflow-hidden bg-white shadow-sm flex items-center justify-center shrink-0">
                                    <UserAvatar
                                        src={profile.avatar_url}
                                        name={profile.username}
                                        size={80}
                                        className="w-full h-full"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl font-bold text-primary mb-1">@{profile.username}</h1>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold rounded uppercase tracking-wider">Author</span>
                                        <span className="px-2 py-0.5 bg-black/5 text-secondary text-[10px] font-bold rounded uppercase tracking-wider">
                                            Joined {new Date(profile.created_at).getFullYear()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {profile.bio && (
                                <div className="mt-6 text-sm text-primary leading-relaxed bg-black/5 p-4 rounded-lg italic border-l-4 border-black/20">
                                    <div
                                        className="prose-content text-[13px]"
                                        dangerouslySetInnerHTML={{ __html: profile.bio }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Recent Activity */}
                        <div className="p-4">
                            <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-4 px-2">Recent Insights</h3>

                            <div className="flex flex-col gap-2">
                                {posts.length > 0 ? (
                                    posts.map(post => (
                                        <a
                                            key={post.id}
                                            href={`/post?id=${post.id}`}
                                            className="group flex items-center gap-3 p-3 bg-white border border-black/5 rounded-lg hover:border-black/20 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-12 h-12 rounded bg-black/5 overflow-hidden shrink-0 relative">
                                                {post.image_url ? (
                                                    <Image src={post.image_url} alt={post.title} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-black/20">
                                                        {post.title.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[13px] font-bold text-primary line-clamp-1 group-hover:text-[#254b85] transition-colors">{post.title}</h4>
                                                <p className="text-[10px] text-secondary mt-0.5 uppercase font-bold tracking-tight">{post.category} • {new Date(post.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="shrink-0 text-secondary group-hover:text-primary transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m9 5 7 7-7 7" /></svg>
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-white border border-dashed border-black/10 rounded-lg">
                                        <p className="text-xs text-secondary font-medium">No public posts yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="mt-auto p-4 border-t border-black/10 bg-white flex justify-center">
                            <button
                                onClick={onClose}
                                className="LemonButton LemonButton--secondary LemonButton--small w-full max-w-[120px]"
                            >
                                <span className="LemonButton__chrome px-6">Close</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                        <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h4 className="font-bold text-primary mb-1 uppercase tracking-tight">Author Not Found</h4>
                        <p className="text-[11px] text-secondary font-medium">This author profile doesn&apos;t exist or has been removed.</p>
                        <button onClick={onClose} className="mt-6 text-[10px] font-bold text-accent uppercase underline">Go back</button>
                    </div>
                )}
            </div>

        </Window>
    );
}
