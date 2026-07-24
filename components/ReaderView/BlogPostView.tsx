"use client"

import React, { useMemo, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ReaderViewProvider, useReaderView } from './context/ReaderViewContext'
import SEO from 'components/SEO'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { defaultSchema } from 'hast-util-sanitize'
import rehypeSlug from 'rehype-slug'
import CloudinaryImage from 'components/CloudinaryImage'
import { ArticleJsonLd, BreadcrumbJsonLd } from 'components/SEO/JsonLd'
import { sanitizeHtml } from 'utils/security'
import { useTranslation } from 'hooks/useTranslation'
import { QueryNode, SQLNode, PythonNode, FeatureFlagNode, ExperimentNode, CohortNode } from './PostHogNodes'

import ScrollArea from 'components/RadixUI/ScrollArea'
import ForumAvatar from 'components/Forum/ForumAvatar'
import ArticleActions from 'components/Community/ArticleActions'
import CommentSection from 'components/Community/CommentSection'
import { LemonCard, LemonTag } from 'components/LemonUI'
import { getProseClasses } from 'constants/index'

interface BlogPostViewProps {
    post: {
        id: string
        title: string
        date: string
        authors?: { name: string, avatar: string, username?: string }[]
        image: string | null
        content: string
        htmlContent?: string // Added for server-rendered HTML
        tags?: string[]
        headings: { id: string, text: string, level: number }[]
        translations?: Record<string, { title: string, content: string, excerpt?: string, slug?: string, htmlContent?: string }>
        language?: string
        originalLanguage?: string
        description?: string
        slug?: string
        views?: number
    }
}


const customSanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'query', 'sqlv2', 'pythonv2', 'featureflag', 'experiment', 'cohort'
    ],
    attributes: {
        ...defaultSchema.attributes,
        query: ['type', 'title', 'query'],
        sqlv2: ['code', 'nodeid'],
        pythonv2: ['code', 'nodeid'],
        featureflag: ['name', 'status'],
        experiment: ['name', 'status'],
        cohort: ['name', 'count']
    }
};

const BlogPostView = React.memo(({ post }: BlogPostViewProps) => {
    const { lang } = useTranslation()
    const initialLang = (lang === 'tr' && (post.originalLanguage === 'tr' || post.translations?.['tr'])) 
        ? 'tr' 
        : (post.originalLanguage || post.language || 'en')

    return (
        <ReaderViewProvider initialLanguage={initialLang}>
            <BlogPostInner post={post} />
        </ReaderViewProvider>
    )
})

BlogPostView.displayName = 'BlogPostView'

export default BlogPostView


