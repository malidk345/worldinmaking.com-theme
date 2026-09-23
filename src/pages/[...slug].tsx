import React from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

const Inbox = dynamic(() => import('../components/Inbox'))
const ProfileWrapper = dynamic(() => import('../components/Profile'))
const DisplayOptions = dynamic(() => import('../components/DisplayOptions'), { ssr: false })
const Bookmarks = dynamic(() => import('./bookmarks'))
const BlogPost = dynamic(() => import('../templates/BlogPost'))
const SharedChatView = dynamic(() =>
    import('../components/Share/SharedChatView').then((m) => ({ default: m.SharedChatView }))
)

import { IconSpinner } from '@posthog/icons'

const NotebookAppProxy = dynamic(
    () => import('../notebook-app/App').then((mod) => mod.App),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center w-full h-full min-h-[200px]">
                <IconSpinner className="size-5 animate-spin text-primary" />
            </div>
        ),
    }
)

export default function DynamicSlugPage() {
    const router = useRouter()
    const raw = router.query.slug
    const slugParts = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : []
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
        return <NotebookAppProxy key={fullPath} />
    }
    if (rootSegment === 'display-options') {
        return <DisplayOptions key={fullPath} />
    }
    if (rootSegment === 'bookmarks') {
        return <Bookmarks key={fullPath} />
    }
    if (rootSegment === 'blog' || rootSegment === 'posts') {
        return <BlogPost key={fullPath} path={fullPath} />
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
