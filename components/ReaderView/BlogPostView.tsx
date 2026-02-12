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
    }
}

export default function BlogPostView({ post }: BlogPostViewProps) {
    // Detect if content is HTML from Tiptap or raw Markdown
    const isHtml = post.content?.trim().startsWith('<');

    const body = {
        type: 'plain' as const,
        content: post.content || '',
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
        if (!isHtml) return post.content;

        let html = post.content;
        // Find <h2>, <h3>, <h4> tags and add id attribute
        return html.replace(/<h([1234])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, content) => {
            // Only add ID if not already there
            if (attrs.includes('id=')) return match;

            const text = content.replace(/<[^>]*>/g, '').trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
        });
    }, [post.content, isHtml]);

    return (
        <ReaderView
            body={body}
            title={post.title}
            tableOfContents={tableOfContents}
            showQuestions
        >
            {isHtml ? (
                <div
                    className="tiptap-content"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                />
            ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content}
                </ReactMarkdown>
            )}
        </ReaderView>
    )
}
