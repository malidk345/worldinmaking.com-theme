"use client"

import React, { useMemo, useRef, useEffect } from 'react'
import ReaderView from './index'
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

    const body = useMemo(() => {
        const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));

        return {
            type: 'plain' as const,
            content: content || '',
            featuredImage: post.image || undefined,
            contributors: post.authors?.map(a => ({ name: a.name, image: a.avatar, username: a.username || a.name })) || [],
            date: post.date,
            tags: post.tags?.map(t => ({ label: t })),
            wordCount,
            readTime,
            views: post.views || 0,
        };
    }, [content, post.image, post.authors, post.date, post.tags, post.views]);

    const tableOfContents = useMemo(() => post.headings?.map(h => ({
        url: `#${h.id}`,
        value: h.text,
        depth: h.level - 1
    })) || [], [post.headings]);

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

    const availableLanguages = useMemo(() => {
        const langs = [post.originalLanguage || post.language || 'en']
        if (post.translations) {
            langs.push(...Object.keys(post.translations))
        }
        return Array.from(new Set(langs))
    }, [post])

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
                authorName={post.authors?.[0]?.name || 'World in Making'}
                authorUrl={post.authors?.[0]?.username ? `/profile/${post.authors[0].username}` : undefined}
            />
            <BreadcrumbJsonLd items={[
                { name: 'Home', url: '/' },
                { name: 'Posts', url: '/posts' },
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
                <div className="LemonMarkdown tiptap-content mt-6">
                    {isRichTextHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: sanitizedProcessedContent }} />
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, customSanitizeSchema]]}
                            components={{
                                img: ({ src, alt, title }: { src?: string; alt?: string; title?: string }) => {
                                    let finalSrc = src || '';
                                    const altText = alt || '';

                                    if (altText.startsWith('illustration:')) {
                                        const query = altText.replace('illustration:', '').trim();
                                        const imageUrl = finalSrc || `https://loremflickr.com/800/400/${encodeURIComponent(query.replace(/\s+/g, ','))}`;
                                        return (
                                            <figure className="my-10 overflow-hidden rounded-[24px] bg-primary/5 border border-primary/10 shadow-lg relative group">
                                                <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
                                                <CloudinaryImage
                                                    src={imageUrl}
                                                    alt={altText}
                                                    title={title}
                                                    className="w-full aspect-video hover:scale-105 transition-transform duration-700 ease-out"
                                                    imgClassName="object-cover w-full h-auto"
                                                    width={1200}
                                                    height={675}
                                                    priority={false}
                                                />
                                                <figcaption className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-20">
                                                    <div className="text-[10px] font-mono text-white/90 text-center lowercase tracking-wider">
                                                        ⌁ {query} ⌁
                                                    </div>
                                                </figcaption>
                                            </figure>
                                        );
                                    }

                                    if (finalSrc.startsWith('/storage/v1/object/public/')) {
                                        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') || '';
                                        // Replace '/public/' with '/render/image/public/' and append transformation params
                                        finalSrc = `${baseUrl}${finalSrc}`.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
                                        finalSrc += '?width=1200&quality=80&format=webp';
                                    }

                                    return (
                                        <CloudinaryImage
                                            src={finalSrc}
                                            alt={altText || 'Blog post image'}
                                            title={title}
                                                className="my-10 rounded-[18px] md:rounded-[24px] border border-black/5 dark:border-white/5 shadow-lg overflow-hidden"
                                            imgClassName="object-contain w-full h-auto"
                                            width={1200}
                                            height={675}
                                            priority={false}
                                        />
                                    );
                                },
                                ...({
                                    query: ({ type, title }: { type?: string; title?: string }) => <QueryNode type={type} title={title} />,
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
                </div>
            </ReaderView>
        </>
    )
})

BlogPostInner.displayName = 'BlogPostInner'
