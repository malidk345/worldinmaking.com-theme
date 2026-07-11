"use client"

import React, { useEffect, useState } from 'react'
import { AppWindow } from 'context/Window'
import { useAuth } from 'context/AuthContext'
import { useToast } from 'context/ToastContext'
import { useTranslation } from 'hooks/useTranslation'
import { supabase } from 'lib/supabase'
import { toSlug } from 'utils/security'
import ForumAvatar from 'components/Forum/ForumAvatar'
import PostLexicalEditor from 'components/Forum/PostLexicalEditor'
import OSButton from 'components/OSButton'
import { PenTool, CheckCircle, Image as ImageIcon, Link as LinkIcon, Folder, Share, MoreHorizontal } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

interface PostEditorProps {
    postId?: string;
    item: AppWindow;
}

export default function PostEditor({ postId, item }: PostEditorProps) {
    const { user, profile, isAdmin } = useAuth()
    const { addToast } = useToast()
    const { t } = useTranslation()
    const [currentPostId, setCurrentPostId] = useState<string | undefined>(postId)
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [content, setContent] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [category, setCategory] = useState('')
    const [published, setPublished] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!currentPostId) return
        const load = async () => {
            const { data } = await supabase
                .from('posts')
                .select('id, title, slug, excerpt, content, image_url, published, category')
                .eq('id', currentPostId)
                .single()

            if (data) {
                setTitle(data.title || '')
                setSlug(data.slug || '')
                setExcerpt(data.excerpt || '')
                setContent(data.content || '')
                setImageUrl(data.image_url || '')
                setCategory(data.category || '')
                setPublished(Boolean(data.published))
            }
        }
        load()
    }, [currentPostId])

    const handleSavePost = async (nextPublished: boolean) => {
        if (!user || !profile?.username) {
            addToast(t('appwindow.login_required_posts'), 'error')
            return
        }

        const finalTitle = title.trim() || 'untitled post'
        const finalSlug = toSlug(slug || finalTitle)
        const finalExcerpt = (excerpt || content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)).trim()

        setSaving(true)

        const postPayload = {
            title: finalTitle,
            slug: finalSlug,
            content,
            excerpt: finalExcerpt || null,
            image_url: imageUrl || null,
            category: category || 'General',
            published: nextPublished,
            author: profile.username,
            author_avatar: profile.avatar_url || '',
            is_approved: isAdmin,
        }

        if (currentPostId) {
            const { error } = await supabase
                .from('posts')
                .update(postPayload)
                .eq('id', currentPostId)

            if (error) {
                addToast(`${t('appwindow.post_save_failed')}: ${error.message}`, 'error')
                setSaving(false)
                return
            }
        } else {
            const { data, error } = await supabase
                .from('posts')
                .insert(postPayload)
                .select('id')
                .single()

            if (error || !data) {
                addToast(`${t('appwindow.post_create_failed')}: ${error?.message || 'unknown error'}`, 'error')
                setSaving(false)
                return
            }

            setCurrentPostId(data.id as string)
        }

        setPublished(nextPublished)
        setSaved(true)
        addToast(nextPublished ? t('appwindow.post_published') : t('appwindow.draft_success'), 'success')
        setTimeout(() => setSaved(false), 2500)
        setSaving(false)
    }

    return (
        <div className="flex flex-col size-full overflow-hidden text-black bg-white dark:bg-[#1C1C1E] transition-colors duration-500">
            {/* Header (Top Bar) */}
            <aside className="sticky top-0 z-50 shrink-0 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#1C1C1E]/70 supports-[backdrop-filter]:backdrop-blur-xl">
                <div id={`window-inner-header-${item.key}`} className="pointer-events-auto h-0" />
                <div className="flex items-center justify-between px-4 py-2 mt-8 md:mt-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">
                            <div className="w-5 h-5 rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-sm shrink-0">
                                <ForumAvatar className="w-full h-full" image={profile?.avatar_url} />
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 lowercase pr-1">@{profile?.username || 'writer'}</span>
                        </div>
                        {saved && (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 lowercase animate-pulse">saved</span>
                        )}
                        {!saved && (
                            <span className="text-[10px] font-bold text-primary/40 lowercase flex items-center gap-1">
                                {published ? <CheckCircle className="size-3" /> : <PenTool className="size-3" />}
                                {published ? 'published' : 'draft'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <button className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-primary/60 hover:text-primary transition-colors">
                                    <MoreHorizontal className="size-4" />
                                </button>
                            </Popover.Trigger>
                            <Popover.Portal>
                                <Popover.Content
                                    className="z-[100] w-64 bg-white/90 dark:bg-[#2C2C2E]/90 supports-[backdrop-filter]:backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] shadow-2xl p-4 flex flex-col gap-4 animate-fade-in-up"
                                    sideOffset={8}
                                    align="end"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-primary/40 lowercase flex items-center gap-1.5"><LinkIcon className="size-3" /> Slug</label>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder="my-post-url"
                                            className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[12px] px-3 py-1.5 text-xs font-bold text-primary outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300 lowercase"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-primary/40 lowercase flex items-center gap-1.5"><Folder className="size-3" /> Category</label>
                                        <input
                                            type="text"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="technology"
                                            className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[12px] px-3 py-1.5 text-xs font-bold text-primary outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300 lowercase"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-primary/40 lowercase flex items-center gap-1.5"><ImageIcon className="size-3" /> Cover Image URL</label>
                                        <input
                                            type="text"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value.trim())}
                                            placeholder="https://images.unsplash.com/..."
                                            className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[12px] px-3 py-1.5 text-xs font-bold text-primary outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300"
                                        />
                                    </div>
                                </Popover.Content>
                            </Popover.Portal>
                        </Popover.Root>

                        <OSButton
                            size="sm"
                            variant="primary"
                            disabled={saving}
                            onClick={() => handleSavePost(true)}
                            className="!rounded-full px-4"
                        >
                            <span className="lowercase font-bold">{saving ? t('appwindow.publishing') : t('appwindow.publish')}</span>
                        </OSButton>
                    </div>
                </div>
            </aside>

            {/* Document Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative w-full flex flex-col items-center">

                {/* Cover Image */}
                {imageUrl && (
                    <div className="relative w-full h-48 sm:h-64 group bg-black/5 dark:bg-white/5 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setImageUrl('')}
                            className="absolute top-4 right-4 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 supports-[backdrop-filter]:backdrop-blur-md font-bold lowercase hover:bg-black/60 shadow-lg border border-white/20"
                        >
                            remove cover
                        </button>
                    </div>
                )}

                <div className={`w-full max-w-[800px] px-6 sm:px-12 flex-1 flex flex-col min-h-0 pb-24 ${imageUrl ? 'pt-10' : 'pt-16 sm:pt-24'}`}>

                    {/* Add Cover Button (if no cover) */}
                    {!imageUrl && (
                        <div className="mb-4 -ml-2">
                            <Popover.Root>
                                <Popover.Trigger asChild>
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-primary/40 hover:bg-black/5 dark:hover:bg-white/5 hover:text-primary transition-all duration-200">
                                        <ImageIcon className="size-4" />
                                        <span className="text-[12px] font-bold lowercase">add cover</span>
                                    </button>
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content
                                        className="z-[100] w-72 bg-white/90 dark:bg-[#2C2C2E]/90 supports-[backdrop-filter]:backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[20px] shadow-2xl p-4 flex flex-col gap-3 animate-fade-in-up"
                                        sideOffset={8}
                                        align="start"
                                    >
                                        <label className="text-[10px] font-bold text-primary/50 lowercase">image url</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value.trim())}
                                                placeholder="https://..."
                                                className="flex-1 bg-black/5 dark:bg-white/5 border border-transparent rounded-full px-3 py-1.5 text-xs font-bold text-primary outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 transition-all duration-300"
                                            />
                                        </div>
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                        </div>
                    )}

                    {/* Title */}
                    <div className="mb-4">
                        <textarea
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value)
                                if (!currentPostId) setSlug(toSlug(e.target.value))
                            }}
                            placeholder="untitled post"
                            className="w-full bg-transparent border-none p-0 text-3xl sm:text-5xl text-primary font-black outline-none placeholder:text-primary/20 resize-none overflow-hidden break-words leading-[1.1] tracking-tight lowercase min-h-[1.2em]"
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                            }}
                        />
                    </div>

                    {/* Excerpt */}
                    <div className="mb-8 pl-1 border-l-2 border-black/10 dark:border-white/10">
                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="Add a brief subtitle or excerpt..."
                            className="w-full bg-transparent border-none p-0 pl-3 text-lg text-primary/60 font-medium outline-none placeholder:text-primary/30 resize-none overflow-hidden break-words leading-relaxed lowercase"
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                            }}
                        />
                    </div>

                    {/* Editor */}
                    <div className="flex-1 w-full relative min-h-[400px]">
                        {/* We use PostLexicalEditor but make it completely borderless and seamless */}
                        <div className="absolute inset-0 w-full h-full [&>div]:h-full [&>div>div]:border-none [&>div>div]:shadow-none [&>div>div]:bg-transparent [&>div>div>div:first-child]:rounded-[16px] [&>div>div>div:first-child]:shadow-sm [&>div>div>div:first-child]:border [&>div>div>div:first-child]:border-black/5 dark:[&>div>div>div:first-child]:border-white/5 [&>div>div>div:first-child]:mb-6">
                            <PostLexicalEditor
                                initialValue={content}
                                onChange={(val: string) => setContent(val)}
                                placeholder="start typing your story here..."
                                className="!bg-transparent !border-none !shadow-none h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Footer (Optional if needed, but keeping it clean without might be better. Will just add auto-save indicator) */}
            <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#1C1C1E]/50 supports-[backdrop-filter]:backdrop-blur-xl">
                <p className="text-[10px] opacity-40 [text-wrap:balance] text-primary lowercase font-medium tracking-wide">
                    auto-saved to local drafts.
                </p>
                <div className="flex items-center gap-2">
                    <OSButton
                        size="sm"
                        variant="default"
                        onClick={() => handleSavePost(false)}
                        disabled={saving}
                        className="opacity-70 hover:opacity-100 !rounded-full px-4"
                    >
                        <span className="lowercase font-bold">{t('appwindow.save_draft')}</span>
                    </OSButton>
                </div>
            </div>
        </div>
    )
}
