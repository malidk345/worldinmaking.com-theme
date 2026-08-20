import React from 'react'
import { useRouter } from 'next/router'
import BlogPost from '../../../templates/BlogPost'
import { normalizePostSlug } from 'lib/supabaseBlog'

export default function BlogSlugPage() {
    const router = useRouter()
    const slug = normalizePostSlug(String(router.query.slug || ''))
    const path = slug ? `/blog/${slug}` : '/blog'

    return <BlogPost path={path} />
}
