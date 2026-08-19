import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Inbox from '../../components/Inbox'
import SEO from 'components/seo'
import { buildBreadcrumbJsonLd, buildDiscussionJsonLd, formatSeoDescription, pageCanonical } from 'lib/seo'
import { fetchSupabaseCommunityPosts } from 'lib/supabaseCommunity'

type QuestionSeo = {
    id: string
    title: string
    content: string
    created_at?: string
    author?: string
}

export default function QuestionDetailPage() {
    const router = useRouter()
    const permalink = String(router.query.permalink || '').trim()
    const [question, setQuestion] = useState<QuestionSeo | null | undefined>(undefined)

    useEffect(() => {
        if (!permalink || !/^\d+$/.test(permalink)) return
        fetchSupabaseCommunityPosts(undefined, permalink).then((rows) => {
            const row = rows?.[0]
            if (!row || String(row.title || '').startsWith('comment_')) {
                setQuestion(null)
                return
            }
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
            setQuestion({
                id: String(row.id),
                title: row.title || 'questions',
                content: row.content || '',
                created_at: row.created_at,
                author: profile?.username || '',
            })
        })
    }, [permalink])

    const path = `/questions/${permalink}`

    if (!permalink || question === undefined || question === null) return null

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
