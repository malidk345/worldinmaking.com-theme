import React, { useEffect, useState } from 'react'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import WimAuthPortal from 'components/Auth/WimAuthPortal'
import PostListing from '../../templates/PostListing'
import BlogPost from '../../templates/BlogPost'
import Handbook from '../../templates/Handbook'
import Inbox from 'components/Inbox'
import Legal from 'components/Legal'
import TapePlayer from 'components/TapePlayer'
import Modal from 'components/RadixUI/Modal'
import FloatingModal from 'components/FloatingModal'
import { fetchSupabasePostBySlug, SupabasePost } from '../../lib/supabaseBlog'

const PageModal = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(true)
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()

    useEffect(() => {
        if (!open) {
            closeWindow(appWindow!)
        }
    }, [open, closeWindow, appWindow])

    return (
        <Modal open={open} onOpenChange={setOpen}>
            {children}
        </Modal>
    )
}

function BlogRouteView(props: any) {
    const rawPath = props.path || ''
    const slugStr = rawPath.replace(/^\/(blog|posts)\/?/, '')
    const [spPost, setSpPost] = useState<SupabasePost | null>(null)
    const [loading, setLoading] = useState(!props.data?.postData && !props.data?.post)

    useEffect(() => {
        if (!props.data?.postData && !props.data?.post && slugStr) {
            let mounted = true
            setLoading(true)
            fetchSupabasePostBySlug(slugStr).then((res) => {
                if (mounted) {
                    setSpPost(res)
                    setLoading(false)
                }
            })
            return () => {
                mounted = false
            }
        }
    }, [slugStr, props.data?.postData, props.data?.post])

    if (props.data?.postData || props.data?.post) {
        return <BlogPost {...props} />
    }

    if (loading) {
        return (
            <div className="p-8 text-center text-primary font-bold lowercase">
                <p>fetching post content...</p>
            </div>
        )
    }

    const title = spPost?.title || slugStr.replace(/-/g, ' ')
    const content = spPost?.content || `# ${title}\n\nNo content found for this post.`
    const date = spPost?.created_at ? spPost.created_at.split('T')[0] : '2026-01-01'
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
                },
            ],
        },
        fields: {
            slug: rawPath,
        },
    }

    const pageData = {
        ...props,
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

    return <BlogPost {...(pageData as any)} />
}

export const AppWindowRouter = (props: any) => {
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()
    const { children, path } = props

    if (/^\/tape-player|^\/mixtapes/.test(path)) {
        return <TapePlayer {...props} />
    }
    if (/^\/login|^\/signup/.test(path)) {
        return (
            <div className="p-6 flex items-center justify-center min-h-full bg-slate-950/90">
                <WimAuthPortal onSuccess={() => closeWindow(appWindow!)} />
            </div>
        )
    }
    if (/^\/questions/.test(path)) {
        return <Inbox {...props} />
    }
    if (path === '/blog' || path === '/posts') {
        const root = path.replace('/', '')
        return <PostListing {...props} activeMenu={root} root={root} title={root === 'blog' ? 'Blog' : 'Posts'} />
    }
    if (/^\/(blog|posts)\/.+/.test(path) || props.pageContext?.post || props.data?.postData) {
        return <BlogRouteView {...props} />
    }
    if (/^\/handbook|^\/docs\/(?!api)|^\/manual/.test(path) && props.data?.post) {
        return <Handbook {...props} />
    }
    if (['/terms', '/privacy', '/dpa', '/baa', '/subprocessors'].includes(path)) {
        return <Legal defaultTab={path}>{children}</Legal>
    }
    return (
        <>
            {appWindow?.modal?.type === 'standard' ? (
                <PageModal>{children}</PageModal>
            ) : appWindow?.modal?.type === 'floating' ? (
                <FloatingModal>{children}</FloatingModal>
            ) : (
                (!props.minimizing || appWindow?.appSettings?.size?.autoHeight) && children
            )}
        </>
    )
}
