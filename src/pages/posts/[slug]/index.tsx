import type { GetServerSideProps } from 'next'
import React from 'react'
import { useRouter } from 'next/router'
import BlogPost from '../../../templates/BlogPost'
import { normalizePostSlug } from 'lib/supabaseBlog'

export const getServerSideProps: GetServerSideProps = async (context) => {
    const rawSlug = context.params?.slug
    const slug = normalizePostSlug(Array.isArray(rawSlug) ? rawSlug.join('/') : String(rawSlug || ''))
    const path = slug ? `/posts/${slug}` : '/posts'

    return {
        props: {
            slug,
            path,
        },
    }
}

export default function PostSlugPage({ slug: initialSlug, path: initialPath }: { slug?: string; path?: string }) {
    const router = useRouter()
    const routerSlug = normalizePostSlug(String(router.query.slug || ''))
    const slug = initialSlug || (routerSlug && !routerSlug.startsWith('[') ? routerSlug : '')
    const path = initialPath || (slug ? `/posts/${slug}` : (router.asPath && !router.asPath.includes('[') ? router.asPath.split('?')[0].split('#')[0] : '/posts'))

    return <BlogPost path={path} key={path} />
}
