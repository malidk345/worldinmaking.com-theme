import React from 'react'
import type { GetStaticProps, GetStaticPaths } from 'next'
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

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: 'blocking',
    }
}

export const getStaticProps: GetStaticProps<{ permalink: string; question: QuestionSeo }> = async (ctx) => {
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
        revalidate: 60,
    }
}

export default function QuestionDetailPage({ permalink, question }: { permalink: string; question: QuestionSeo }) {
    const path = `/questions/${permalink}`
    const title = question?.title ? `${question.title} - WorldInMaking Questions` : 'Questions - WorldInMaking'
    const desc = formatSeoDescription(question?.content, 'Community question discussion on WorldInMaking.')
    const canonical = pageCanonical(path)
    const jsonLd = [
        buildBreadcrumbJsonLd([
            { name: 'Home', item: '/' },
            { name: 'Questions', item: '/questions' },
            { name: question?.title || `Question #${permalink}`, item: path },
        ]),
        buildDiscussionJsonLd({
            headline: question?.title || `Question #${permalink}`,
            content: question?.content || '',
            url: canonical,
            datePublished: question?.created_at,
            authorName: question?.author || 'WorldInMaking Community',
        }),
    ]

    return (
        <>
            <SEO
                title={title}
                description={desc}
                canonical={canonical}
                article={{
                    publishedTime: question?.created_at,
                    author: question?.author,
                }}
                structuredData={jsonLd}
            />
            <Inbox path={path} permalink={permalink} />
        </>
    )
}
