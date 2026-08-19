import React from 'react'
import type { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import Inbox from '../components/Inbox'
import ProfileWrapper from '../components/Profile'
import DisplayOptions from '../components/DisplayOptions'
import Bookmarks from './bookmarks'
import { SharedChatView } from '../components/Share/SharedChatView'

const NotebooksListSkeleton = dynamic(
    () => import('../notebook-app/App').then((mod) => mod.App),
    {
        ssr: false,
        loading: () => (
            <div
                className="flex items-center justify-center w-full h-full"
                style={{ background: 'var(--bg-3000, #f3f4f5)', color: 'var(--text-3000, #1d1f27)' }}
            >
                <div className="text-sm animate-pulse opacity-60">loading notebooks...</div>
            </div>
        ),
    }
)

const ALLOWED_ROOTS = new Set(['share', 'notebooks', 'profile', 'u', 'display-options', 'bookmarks'])

export const getServerSideProps: GetServerSideProps<{ slugParts: string[] }> = async (ctx) => {
    const raw = ctx.params?.slug
    const slugParts = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : []
    const root = slugParts[0] || ''
    if (root === 'community' && slugParts[1] === 'profiles') {
        return { props: { slugParts } }
    }
    if (ALLOWED_ROOTS.has(root)) {
        return { props: { slugParts } }
    }
    return { notFound: true }
}

export default function DynamicSlugPage({ slugParts }: { slugParts: string[] }) {
    const slugs = slugParts.length > 0 ? slugParts : ['questions']
    const rootSegment = slugs[0]
    const slugStr = slugs[slugs.length - 1]
    const fullPath = '/' + slugs.join('/')

    if (rootSegment === 'share') {
        return <SharedChatView key={fullPath} token={slugs[1] || ''} />
    }
    if (rootSegment === 'profile' || rootSegment === 'u' || (rootSegment === 'community' && slugs[1] === 'profiles')) {
        return <ProfileWrapper key={fullPath} path={fullPath} />
    }
    if (rootSegment === 'notebooks') {
        return <NotebooksListSkeleton key={fullPath} path={fullPath} />
    }
    if (rootSegment === 'display-options') {
        return <DisplayOptions key={fullPath} />
    }
    if (rootSegment === 'bookmarks') {
        return <Bookmarks key={fullPath} />
    }
    if (rootSegment === 'questions' || rootSegment === 'forum' || rootSegment === 'community') {
        return (
            <Inbox
                key={fullPath}
                path={fullPath}
                permalink={
                    slugStr !== 'questions' && slugStr !== 'forum' && slugStr !== 'community' ? slugStr : undefined
                }
            />
        )
    }
    return null
}
