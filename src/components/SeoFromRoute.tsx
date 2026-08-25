import React from 'react'
import { useRouter } from 'next/router'
import SEO from 'components/seo'
import {
    SITE,
    buildAboutPageJsonLd,
    buildArticleJsonLd,
    buildBreadcrumbJsonLd,
    buildCollectionJsonLd,
    buildDiscussionJsonLd,
    buildOrganizationJsonLd,
    buildSiteNavigationElementJsonLd,
    buildSoftwareApplicationJsonLd,
    buildWebSiteJsonLd,
    formatSeoDescription,
    pageCanonical,
} from 'lib/seo'
import type { SupabasePost } from 'lib/supabaseBlog'

type QuestionSeo = {
    id?: string
    title?: string
    content?: string
    created_at?: string
    author?: string
}

function pathOf(asPath?: string): string {
    return String(asPath || '/')
        .split('?')[0]
        .split('#')[0] || '/'
}

export default function SeoFromRoute({
    pageProps,
    isNotFound,
}: {
    pageProps?: Record<string, any>
    isNotFound?: boolean
}) {
    const router = useRouter()
    const path = pathOf(router.asPath)

    if (isNotFound || router.pathname === '/404') {
        return <SEO title="page not found" description="this page does not exist on worldinmaking." noindex />
    }

    if (path === '/') {
        return (
            <SEO
                title="worldinmaking"
                description={SITE.defaultDescription}
                structuredData={[
                    buildWebSiteJsonLd(),
                    buildOrganizationJsonLd(),
                    buildSoftwareApplicationJsonLd(),
                    buildSiteNavigationElementJsonLd(),
                ]}
            />
        )
    }

    if (path === '/about') {
        return (
            <SEO
                title="about"
                description="what this site is, and why it exists."
                structuredData={[buildAboutPageJsonLd(), buildOrganizationJsonLd()]}
            />
        )
    }

    if (path === '/posts') {
        return (
            <SEO
                title="posts"
                description="essays and writing on worldinmaking."
                structuredData={buildCollectionJsonLd('posts', '/posts')}
            />
        )
    }

    const post: SupabasePost | undefined = pageProps?.initialPost
    if (path.startsWith('/posts/') && post) {
        const slug = path.replace(/^\/posts\//, '')
        return (
            <SEO
                title={post.title}
                description={post.excerpt || post.title}
                article
                image={post.image_url}
                publishedTime={post.created_at}
                modifiedTime={post.created_at}
                authorName={post.author}
                imageAlt={post.title}
                structuredData={[
                    buildArticleJsonLd({
                        title: post.title,
                        description: post.excerpt,
                        url: pageCanonical(`/posts/${slug}`),
                        image: post.image_url,
                        datePublished: post.created_at,
                        author: post.author,
                    }),
                    buildBreadcrumbJsonLd([
                        { name: 'worldinmaking', path: '/' },
                        { name: 'posts', path: '/posts' },
                        { name: post.title, path: `/posts/${slug}` },
                    ]),
                ]}
            />
        )
    }

    if (path === '/questions') {
        return (
            <SEO
                title="questions"
                description="forum threads and philosopher debates on worldinmaking."
                structuredData={buildCollectionJsonLd('questions', '/questions')}
            />
        )
    }

    const question: QuestionSeo | undefined = pageProps?.question
    if (path.startsWith('/questions/') && question?.title) {
        return (
            <SEO
                title={question.title}
                description={formatSeoDescription(question.content)}
                article
                publishedTime={question.created_at}
                authorName={question.author}
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
        )
    }

    if (path === '/notebooks') {
        return <SEO title="notebooks" description="markdown notebooks on worldinmaking." />
    }
    if (path === '/community') {
        return <SEO title="community" description="forum, essays, and philosopher bots on worldinmaking." />
    }
    if (path === '/archive') {
        return <SEO title="archive" description="archived desktop items on worldinmaking." />
    }
    if (path === '/terms') {
        return <SEO title="terms of service" description="terms of service for worldinmaking." />
    }
    if (path === '/privacy') {
        return <SEO title="privacy policy" description="privacy policy for worldinmaking." />
    }
    if (path === '/login') {
        return <SEO title="sign in" description="sign in to worldinmaking." noindex />
    }
    if (path === '/signup') {
        return <SEO title="sign up" description="create a worldinmaking account." noindex />
    }
    if (path === '/reset-password' || path.startsWith('/auth/')) {
        return <SEO title="sign in" noindex />
    }
    if (path === '/admin' || path === '/bookmarks' || path === '/display-options') {
        return <SEO title={path.slice(1)} noindex />
    }
    if (path === '/posts/new' || /\/posts\/.+\/edit$/.test(path)) {
        return <SEO title="edit" noindex />
    }
    if (path.startsWith('/profile/') && path !== '/profile') {
        const username = decodeURIComponent(path.split('/')[2] || 'profile')
        return <SEO title={username} description={`${username} on worldinmaking.`} />
    }
    if (path === '/profile') {
        return <SEO title="profile" noindex />
    }

    return <SEO title="worldinmaking" description={SITE.defaultDescription} noindex />
}