const BlogPostInner = React.memo(({ post }: BlogPostViewProps) => {
    const { currentLanguage } = useReaderView()
    const prevLanguageRef = useRef(currentLanguage)

    useEffect(() => {
        // Only fire when language actually changes, not on other re-renders
        if (prevLanguageRef.current === currentLanguage) return
        prevLanguageRef.current = currentLanguage
        
        const rootLanguage = post.originalLanguage || post.language || 'en'
        let targetSlug = post.slug
        
        if (currentLanguage !== rootLanguage) {
            targetSlug = post.translations?.[currentLanguage]?.slug || post.slug
        }

        const newPath = `/posts/${targetSlug}`
        
        if (targetSlug && window.location.pathname !== newPath) {
            window.history.replaceState(null, '', newPath)
        }
    }, [currentLanguage, post])

    // Get content based on current language
    const isOriginal = currentLanguage === (post.language || 'en')
    const translation = post.translations?.[currentLanguage]

    const title = (!isOriginal && translation?.title) ? translation.title : post.title
    const content = (!isOriginal && translation?.content) ? translation.content : post.content
    const serverHtml = (!isOriginal && translation?.htmlContent) ? translation.htmlContent : (isOriginal ? post.htmlContent : null)
    
    const description = (!isOriginal && translation?.excerpt) ? translation.excerpt : (post.description || post.content.slice(0, 160))
    const isRichTextHtml = useMemo(() => serverHtml || /<\/?[a-z][\s\S]*>/i.test(content || ''), [content, serverHtml])

    const wordCount = useMemo(() => content ? content.split(/\s+/).filter(Boolean).length : 0, [content])
    const readTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 200)), [wordCount])
    const author = post.authors?.[0]

    // Normalize HTML content and inject IDs into headings for TOC linking
    const processedContent = useMemo(() => {
        const sourceContent = serverHtml || content;
        if (typeof window === 'undefined') return sourceContent;

        try {
            const parser = new DOMParser()
            const doc = parser.parseFromString(sourceContent, 'text/html')

            doc.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
                if (heading.id) return
                const text = (heading.textContent || '').trim()
                if (!text) return
                heading.id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            })

            const blockSelector = 'p,div,section,article,aside,header,footer,h1,h2,h3,h4,h5,h6,ul,ol,li,table,blockquote,pre,figure'

            doc.querySelectorAll('a').forEach((anchor) => {
                const href = (anchor.getAttribute('href') || '').trim()

                if (!href || href === '#') {
                    anchor.removeAttribute('href')
                }

                if (anchor.querySelector(blockSelector)) {
                    const parent = anchor.parentNode
                    if (!parent) return

                    while (anchor.firstChild) {
                        parent.insertBefore(anchor.firstChild, anchor)
                    }
                    parent.removeChild(anchor)
                }
            })

            doc.querySelectorAll('img').forEach((image) => {
                const src = (image.getAttribute('src') || '').trim()
                if (!src.startsWith('/storage/v1/object/public/')) return

                const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') || ''
                if (!baseUrl) return

                const renderUrl = src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
                image.setAttribute('src', `${baseUrl}${renderUrl}?width=1200&quality=80&format=webp`);

                if (!image.getAttribute('alt')) {
                    image.setAttribute('alt', 'Blog post image');
                }
            })

            return doc.body.innerHTML
        } catch {
            return sourceContent
        }
    }, [content, serverHtml]);

    const sanitizedProcessedContent = useMemo(() => sanitizeHtml(processedContent), [processedContent])

    return (
        <div className="size-full flex flex-col overflow-hidden bg-white dark:bg-[#121214]">
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
                authorName={author?.name || 'World in Making'}
                authorUrl={author?.username ? `/profile/${author.username}` : undefined}
            />
            <BreadcrumbJsonLd items={[
                { name: 'Home', url: '/' },
                { name: 'Posts', url: '/posts' },
                { name: title, url: `/posts/${post.slug || ''}` },
            ]} />

            <ScrollArea className="size-full">
                <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 md:px-8">

                    {/* Category badge + meta row */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <LemonTag type="highlight" className="!text-[10px] uppercase font-bold tracking-widest">
                            Blog
                        </LemonTag>
                        {post.date && (
                            <span className="text-xs text-[var(--color-posthog-3000-600)]">
                                {new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        )}
                        <span className="text-xs text-[var(--color-posthog-3000-600)]">· {readTime} min read</span>
                    </div>

                    {/* H1 Title */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.1] mb-4">
                        {title}
                    </h1>

                    {/* Excerpt */}
                    {description && (
                        <p className="text-lg text-[var(--color-posthog-3000-600)] leading-relaxed mb-8">
                            {description}
                        </p>
                    )}

                    {/* Author + tags + actions card */}
                    <LemonCard hoverEffect={false} className="mb-8 p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-posthog-3000-100)] dark:border-white/10">
                            {author ? (
                                <div className="flex items-center gap-2.5">
                                    <ForumAvatar className="size-8 rounded-full" image={author.avatar} />
                                    <div className="flex flex-col leading-none">
                                        <span className="text-sm font-bold text-primary">{author.name}</span>
                                        {author.username && (
                                            <span className="text-xs text-[var(--color-posthog-3000-600)] mt-0.5">@{author.username}</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs font-semibold text-[var(--color-posthog-3000-600)]">World in Making</span>
                            )}
                            {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {post.tags.map((tag, i) => (
                                        <LemonTag key={i} type="option" className="!text-[10px] uppercase font-semibold tracking-wider">
                                            {tag}
                                        </LemonTag>
                                    ))}
                                </div>
                            )}
                        </div>
                        <ArticleActions slug={post.slug || title} views={post.views} />
                    </LemonCard>

                    {/* Featured image */}
                    {post.image && (
                        <div className="mb-10 aspect-video rounded-[20px] overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={post.image} alt={title} className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Article body */}
                    <article className={`${getProseClasses('base')} max-w-none`}>
                        {isRichTextHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: sanitizedProcessedContent }} />
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, customSanitizeSchema]]}
                                components={{
                                    img: ({ src, alt, title: imgTitle }: { src?: string; alt?: string; title?: string }) => {
                                        let finalSrc = src || ''
                                        const altText = alt || ''
                                        if (altText.startsWith('illustration:')) {
                                            const query = altText.replace('illustration:', '').trim()
                                            const imageUrl = finalSrc || `https://loremflickr.com/800/400/${encodeURIComponent(query.replace(/\s+/g, ','))}`
                                            return (
                                                <figure className="my-8 overflow-hidden rounded-[20px] bg-primary/5 border border-primary/10 shadow-md relative group">
                                                    <CloudinaryImage src={imageUrl} alt={altText} title={imgTitle} className="w-full aspect-video hover:scale-105 transition-transform duration-700 ease-out" imgClassName="object-cover w-full h-auto" width={1200} height={675} priority={false} />
                                                    <figcaption className="p-2.5 bg-black/80 text-[11px] font-mono text-white/90 text-center lowercase tracking-wider">⌁ {query} ⌁</figcaption>
                                                </figure>
                                            )
                                        }
                                        if (finalSrc.startsWith('/storage/v1/object/public/')) {
                                            const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') || ''
                                            finalSrc = `${baseUrl}${finalSrc}`.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=1200&quality=80&format=webp'
                                        }
                                        return <CloudinaryImage src={finalSrc} alt={altText || 'Blog post image'} title={imgTitle} className="my-8 rounded-[16px] md:rounded-[20px] border border-black/10 dark:border-white/10 shadow-sm overflow-hidden" imgClassName="object-contain w-full h-auto" width={1200} height={675} priority={false} />
                                    },
                                    ...({  
                                        query: ({ type, title: qTitle }: { type?: string; title?: string }) => <QueryNode type={type} title={qTitle} />,
                                        sqlv2: ({ code, nodeid }: { code?: string; nodeid?: string }) => <SQLNode code={code} nodeId={nodeid} />,
                                        pythonv2: ({ code, nodeid }: { code?: string; nodeid?: string }) => <PythonNode code={code} nodeId={nodeid} />,
                                        featureflag: ({ name, status }: { name?: string; status?: string }) => <FeatureFlagNode name={name} status={status} />,
                                        experiment: ({ name, status }: { name?: string; status?: string }) => <ExperimentNode name={name} status={status} />,
                                        cohort: ({ name, count }: { name?: string; count?: string }) => <CohortNode name={name} count={count} />,
                                    } as unknown as Record<string, React.ElementType>)
                                }}
                            >
                                {processedContent}
                            </ReactMarkdown>
                        )}
                    </article>

                    {/* Author bio */}
                    {author && (
                        <LemonCard hoverEffect={false} className="mt-12 p-5 flex items-center gap-4 bg-[var(--color-posthog-3000-50)] dark:bg-white/5">
                            <ForumAvatar className="size-12 rounded-full shrink-0" image={author.avatar} />
                            <div>
                                <p className="text-sm font-bold text-primary">Written by {author.name}</p>
                                <p className="text-xs text-[var(--color-posthog-3000-600)] mt-1">Author at World in Making. Sharing thoughts, blueprints, and engineering insights.</p>
                            </div>
                        </LemonCard>
                    )}

                    {/* Comments */}
                    <div id="comments" className="mt-12 pt-8 border-t border-[var(--color-posthog-3000-100)] dark:border-white/10">
                        <CommentSection slug={post.slug || title} views={post.views} />
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
})

BlogPostInner.displayName = 'BlogPostInner'
