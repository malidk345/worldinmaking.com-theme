import React from 'react'
import { useRouter } from 'next/router'
import BlogPost from '../../../templates/BlogPost'
import { normalizePostSlug } from 'lib/supabaseBlog'

export default function PostSlugPage() {
    const router = useRouter()
    const rawQuerySlug = router.query.slug
    const routerSlug = normalizePostSlug(Array.isArray(rawQuerySlug) ? rawQuerySlug.join('/') : String(rawQuerySlug || ''))
    
    let path = '/posts'
    if (routerSlug && !routerSlug.startsWith('[')) {
        path = `/posts/${routerSlug}`
    } else if (router.asPath && !router.asPath.includes('[') && router.asPath.startsWith('/posts/')) {
        path = router.asPath.split('?')[0].split('#')[0]
    } else if (typeof window !== 'undefined' && window.location.pathname.startsWith('/posts/')) {
        path = window.location.pathname
    }

    return <BlogPost path={path} key={path} />
}
