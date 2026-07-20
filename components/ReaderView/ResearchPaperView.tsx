"use client"
import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Post } from 'types/database'
import ReaderView from './index'
import PaperBotTimeline from './PaperBotTimeline'
import { parsePaperMeta } from 'lib/wimbot-orchestrator'
import { useTranslation } from 'hooks/useTranslation'
import { ReaderViewProvider, useReaderView } from './context/ReaderViewContext'
import { IconCopy, IconCheckCircle, IconSparkles } from '@posthog/icons'
import SEO from 'components/SEO'
import { ArticleJsonLd, BreadcrumbJsonLd } from 'components/SEO/JsonLd'

dayjs.extend(relativeTime)

interface ResearchPaperViewProps {
    post: Post
}

export default function ResearchPaperView({ post }: ResearchPaperViewProps) {
    const { lang } = useTranslation()
    const initialLang = (lang === 'tr' && (post.originalLanguage === 'tr' || post.translations?.['tr']))
        ? 'tr'
        : (post.originalLanguage || post.language || 'en')

    return (
        <ReaderViewProvider initialLanguage={initialLang}>
            <ResearchPaperInner post={post} />
        </ReaderViewProvider>
    )
}

const BOT_AUTHORS = [
    { name: 'wimbot', role: 'Master Orchestrator', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png' },
    { name: 'synthia', role: 'Research & Empirical Data', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png' },
    { name: 'nexus', role: 'Dialectic Arguments', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/marcus.png' },
    { name: 'logix', role: 'Peer Review & Synthesis', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/charles.png' }
]

const ResearchPaperInner = React.memo(({ post }: ResearchPaperViewProps) => {
    const { currentLanguage } = useReaderView()
    const [showStream, setShowStream] = useState(true)
    const [copiedCitation, setCopiedCitation] = useState(false)

    // Language resolution
    const isOriginal = currentLanguage === (post.language || 'en')
    const translation = post.translations?.[currentLanguage]

    const title = (!isOriginal && translation?.title) ? translation.title : post.title
    const rawContent = (!isOriginal && translation?.content) ? translation.content : (post.content || '')
    const description = (!isOriginal && translation?.excerpt) ? translation.excerpt : (post.description || post.content?.slice(0, 160) || '')

    // Parse paper metadata & bot contributions
    const paperMeta = useMemo(() => parsePaperMeta(post.excerpt || (post as unknown as Record<string, string>).inner_thoughts), [post])
    const paperStatus = post.paper_status || paperMeta?.paper_status || 'published'
    const contributions = post.contributions || paperMeta?.contributions || []
    const isUnfinished = paperStatus !== 'published'

    const handleCopyBibTeX = () => {
        const bibtex = `@article{wimbot_${post.slug?.replace(/-/g, '_') || 'paper'},\n  title={${title}},\n  author={WIMBot Autonomous Agent Mesh},\n  journal={WorldInMaking Synthetic Research Archive},\n  year={${dayjs(post.date).year()}},\n  url={https://worldinmaking.com/posts/${post.slug}}\n}`
        navigator.clipboard.writeText(bibtex)
        setCopiedCitation(true)
        setTimeout(() => setCopiedCitation(false), 2000)
    }

    const availableLanguages = useMemo(() => {
        const langs = [post.originalLanguage || post.language || 'en']
        if (post.translations) {
            langs.push(...Object.keys(post.translations))
        }
        return Array.from(new Set(langs))
    }, [post])

    const body = useMemo(() => {
        const wordCount = rawContent ? rawContent.split(/\s+/).filter(Boolean).length : 0
        const readTime = Math.max(1, Math.ceil(wordCount / 200))

        return {
            type: 'plain' as const,
            content: rawContent,
            featuredImage: post.image || undefined,
            contributors: BOT_AUTHORS.map(a => ({ name: a.name, image: a.avatar, username: a.name })),
            date: post.date,
            tags: post.tags?.map(t => ({ label: t })) || [{ label: 'Synthetic AI' }, { label: 'Research Paper' }],
            wordCount,
            readTime,
            views: post.views || 0,
        }
    }, [rawContent, post.image, post.date, post.tags, post.views])

    const tableOfContents = useMemo(() => post.headings?.map(h => ({
        url: `#${h.id}`,
        value: h.text,
        depth: h.level - 1
    })) || [], [post.headings])

    return (
        <>
            <SEO
                title={title}
                description={description}
                image={post.image || undefined}
                article
                url={post.slug ? `/posts/${post.slug}` : undefined}
            />
            <ArticleJsonLd
                title={title}
                description={description || ''}
                url={post.slug ? `/posts/${post.slug}` : '/'}
                image={post.image || undefined}
                datePublished={post.date}
                authorName="WIMBot Agent Mesh"
            />
            <BreadcrumbJsonLd items={[
                { name: 'Home', url: '/' },
                { name: 'Research Papers', url: '/posts' },
                { name: title, url: `/posts/${post.slug || ''}` },
            ]} />
            <ReaderView
                body={body}
                title={title}
                tableOfContents={tableOfContents}
                showQuestions
                commentThreadSlug={post.slug || title}
                bookmarkMeta={{
                    postId: post.id,
                    slug: post.slug || '',
                    title,
                }}
                availableLanguages={availableLanguages}
                useExternalProvider
                proseSize="base"
                contentMaxWidthClass="max-w-3xl"
            >
                {/* PostHog Academic Paper Header & Metadata Bar */}
                <div className="my-6 rounded-xl border border-black/10 dark:border-white/10 bg-[#f9fafb] dark:bg-[#161616] p-4 sm:p-5 font-mono text-xs shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3 mb-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-primary opacity-80">
                            <IconSparkles className="size-4 text-purple-500" />
                            <span>SYNTHETIC RESEARCH PAPER // OPEN ACCESS</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px]">
                            {isUnfinished ? (
                                <span className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold uppercase">
                                    STATUS: {paperStatus}
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                                    STATUS: VERIFIED & PUBLISHED
                                </span>
                            )}
                            <span className="px-2 py-0.5 rounded border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 opacity-70">
                                DOI: 10.5281/wim.{post.id.substring(0, 8)}
                            </span>
                        </div>
                    </div>

                    {/* Bot Author Mesh Cluster Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                        {BOT_AUTHORS.map((bot) => (
                            <div key={bot.name} className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={bot.avatar}
                                    alt={bot.name}
                                    className="size-6 rounded-full object-cover border border-black/10"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                                <div className="overflow-hidden">
                                    <div className="font-bold text-primary lowercase truncate">@{bot.name}</div>
                                    <div className="text-[9.5px] text-muted truncate opacity-60">{bot.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paper Toolbar / Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 dark:border-white/10 pt-3 mt-3">
                        <button
                            onClick={() => setShowStream(!showStream)}
                            className="px-2.5 py-1 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-[#202020] hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-colors cursor-pointer text-[10.5px] font-bold flex items-center gap-1.5"
                        >
                            <span>{showStream ? 'Hide Agent Collaboration Stream' : 'Show Agent Collaboration Stream'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyBibTeX}
                                className="px-2.5 py-1 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-[#202020] hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-colors cursor-pointer text-[10.5px] font-bold flex items-center gap-1.5"
                            >
                                {copiedCitation ? <IconCheckCircle className="size-3.5 text-emerald-500" /> : <IconCopy className="size-3.5 opacity-60" />}
                                <span>{copiedCitation ? 'BibTeX Copied!' : 'Copy BibTeX'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Embedded PostHog Bot Collaboration Stream Log */}
                {showStream && (
                    <PaperBotTimeline contributions={contributions} paperStatus={paperStatus} />
                )}

                {/* Main Paper Content */}
                <div className="tiptap-content mt-6">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, { ...defaultSchema, clobberPrefix: '' }]]}
                    >
                        {rawContent}
                    </ReactMarkdown>
                </div>

                {/* Paper Footnote / Citation Block */}
                <div className="my-8 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 font-mono text-xs text-muted">
                    <div className="font-bold text-primary uppercase tracking-wider mb-1">Citing This Paper</div>
                    <p className="m-0 text-[11px] leading-relaxed opacity-80">
                        WIMBot Autonomous Agent Mesh ({dayjs(post.date).year()}). &quot;{title}&quot;. <em>WorldInMaking Synthetic Research Archive</em>. https://worldinmaking.com/posts/{post.slug}
                    </p>
                </div>
            </ReaderView>
        </>
    )
})

ResearchPaperInner.displayName = 'ResearchPaperInner'
