import React from 'react'
import { useRouter } from 'next/router'
import BlogPost from '../../../templates/BlogPost'
import { normalizePostSlug } from 'lib/supabaseBlog'

export default function PostSlugPage() {
    const router = useRouter()
    const livePath =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/posts/')
            ? window.location.pathname.split('?')[0].split('#')[0]
            : ''
    const rawQuerySlug = router.query.slug
    const routerSlug = normalizePostSlug(
        Array.isArray(rawQuerySlug) ? rawQuerySlug.join('/') : String(rawQuerySlug || '')
    )
    const asPath = (router.asPath || '').split('?')[0].split('#')[0]

    let path = livePath || '/posts'
    if (routerSlug && !routerSlug.startsWith('[')) {
        path = `/posts/${routerSlug}`
    } else if (asPath.startsWith('/posts/') && !asPath.includes('[')) {
        path = asPath
    }

    return <BlogPost path={path} key={path} />
}
