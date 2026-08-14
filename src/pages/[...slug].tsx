import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { fetchSupabasePostBySlug, SupabasePost } from '../lib/supabaseBlog'
import { useRouter } from 'next/router'

import BlogPostTemplate from '../templates/BlogPost'
import Inbox from '../components/Inbox'
import IdeasHub from '../components/Ideas'
import ProfileWrapper from '../components/Profile'
// Dynamically import the full notebook app with SSR disabled
// (the app uses browser APIs like window.location.hash)
const NotebooksListSkeleton = dynamic(
    () => import('../notebook-app/App').then((mod) => mod.App),
    {
        ssr: false,
        loading: () => (
            <div
                className="flex items-center justify-center w-full h-full"
                style={{ background: 'var(--bg-3000, #f3f4f5)', color: 'var(--text-3000, #1d1f27)' }}
            >
                <div className="text-sm animate-pulse opacity-60">Loading notebooks...</div>
            </div>
        ),
    }
)
import HandbookTemplate from '../templates/Handbook'
import Legal from '../components/Legal'
import DisplayOptions from '../components/DisplayOptions'
import { SharedChatView } from '../components/Share/SharedChatView'

function BlogPostContainer({ slugStr, fullPath }: { slugStr: string; fullPath: string }) {
    const [spPost, setSpPost] = useState<SupabasePost | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        setLoading(true)
        fetchSupabasePostBySlug(slugStr).then((res) => {
            if (!mounted) return
            setSpPost(res)
            setLoading(false)
        })
        return () => {
            mounted = false
        }
    }, [slugStr])

    if (loading && !spPost) {
        return (
            <div className="p-8 text-secondary text-sm animate-pulse">Loading post…</div>
        )
    }

    if (!spPost) {
        return (
            <div className="p-8 text-primary max-w-xl">
                <h1 className="text-xl font-bold mb-2">Post not found</h1>
                <p className="text-secondary text-sm m-0">
                    No row in Supabase <code className="text-xs">posts</code> for “{slugStr}”.
                </p>
            </div>
        )
    }

    const title = spPost.title
    const content = spPost.content || ''
    const date = spPost.created_at ? spPost.created_at.split('T')[0] : '2026-01-01'
    const author = spPost.author || 'WorldInMaking'

    const postData = {
        body: content,
        excerpt: spPost.excerpt || title,
        frontmatter: {
            title,
            date,
            featuredImage: spPost.image_url ? { publicURL: spPost.image_url } : null,
            featuredVideo: null,
            contributors: [
                {
                    name: author,
                    role: 'Author',
                    image:
                        spPost.author_avatar ||
                        'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                },
            ],
        },
        fields: {
            slug: fullPath.startsWith('/posts') || fullPath.startsWith('/blog') ? fullPath : `/posts/${slugStr}`,
        },
    }

    const pageData = {
        data: {
            postData,
            post: postData,
        },
        pageContext: {
            tableOfContents: [],
            askMax: true,
            localizedRoot: '/blog',
        },
    }

    return <BlogPostTemplate {...(pageData as any)} />
}


export default function DynamicSlugPage() {
    const router = useRouter()
    const [location, setLocation] = React.useState(() => {
        const asPath = router?.asPath || ''
        const pathname = asPath.split('?')[0].split('#')[0] || '/'
        return { pathname }
    })
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setLocation({
                pathname: window.location.pathname,
            })
        }
    }, [router?.asPath])
    const pathSegments = (location?.pathname || '').split('/').filter(Boolean)

    const slugs = pathSegments.length > 0 ? pathSegments : ['questions']
    const rootSegment = slugs[0]
    const slugStr = slugs[slugs.length - 1]
    const fullPath = '/' + slugs.join('/')

    let element: React.ReactElement

    if (rootSegment === 'share') {
        element = <SharedChatView key={fullPath} token={slugs[1] || ''} />
    } else if (rootSegment === 'ideas' || rootSegment === 'blueprints') {
        element = <IdeasHub key={fullPath} path={fullPath} />
    } else if (rootSegment === 'profile' || rootSegment === 'u') {
        element = <ProfileWrapper key={fullPath} path={fullPath} />
    } else if (rootSegment === 'notebooks') {
        element = <NotebooksListSkeleton key={fullPath} path={fullPath} />
    } else if (rootSegment === 'questions' || rootSegment === 'forum' || rootSegment === 'community') {
        element = <Inbox key={fullPath} path={fullPath} permalink={slugStr !== 'questions' && slugStr !== 'forum' && slugStr !== 'community' ? slugStr : undefined} />
    } else if (['terms', 'privacy', 'dpa', 'baa', 'subprocessors'].includes(rootSegment)) {
        element = <Legal key={fullPath} defaultTab={'/' + rootSegment} />
    } else if (rootSegment === 'display-options') {
        element = <DisplayOptions key={fullPath} />
    } else if (rootSegment === 'handbook' || rootSegment === 'docs' || rootSegment === 'manual') {
        const handbookData = {
            data: {
                post: {
                    body: `# ${slugStr.replace(/-/g, ' ')}\n\nLoading documentation...`,
                    frontmatter: {
                        title: slugStr.replace(/-/g, ' '),
                        date: '2026-01-01',
                        tags: [],
                        contributors: [],
                        seo: null,
                        tableOfContents: [],
                        hideRightSidebar: false,
                        contentMaxWidthClass: '',
                        showByline: true,
                        featureFlag: null,
                        noindex: false,
                    },
                    fields: {
                        slug: fullPath,
                        appConfig: null,
                        templateConfigs: null,
                        commits: [],
                    },
                    excerpt: slugStr,
                },
                postHogSource: null,
            },
            pageContext: {
                breadcrumbBase: null,
                tableOfContents: [],
            },
        }
        element = <HandbookTemplate key={fullPath} {...(handbookData as any)} />
    } else {
        element = <BlogPostContainer key={fullPath} slugStr={slugStr} fullPath={fullPath} />
    }

    return element
}

