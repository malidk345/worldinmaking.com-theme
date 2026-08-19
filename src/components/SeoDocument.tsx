import React from 'react'
import { useRouter } from 'next/router'
import {
    ABOUT_BODY,
    HOME_BODY,
    HOME_H1,
    SITE,
    toPlainText,
} from 'lib/seo'
import type { SupabasePost } from 'lib/supabaseBlog'

type QuestionSeo = {
    title?: string
    content?: string
    author?: string
}

function pathOf(asPath?: string): string {
    return String(asPath || '/').split('?')[0].split('#')[0] || '/'
}

/**
 * Crawler-readable document. Same copy users see in windows.
 * sr-only so the OS chrome is unchanged; Google indexes the HTML text.
 */
export default function SeoDocument({
    pageProps,
    isNotFound,
}: {
    pageProps?: Record<string, any>
    isNotFound?: boolean
}) {
    const router = useRouter()
    const path = pathOf(router.asPath)
    const post: SupabasePost | undefined = pageProps?.initialPost
    const question: QuestionSeo | undefined = pageProps?.question

    let heading = SITE.name
    let body = HOME_BODY

    if (isNotFound || router.pathname === '/404') {
        heading = 'page not found'
        body = 'this page does not exist on worldinmaking.'
    } else if (path === '/') {
        heading = HOME_H1
        body = HOME_BODY
    } else if (path === '/about') {
        heading = 'about'
        body = ABOUT_BODY
    } else if (path === '/posts') {
        heading = 'posts'
        body = 'essays and writing on worldinmaking.'
    } else if (path.startsWith('/posts/') && post) {
        heading = post.title || 'posts'
        body = toPlainText(post.excerpt || post.content || post.title)
    } else if (path === '/questions') {
        heading = 'questions'
        body = 'forum threads and philosopher debates on worldinmaking.'
    } else if (path.startsWith('/questions/') && question?.title) {
        heading = question.title
        body = toPlainText(question.content || question.title)
    } else if (path === '/notebooks') {
        heading = 'notebooks'
        body = 'markdown notebooks on worldinmaking.'
    } else if (path === '/community') {
        heading = 'community'
        body = 'forum, essays, and philosopher bots on worldinmaking.'
    } else if (path === '/terms') {
        heading = 'terms of service'
        body = 'terms of service for worldinmaking.'
    } else if (path === '/privacy') {
        heading = 'privacy policy'
        body = 'privacy policy for worldinmaking.'
    } else if (path.startsWith('/profile/') && path !== '/profile') {
        heading = decodeURIComponent(path.split('/')[2] || 'profile')
        body = `${heading} on worldinmaking.`
    }

    return (
        <main id="wim-document" className="sr-only" aria-label="document">
            <article>
                <h1>{heading}</h1>
                <p>{body}</p>
            </article>
        </main>
    )
}
