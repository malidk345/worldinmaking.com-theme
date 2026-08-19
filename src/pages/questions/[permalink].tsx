export const runtime = 'edge'

import React from 'react'
import type { GetServerSideProps } from 'next'
import Inbox from '../../components/Inbox'
import SEO from 'components/seo'
import {
    buildBreadcrumbJsonLd,
    buildDiscussionJsonLd,
    formatSeoDescription,
    pageCanonical,
} from 'lib/seo'
import { fetchSupabaseCommunityPosts } from 'lib/supabaseCommunity'

type QuestionSeo = {
    id: string
    title: string
    content: string
    created_at?: string
    author?: string
}

export const getServerSideProps: GetServerSideProps<{ permalink: string; question: QuestionSeo }> = async (ctx) => {
    const permalink = String(ctx.params?.permalink || '').trim()
    if (!/^\d+$/.test(permalink)) return { notFound: true }
    const rows = await fetchSupabaseCommunityPosts(undefined, permalink)
    const row = rows?.[0]
    if (!row || String(row.title || '').startsWith('comment_')) return { notFound: true }
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
        props: {
            permalink,
            question: {
                id: String(row.id),
                title: row.title || 'questions',
                content: row.content || '',
                created_at: row.created_at,
                author: profile?.username || '',
            },
        },
    }
}

export default function QuestionDetailPage({ permalink, question }: { permalink: string; question: QuestionSeo }) {
    const path = `/questions/${permalink}`
    return (
        <>
            <SEO
                title={question.title}
                description={formatSeoDescription(question.content)}
                article
                structuredData={[
                    buildDiscussionJsonLd({
                        title: question.title,
                        description: formatSeoDescription(question.content),
                        url: pageCanonical(path),
                        datePublished: question.created_at,
                        author: question.author,
                    }),
                    buildBreadcrumbJsonLd([
                        { name: 'worldinmaking', path: '/' },
                        { name: 'questions', path: '/questions' },
                        { name: question.title, path },
                    ]),
                ]}
            />
            <Inbox path={path} permalink={permalink} />
        </>
    )
}
