"use client"

import React, { useMemo } from 'react'
import ReaderView from './index'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface BlogPostViewProps {
    post: {
        id: string
        title: string
        date: string
        authors: { name: string, avatar: string }[]
        image: string | null
        content: string
        tags?: string[]
        headings: { id: string, text: string, level: number }[]
        translations?: Record<string, { title: string, content: string }>
        language?: string
    }
}

export default function BlogPostView({ post }: BlogPostViewProps) {
    const currentLanguage = post.language || 'en'

    // Get content based on current language
    const translation = post.translations?.[currentLanguage]
    const title = translation?.title || post.title
    const content = translation?.content || post.content

    // Detect if content is HTML from Tiptap or raw Markdown
    const isHtml = content?.trim().startsWith('<');

    const body = {
        type: 'plain' as const,
        content: content || '',
        featuredImage: post.image || undefined,
        contributors: post.authors?.map(a => ({ name: a.name, image: a.avatar })) || [],
        date: post.date,
        tags: post.tags?.map(t => ({ label: t, url: '#' }))
    }

    const tableOfContents = post.headings?.map(h => ({
        url: `#${h.id}`,
        value: h.text,
        depth: h.level - 1
    })) || []

    // Inject IDs into headings if HTML content for TOC linking
    const processedContent = useMemo(() => {
        if (!isHtml) return content;

        let html = content;
        // Find <h2>, <h3>, <h4> tags and add id attribute
        return html.replace(/<h([1234])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, content) => {
            // Only add ID if not already there
            if (attrs.includes('id=')) return match;

            const text = content.replace(/<[^>]*>/g, '').trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
        });
    }, [content, isHtml]);

    const availableLanguages = useMemo(() => {
        const langs = [post.language || 'en']
        if (post.translations) {
            langs.push(...Object.keys(post.translations))
        }
        return Array.from(new Set(langs))
    }, [post])

    return (
        <ReaderView
            body={body}
            title={title}
            tableOfContents={tableOfContents}
            showQuestions
            availableLanguages={availableLanguages}
        >
            {isHtml ? (
                <div
                    className="tiptap-content"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                />
            ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            )}
        </ReaderView>
    )
}
