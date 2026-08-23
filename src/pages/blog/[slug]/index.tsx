import React from 'react'
import { useRouter } from 'next/router'
import BlogPost from '../../../templates/BlogPost'
import { normalizePostSlug } from 'lib/supabaseBlog'

export default function BlogSlugPage() {
    const router = useRouter()
    const livePath =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/blog/')
            ? window.location.pathname.split('?')[0].split('#')[0]
            : ''
    const rawQuerySlug = router.query.slug
    const routerSlug = normalizePostSlug(
        Array.isArray(rawQuerySlug) ? rawQuerySlug.join('/') : String(rawQuerySlug || '')
    )
    const asPath = (router.asPath || '').split('?')[0].split('#')[0]

    let path = livePath || '/blog'
    if (routerSlug && !routerSlug.startsWith('[')) {
        path = `/blog/${routerSlug}`
    } else if (asPath.startsWith('/blog/') && !asPath.includes('[')) {
        path = asPath
    }

    return <BlogPost path={path} key={path} />
}
