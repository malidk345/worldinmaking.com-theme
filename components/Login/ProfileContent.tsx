"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/App';
import {
    IconBolt,
    IconBookmark
} from '@posthog/icons';
import OSButton from 'components/OSButton';

export default function ProfileContent() {
    const { user, profile, updateProfile, signOut } = useAuth();
    const { addToast } = useToast();
    const { addWindow } = useApp();

    const [form, setForm] = useState({
        username: profile?.username || '',
        avatar_url: profile?.avatar_url || '',
        cover_url: profile?.cover_url || '',
        bio: profile?.bio || '',
        website: profile?.website || '',
        github: profile?.github || '',
        linkedin: profile?.linkedin || '',
        twitter: profile?.twitter || '',
        pronouns: profile?.pronouns || '',
        location: profile?.location || '',
    });

    const [updating, setUpdating] = useState(false);
    const [savedPosts, setSavedPosts] = useState<Array<{ post_slug: string; post_title: string | null; saved_at: string }>>([]);
    const [savedPostsLoading, setSavedPostsLoading] = useState(false);

    const normalizedUsername = useMemo(() => (form.username || profile?.username || '').trim(), [form.username, profile?.username]);
    const publicProfilePath = normalizedUsername ? `/profile/${encodeURIComponent(normalizedUsername)}` : '/profile';

    useEffect(() => {
        setForm({
            username: profile?.username || '',
            avatar_url: profile?.avatar_url || '',
            cover_url: profile?.cover_url || '',
            bio: profile?.bio || '',
            website: profile?.website || '',
            github: profile?.github || '',
            linkedin: profile?.linkedin || '',
            twitter: profile?.twitter || '',
            pronouns: profile?.pronouns || '',
            location: profile?.location || '',
        });
    }, [profile]);

    const toPostPath = (slug: string) => {
        const normalized = (slug || '').trim().replace(/\/+$/, '')
        if (!normalized) return '/posts'
        if (normalized.startsWith('/posts/') || normalized.startsWith('/blog/')) return normalized
        if (normalized.startsWith('/')) return `/posts${normalized}`.replace(/\/+/g, '/')
        return `/posts/${normalized}`
    }

    React.useEffect(() => {
        const loadSavedPosts = async () => {
            if (!user?.id) return;

            setSavedPostsLoading(true);
            const { data, error } = await supabase
                .from('user_saved_posts')
                .select('post_slug, post_title, saved_at')
                .eq('user_id', user.id)
                .order('saved_at', { ascending: false });

            if (error) {
                addToast(error.message || 'failed to load saved posts', 'warning');
                setSavedPostsLoading(false);
                return;
            }

            setSavedPosts((data || []) as Array<{ post_slug: string; post_title: string | null; saved_at: string }>);
            setSavedPostsLoading(false);
        };

        loadSavedPosts();
    }, [addToast, user?.id]);

    const hasChanges =
        form.username !== (profile?.username || '') ||
        form.avatar_url !== (profile?.avatar_url || '') ||
        form.cover_url !== (profile?.cover_url || '') ||
        form.bio !== (profile?.bio || '') ||
        form.website !== (profile?.website || '') ||
        form.github !== (profile?.github || '') ||
        form.linkedin !== (profile?.linkedin || '') ||
        form.twitter !== (profile?.twitter || '') ||
        form.pronouns !== (profile?.pronouns || '') ||
        form.location !== (profile?.location || '');

    const handleCopyLink = async (path: string, label: string) => {
        if (typeof window === 'undefined') return;

        const url = `${window.location.origin}${path}`;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                addToast(`${label} link copied`, 'success');
                return;
            }

            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            addToast(`${label} link copied`, 'success');
        } catch {
            addToast(`failed to copy ${label} link`, 'error');
        }
    };

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        const success = await updateProfile(form);
        setUpdating(false);

        if (success) {
            addToast('profile updated successfully', 'success');
        } else {
            addToast('failed to update profile', 'error');
        }
    };

    if (!user) return null;

    const inputCls = 'flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0';
    const labelCls = 'w-20 shrink-0 text-xs lowercase opacity-40 select-none';
    const rowCls = 'flex items-center gap-4 px-4 py-3 border-b border-primary';
    const groupCls = 'px-4 pt-5 pb-1 text-[10px] font-black uppercase tracking-widest opacity-25';

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-accent text-primary">
            <form onSubmit={handleSave} className="mx-auto w-full max-w-xl py-2">

                {/* identity */}
                <div className={groupCls}>identity</div>

                <div className={rowCls}>
                    <span className={labelCls}>username</span>
                    <input
                        type="text"
                        value={form.username}
                        onChange={e => handleChange('username', e.target.value)}
                        placeholder="display name"
                        className={inputCls}
                    />
                </div>

                <div className={rowCls}>
                    <span className={labelCls}>avatar</span>
                    <input
                        type="text"
                        value={form.avatar_url}
                        onChange={e => handleChange('avatar_url', e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className={inputCls}
                    />
                    {form.avatar_url && (
                        <button type="button" onClick={() => handleChange('avatar_url', '')} className="shrink-0 text-xs opacity-30 hover:opacity-70 bg-transparent border-none cursor-pointer px-0">✕</button>
                    )}
                </div>

                <div className={rowCls}>
                    <span className={labelCls}>cover</span>
                    <input
                        type="text"
                        value={form.cover_url}
                        onChange={e => handleChange('cover_url', e.target.value)}
                        placeholder="https://example.com/cover.jpg"
                        className={inputCls}
                    />
                    {form.cover_url && (
                        <button type="button" onClick={() => handleChange('cover_url', '')} className="shrink-0 text-xs opacity-30 hover:opacity-70 bg-transparent border-none cursor-pointer px-0">✕</button>
                    )}
                </div>

                <div className="flex items-start gap-4 px-4 py-3 border-b border-primary">
                    <span className={`${labelCls} pt-0.5`}>bio</span>
                    <textarea
                        value={form.bio}
                        onChange={e => handleChange('bio', e.target.value)}
                        placeholder="tell the community what you build, write, or care about"
                        rows={3}
                        className={`${inputCls} resize-none leading-relaxed`}
                    />
                </div>

                {/* details */}
                <div className={groupCls}>details</div>

                <div className={rowCls}>
                    <span className={labelCls}>pronouns</span>
                    <input
                        type="text"
                        value={form.pronouns}
                        onChange={e => handleChange('pronouns', e.target.value)}
                        placeholder="she/her"
                        className={inputCls}
                    />
                </div>

                <div className={rowCls}>
                    <span className={labelCls}>location</span>
                    <input
                        type="text"
                        value={form.location}
                        onChange={e => handleChange('location', e.target.value)}
                        placeholder="city, country"
                        className={inputCls}
                    />
                </div>

                {/* links */}
                <div className={groupCls}>links</div>

                {[
                    { key: 'website', label: 'website', placeholder: 'https://your-site.com' },
                    { key: 'github', label: 'github', placeholder: 'https://github.com/username' },
                    { key: 'linkedin', label: 'linkedin', placeholder: 'https://linkedin.com/in/username' },
                    { key: 'twitter', label: 'twitter', placeholder: 'https://x.com/username' },
                ].map(({ key, label, placeholder }) => (
                    <div key={key} className={rowCls}>
                        <span className={labelCls}>{label}</span>
                        <input
                            type="text"
                            value={form[key as keyof typeof form]}
                            onChange={e => handleChange(key, e.target.value)}
                            placeholder={placeholder}
                            className={inputCls}
                        />
                    </div>
                ))}

                {/* presence */}
                <div className={groupCls}>presence</div>

                <div className={rowCls}>
                    <span className={labelCls}>profile</span>
                    <span className="flex-1 min-w-0 text-sm opacity-50 truncate">{publicProfilePath}</span>
                    <div className="flex gap-1 shrink-0">
                        <OSButton type="button" size="sm" disabled={!normalizedUsername} onClick={() => addWindow({ key: `public-profile-${normalizedUsername}`, path: publicProfilePath, title: `${normalizedUsername}'s profile` })}>open</OSButton>
                        <OSButton type="button" size="sm" disabled={!normalizedUsername} onClick={() => handleCopyLink(publicProfilePath, 'profile')}>copy</OSButton>
                    </div>
                </div>

                <div className={rowCls}>
                    <span className={labelCls}>my profile</span>
                    <span className="flex-1 min-w-0 text-sm opacity-50 truncate">{publicProfilePath}</span>
                    <div className="flex gap-1 shrink-0">
                        <OSButton type="button" size="sm" disabled={!normalizedUsername} onClick={() => addWindow({ key: `profile-${normalizedUsername}`, path: publicProfilePath, title: `${normalizedUsername}'s profile` })}>open</OSButton>
                        <OSButton type="button" size="sm" disabled={!normalizedUsername} onClick={() => handleCopyLink(publicProfilePath, 'profile')}>copy</OSButton>
                    </div>
                </div>

                {/* saved posts */}
                <div className={groupCls}>
                    <IconBookmark className="inline size-3 mr-1 opacity-60" />
                    saved — {savedPosts.length}
                </div>

                {savedPostsLoading ? (
                    <div className={rowCls}><span className="text-sm opacity-40">loading...</span></div>
                ) : savedPosts.length === 0 ? (
                    <div className={rowCls}><span className="text-sm opacity-40">no saved posts yet</span></div>
                ) : savedPosts.map((post) => (
                    <div key={post.post_slug} className={rowCls}>
                        <button
                            type="button"
                            className="flex-1 min-w-0 bg-transparent border-none p-0 text-sm text-left text-primary cursor-pointer hover:underline truncate"
                            onClick={() => addWindow({ key: `post-${post.post_slug}`, path: toPostPath(post.post_slug), title: post.post_title || post.post_slug })}
                        >
                            {post.post_title || post.post_slug}
                        </button>
                        <span className="shrink-0 text-xs opacity-30">{new Date(post.saved_at).toLocaleDateString('en-US')}</span>
                    </div>
                ))}

                {/* actions */}
                <div className="flex items-center justify-between gap-3 px-4 py-5">
                    <div className="flex items-center gap-1.5 text-xs opacity-40">
                        <IconBolt className="size-3" />
                        use full URLs (https://...)
                    </div>
                    <div className="flex items-center gap-2">
                        <OSButton type="button" variant="underlineOnHover" size="md" onClick={() => signOut()}>sign out</OSButton>
                        <OSButton type="submit" variant="primary" size="md" disabled={updating || !hasChanges}>
                            {updating ? 'saving...' : 'save changes'}
                        </OSButton>
                    </div>
                </div>

            </form>
        </div>
    );
}
