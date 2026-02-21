"use client"

import React, { useMemo } from 'react'
import ReaderView from './index'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ReaderViewProvider, useReaderView } from './context/ReaderViewContext'
import SEO from 'components/SEO'
import rehypeRaw from 'rehype-raw'
import CloudinaryImage from 'components/CloudinaryImage'
import { ArticleJsonLd, BreadcrumbJsonLd } from 'components/SEO/JsonLd'

interface BlogPostViewProps {
    post: {
        id: string
        title: string
        date: string
        authors: { name: string, avatar: string, username?: string }[]
        image: string | null
        content: string
        tags?: string[]
        headings: { id: string, text: string, level: number }[]
        translations?: Record<string, { title: string, content: string, excerpt?: string }>
        language?: string
        description?: string
        slug?: string
    }
}

const BlogPostView = React.memo(({ post }: BlogPostViewProps) => {
    return (
        <ReaderViewProvider initialLanguage={post.language || 'en'}>
            <BlogPostInner post={post} />
        </ReaderViewProvider>
    )
})

BlogPostView.displayName = 'BlogPostView'

export default BlogPostView

const BlogPostInner = React.memo(({ post }: BlogPostViewProps) => {
    const { currentLanguage } = useReaderView()

    // Get content based on current language
    const isOriginal = currentLanguage === (post.language || 'en')
    const translation = post.translations?.[currentLanguage]

    const title = (!isOriginal && translation?.title) ? translation.title : post.title
    const content = (!isOriginal && translation?.content) ? translation.content : post.content
    const description = (!isOriginal && translation?.excerpt) ? translation.excerpt : (post.description || post.content.slice(0, 160))

    const body = useMemo(() => ({
        type: 'plain' as const,
        content: content || '',
        featuredImage: post.image || undefined,
        contributors: post.authors?.map(a => ({ name: a.name, image: a.avatar, username: a.username || a.name })) || [],
        date: post.date,
        tags: post.tags?.map(t => ({ label: t }))
    }), [content, post.image, post.authors, post.date, post.tags]);

    const tableOfContents = useMemo(() => post.headings?.map(h => ({
        url: `#${h.id}`,
        value: h.text,
        depth: h.level - 1
    })) || [], [post.headings]);

    // Normalize HTML content and inject IDs into headings for TOC linking
    const processedContent = useMemo(() => {
        if (typeof window === 'undefined') return content;

        try {
            const parser = new DOMParser()
            const doc = parser.parseFromString(content, 'text/html')

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

            return doc.body.innerHTML
        } catch {
            return content
        }
    }, [content]);

    const availableLanguages = useMemo(() => {
        const langs = [post.language || 'en']
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
            >
                <div className="tiptap-content">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            img: ({ node, src, ...props }: any) => {
                                let finalSrc = src || '';
                                // If it's a relative Supabase path, make it absolute
                                if (finalSrc.startsWith('/storage/v1/object/public/')) {
                                    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') || '';
                                    finalSrc = `${baseUrl}${finalSrc}`;
                                }

                                return (
                                    <CloudinaryImage
                                        src={finalSrc}
                                        alt={props.alt || ''}
                                        title={props.title}
                                        className="my-10 rounded-xl border border-primary shadow-lg overflow-hidden"
                                        imgClassName="object-contain w-full h-auto"
                                        width={1200}
                                        height={675}
                                        priority={false}
                                    />
                                );
                            }
                        }}
                    >
                        {processedContent}
                    </ReactMarkdown>
                </div>
            </ReaderView>
        </>
    )
})

BlogPostInner.displayName = 'BlogPostInner'
