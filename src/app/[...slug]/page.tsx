'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import BlogPostTemplate from '../../templates/BlogPost'
import Inbox from '../../components/Inbox'
import { getBlogPost } from '../../lib/blog'
import { fetchSupabasePostBySlug, SupabasePost } from '../../lib/supabaseBlog'

import IdeasHub from '../../components/Ideas'
import ProfileWrapper from '../../components/Profile'
import { NotebooksListSkeleton } from '../../components/Notebooks/NotebooksList'
import HandbookTemplate from '../../templates/Handbook'
import Legal from '../../components/Legal'

import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'

function BlogPostContainer({ slugStr, fullPath }: { slugStr: string; fullPath: string }) {
    const [spPost, setSpPost] = useState<SupabasePost | null>(null)

    useEffect(() => {
        let mounted = true
        fetchSupabasePostBySlug(slugStr).then((res) => {
            if (mounted && res) {
                setSpPost(res)
            }
        })
        return () => {
            mounted = false
        }
    }, [slugStr])

    const localPost = getBlogPost(slugStr)

    const title = spPost?.title || localPost?.frontmatter?.title || slugStr.replace(/-/g, ' ')
    const content = spPost?.content || localPost?.content || `# ${title}\n\nLoading content...`
    const date = spPost?.created_at ? spPost.created_at.split('T')[0] : localPost?.frontmatter?.date || '2026-01-01'
    const author = spPost?.author || 'WorldInMaking'

    const postData = {
        body: content,
        excerpt: spPost?.excerpt || title,
        frontmatter: {
            title,
            date,
            featuredImage: spPost?.image_url ? { publicURL: spPost.image_url } : null,
            featuredVideo: null,
            contributors: [
                {
                    name: author,
                    role: 'Author',
                    image: spPost?.author_avatar || 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                }
            ]
        },
        fields: {
            slug: fullPath
        }
    }

    const pageData = {
        data: {
            postData,
            post: postData
        },
        pageContext: {
            tableOfContents: [],
            askMax: true,
            localizedRoot: '/blog'
        }
    }

    return <BlogPostTemplate {...(pageData as any)} />
}

export default function DynamicPage({ params }: { params: { slug: string[] } }) {
    const slugArray = params?.slug || ['repositioning-posthog']
    const rootSegment = slugArray[0]
    const slugStr = slugArray[slugArray.length - 1]
    const fullPath = '/' + slugArray.join('/')
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: fullPath } as any)

    let element: React.ReactElement

    if (rootSegment === 'ideas' || rootSegment === 'blueprints') {
        element = <IdeasHub key={fullPath} path={fullPath} />
    } else if (rootSegment === 'profile' || rootSegment === 'u') {
        element = <ProfileWrapper key={fullPath} path={fullPath} />
    } else if (rootSegment === 'notebooks') {
        element = <NotebooksListSkeleton key={fullPath} path={fullPath} />
    } else if (rootSegment === 'questions') {
        element = <Inbox key={fullPath} path={fullPath} permalink={slugStr} />
    } else if (['terms', 'privacy', 'dpa', 'baa', 'subprocessors'].includes(rootSegment)) {
        element = <Legal key={fullPath} defaultTab={'/' + rootSegment} />
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

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={element} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}

