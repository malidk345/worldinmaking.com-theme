import React, { useState, useEffect } from 'react'
import { useAuth } from 'context/AuthContext'
import { useToast } from 'context/ToastContext'
import { useTranslation } from 'hooks/useTranslation'
import { supabase } from 'lib/supabase'
import { toSlug } from 'utils/security'
import { AppWindow } from 'context/Window'
import ForumAvatar from 'components/Forum/ForumAvatar'
import PostLexicalEditor from 'components/Forum/PostLexicalEditor'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import { IconCheckCircle, IconExternal, IconFolder, IconGear, IconImage, IconPencil } from '@posthog/icons';

export default function PostEditor({ postId, item }: { postId?: string, item: AppWindow }) {
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
    const [settingsOpen, setSettingsOpen] = useState(false)

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
        setSettingsOpen(false)
    }

    return (
        <div className="flex flex-col size-full overflow-hidden text-black bg-white dark:bg-[#1C1C1E] transition-colors duration-500">
            <aside className="sticky top-0 z-50 shrink-0">
                <div id={`window-inner-header-${item.key}`} className="pointer-events-auto" />
            </aside>
            <div className="flex-col relative w-full flex-1 flex min-h-0">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/5 dark:border-white/5 shrink-0 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-sm shrink-0">
                            <ForumAvatar className="w-full h-full" image={profile?.avatar_url} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-primary lowercase">@{profile?.username || 'writer'}</span>
                            <span className="text-[10px] font-medium text-primary/50 lowercase">
                                {saved ? 'saved just now' : (currentPostId ? 'editing post' : 'new post')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover
                            open={settingsOpen}
                            onOpenChange={setSettingsOpen}
                            dataScheme="light" // Using light scheme as it uses Tailwind for dark mode
                            sideOffset={8}
                            align="end"
                            className="outline-none"
                            contentClassName="w-[300px] bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-xl text-primary"
                            trigger={
                                <button
                                    className={`p-2 rounded-full transition-all duration-200 outline-none
                                        ${settingsOpen
                                            ? 'bg-black/10 dark:bg-white/10 text-primary'
                                            : 'text-primary/60 hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    <IconGear className="size-4" />
                                </button>
                            }
                        >
                            <div className="flex flex-col gap-4 lowercase">
                                <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                                    <IconGear className="size-4 opacity-50" />
                                    <span className="text-xs font-bold">post properties</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {/* Status Toggle */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-primary/40">status</span>
                                        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => setPublished(false)}
                                                className={`flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center justify-center gap-1.5
                                                    ${!published
                                                        ? 'bg-white dark:bg-[#1C1C1E] text-primary shadow-sm border border-black/5 dark:border-white/5'
                                                        : 'text-primary/40 hover:text-primary'}`}
                                            >
                                                <IconPencil className="size-3" />
                                                draft
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPublished(true)}
                                                className={`flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center justify-center gap-1.5
                                                    ${published
                                                        ? 'bg-white dark:bg-[#1C1C1E] text-emerald-600 shadow-sm border border-black/5 dark:border-white/5'
                                                        : 'text-primary/40 hover:text-primary'}`}
                                            >
                                                <IconCheckCircle className="size-3" />
                                                published
                                            </button>
                                        </div>
                                    </div>

                                    {/* URL Slug */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-primary/40 flex items-center gap-1">
                                            <IconExternal className="size-3" /> slug
                                        </span>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(toSlug(e.target.value))}
                                            placeholder="my-post-url"
                                            className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-primary outline-none placeholder:text-primary/30 focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-black/10 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-primary/40 flex items-center gap-1">
                                            <IconFolder className="size-3" /> category
                                        </span>
                                        <input
                                            type="text"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="e.g. technology"
                                            className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-primary outline-none placeholder:text-primary/30 focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-black/10 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300"
                                        />
                                    </div>

                                    {/* Cover Image */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-primary/40 flex items-center gap-1">
                                            <IconImage className="size-3" /> cover image url
                                        </span>
                                        <input
                                            type="text"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value.trim())}
                                            placeholder="https://images.unsplash.com/..."
                                            className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-primary outline-none placeholder:text-primary/30 focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-black/10 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Popover>

                        <OSButton
                            size="sm"
                            variant="primary"
                            disabled={saving || !title.trim()}
                            onClick={() => handleSavePost(published)}
                            className="rounded-full px-4 h-8"
                        >
                            <span className="lowercase font-bold text-xs">{saving ? 'saving...' : 'save'}</span>
                        </OSButton>
                    </div>
                </div>

                {/* Main Editor Content */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
                    <div className="w-full max-w-3xl mx-auto px-5 sm:px-7 pt-6 sm:pt-10 flex flex-col gap-2 shrink-0">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value)
                                if (!currentPostId) setSlug(toSlug(e.target.value))
                            }}
                            placeholder="Post Title"
                            className="w-full bg-transparent border-none px-0 py-0 text-3xl sm:text-4xl text-primary font-black outline-none placeholder:text-primary/20 tracking-tight"
                        />
                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="Add a brief excerpt or subtitle..."
                            className="w-full bg-transparent border-none px-0 py-2 text-sm sm:text-base text-primary/60 outline-none placeholder:text-primary/30 resize-none lowercase"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                    </div>

                    <div className="flex-1 max-w-3xl w-full mx-auto pb-20">
                        <PostLexicalEditor
                            initialValue={content}
                            onChange={(val: string) => setContent(val)}
                            placeholder="start typing your story here..."
                            className="!border-none !shadow-none !bg-transparent !rounded-none flex-1 min-h-[500px]"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
