"use client";

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/App';
import {
    IconUser,
    IconGlobe,
    IconLock,
    IconMessage,
    IconBolt,
    IconBookmark
} from '@posthog/icons';
import Input from '../OSForm/input';
import Textarea from '../OSForm/textarea';
import OSButton from 'components/OSButton';

export default function ProfileContent() {
    const { user, profile, updateProfile, signOut } = useAuth();
    const { addToast } = useToast();
    const { addWindow } = useApp();

    const [form, setForm] = useState({
        username: profile?.username || '',
        avatar_url: profile?.avatar_url || '',
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
        form.bio !== (profile?.bio || '') ||
        form.website !== (profile?.website || '') ||
        form.github !== (profile?.github || '') ||
        form.linkedin !== (profile?.linkedin || '') ||
        form.twitter !== (profile?.twitter || '') ||
        form.pronouns !== (profile?.pronouns || '') ||
        form.location !== (profile?.location || '');

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

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-accent p-5 md:p-6 text-primary">
            <div className="mx-auto w-full max-w-4xl space-y-5">
                <section className="rounded border border-primary bg-primary p-4 md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-16 overflow-hidden rounded border border-primary bg-accent md:size-20">
                                {form.avatar_url ? (
                                    <img src={form.avatar_url} alt={form.username || 'avatar'} className="size-full object-cover" />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-secondary">
                                        <IconUser className="size-9" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="m-0 text-xl font-black lowercase md:text-2xl">{form.username || profile?.username || 'anonymous'}</h2>
                                <p className="m-0 text-sm text-secondary">{user.email}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold lowercase">
                                    <span className="rounded border border-primary bg-accent px-2 py-0.5">{profile?.role || 'member'}</span>
                                    {form.location && (
                                        <span className="rounded border border-primary bg-accent px-2 py-0.5">{form.location}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="rounded border border-primary bg-accent px-3 py-2 text-xs text-secondary">
                            profile is synced via Supabase
                        </div>
                    </div>
                </section>

                <form onSubmit={handleSave} className="space-y-5">
                    <section className="rounded border border-primary bg-primary">
                        <div className="flex items-center justify-between border-b border-primary px-4 py-3">
                            <h3 className="m-0 text-sm font-black lowercase">identity</h3>
                            <IconLock className="size-4 opacity-50" />
                        </div>
                        <div className="space-y-4 p-4 md:p-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Input
                                    label="username"
                                    direction="column"
                                    value={form.username}
                                    onChange={(e: any) => handleChange('username', e.target.value)}
                                    placeholder="choose a display name"
                                    description="visible across discussions and posts"
                                />
                                <Input
                                    label="avatar url"
                                    direction="column"
                                    value={form.avatar_url}
                                    onChange={(e: any) => handleChange('avatar_url', e.target.value)}
                                    placeholder="https://example.com/avatar.png"
                                    description="use a direct image URL"
                                    showClearButton
                                    onClear={() => handleChange('avatar_url', '')}
                                />
                            </div>
                            <Textarea
                                label="bio"
                                direction="column"
                                value={form.bio}
                                onChange={(e: any) => handleChange('bio', e.target.value)}
                                placeholder="tell the community what you build, write, or care about"
                                description="short and clear works best"
                                rows={4}
                            />
                        </div>
                    </section>

                    <section className="rounded border border-primary bg-primary">
                        <div className="flex items-center justify-between border-b border-primary px-4 py-3">
                            <h3 className="m-0 text-sm font-black lowercase">details</h3>
                            <IconMessage className="size-4 opacity-50" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-5">
                            <Input
                                label="pronouns"
                                direction="column"
                                value={form.pronouns}
                                onChange={(e: any) => handleChange('pronouns', e.target.value)}
                                placeholder="e.g. she/her"
                            />
                            <Input
                                label="location"
                                direction="column"
                                value={form.location}
                                onChange={(e: any) => handleChange('location', e.target.value)}
                                placeholder="city, country"
                            />
                        </div>
                    </section>

                    <section className="rounded border border-primary bg-primary">
                        <div className="flex items-center justify-between border-b border-primary px-4 py-3">
                            <h3 className="m-0 text-sm font-black lowercase">links</h3>
                            <IconGlobe className="size-4 opacity-50" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-5">
                            <Input
                                label="website"
                                direction="column"
                                value={form.website}
                                onChange={(e: any) => handleChange('website', e.target.value)}
                                placeholder="https://your-site.com"
                            />
                            <Input
                                label="github"
                                direction="column"
                                value={form.github}
                                onChange={(e: any) => handleChange('github', e.target.value)}
                                placeholder="https://github.com/username"
                            />
                            <Input
                                label="linkedin"
                                direction="column"
                                value={form.linkedin}
                                onChange={(e: any) => handleChange('linkedin', e.target.value)}
                                placeholder="https://linkedin.com/in/username"
                            />
                            <Input
                                label="twitter"
                                direction="column"
                                value={form.twitter}
                                onChange={(e: any) => handleChange('twitter', e.target.value)}
                                placeholder="https://x.com/username"
                            />
                        </div>
                    </section>

                    <section className="rounded border border-primary bg-primary p-4 md:p-5">
                        <h3 className="m-0 mb-3 flex items-center gap-2 text-sm font-black lowercase">
                            <IconBookmark className="size-4 opacity-50" /> saved posts
                        </h3>
                        {savedPostsLoading ? (
                            <p className="m-0 text-sm text-secondary lowercase">loading saved posts...</p>
                        ) : savedPosts.length === 0 ? (
                            <p className="m-0 text-sm text-secondary lowercase">you have not saved any posts yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {savedPosts.map((post) => (
                                    <div key={post.post_slug} className="flex items-center justify-between rounded border border-primary bg-accent px-3 py-2">
                                        <button
                                            type="button"
                                            className="bg-transparent border-none p-0 text-sm font-semibold text-primary cursor-pointer hover:underline"
                                            onClick={() => addWindow({
                                                key: `post-${post.post_slug}`,
                                                path: toPostPath(post.post_slug),
                                                title: post.post_title || post.post_slug,
                                                size: { width: 1000, height: 800 }
                                            })}
                                        >
                                            {post.post_title || post.post_slug}
                                        </button>
                                        <span className="text-xs text-secondary">{new Date(post.saved_at).toLocaleDateString('en-US')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded border border-primary bg-primary p-4 md:p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 text-xs text-secondary">
                                <IconBolt className="size-4" />
                                Keep profile URLs in full format (https://...) for best rendering.
                            </div>
                            <div className="flex items-center gap-2">
                                <OSButton type="button" variant="underlineOnHover" size="md" onClick={() => signOut()}>
                                    sign out
                                </OSButton>
                                <OSButton type="submit" variant="primary" size="md" disabled={updating || !hasChanges}>
                                    {updating ? 'saving...' : 'save changes'}
                                </OSButton>
                            </div>
                        </div>
                    </section>
                </form>
            </div>
        </div>
    );
}
