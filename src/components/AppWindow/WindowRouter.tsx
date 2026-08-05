'use client'

import React, { useState, useEffect } from 'react'
import IdeasHub from 'components/Ideas'
import ProfileWrapper from 'components/Profile'
import { NotebooksListSkeleton } from 'components/Notebooks/NotebooksList'
import Inbox from 'components/Inbox'
import Handbook from '../../templates/Handbook'
import BlogPost from '../../templates/BlogPost'
import PostListing from '../../templates/PostListing'
import DisplayOptions from 'components/DisplayOptions'
import Legal from 'components/Legal'
import { AppWindow, useWindow } from '../../context/Window'
import Editor from 'components/Editor'
import PostEditorWindow from 'components/Community/PostEditorWindow'
import TapePlayer from 'components/TapePlayer'
import WimAuthPortal from 'components/Auth/WimAuthPortal'
import { useApp } from '../../context/App'
import { fetchSupabasePostBySlug } from '../../lib/supabaseCommunity'
import Modal from 'components/RadixUI/Modal'
import FloatingModal from 'components/FloatingModal'

const PageModal = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(true)
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()

    useEffect(() => {
        if (!open) {
            closeWindow(appWindow)
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
    const [spPostData, setSpPostData] = useState<any>(null)
    const [loading, setLoading] = useState(!props.data?.postData && !props.data?.post)

    useEffect(() => {
        if (!props.data?.postData && !props.data?.post && slugStr) {
            let mounted = true
            setLoading(true)
            fetchSupabasePostBySlug(slugStr).then((res) => {
                if (mounted) {
                    setSpPostData(res)
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

    if (spPostData?.postData) {
        return <BlogPost {...props} data={spPostData} />
    }

    const title = slugStr.replace(/-/g, ' ')
    const content = `# ${title}\n\nNo content found for this post.`
    const postData = {
        body: content,
        excerpt: title,
        frontmatter: {
            title,
            date: '2026-01-01',
            contributors: [
                {
                    name: 'WorldInMaking',
                    role: 'Author',
                    image: 'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png',
                },
            ],
        },
        fields: {
            slug: rawPath,
        },
    }

    return <BlogPost {...props} data={{ postData }} />
}

export interface WindowRouterProps {
    item: AppWindow & { children?: React.ReactNode }
}

function WindowRouterInner({ item }: WindowRouterProps) {
    const rawPath: string = item.path || item.props?.path || ''
    const path: string = rawPath.replace(/\/+$/, '') || '/'
    const props = item.props || {}

    const { appWindow } = useWindow()
    const { closeWindow } = useApp()

    if (/^\/tape-player|^\/mixtapes/.test(path)) {
        return <TapePlayer {...props} />
    }
    if (/^\/login|^\/signup/.test(path)) {
        return (
            <div className="p-6 flex items-center justify-center min-h-full bg-slate-950/90">
                <WimAuthPortal onSuccess={() => closeWindow(appWindow)} />
            </div>
        )
    }
    if (/^\/community\/new|^\/editor\/post/.test(path)) {
        return <PostEditorWindow />
    }
    if (/^\/editor/.test(path)) {
        return <Editor {...props} />
    }
    if (path === '/manifesto' || path === '/about-wim' || path === '/world-in-making') {
        return null
    }
    if (path === '/display-options') {
        return <DisplayOptions />
    }
    if (/^\/ideas|^\/blueprints/.test(path)) {
        return <IdeasHub />
    }
    if (/^\/profile|^\/u\//.test(path)) {
        return <ProfileWrapper {...props} />
    }
    if (/^\/notebooks/.test(path)) {
        return <NotebooksListSkeleton />
    }
    if (/^\/questions|^\/forum|^\/community/.test(path)) {
        const permalink = path.replace(/^\/(questions|forum|community)\/?/, '')
        return <Inbox permalink={permalink || undefined} {...props} />
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
        return <Legal defaultTab={path}>{item.children || (item.element as any)?.element || item.element}</Legal>
    }

    let resolvedChildren = null

    // 1. If item.element is a valid React Element (e.g. <MyComponent />)
    if (React.isValidElement(item.element)) {
        resolvedChildren = item.element
    }
    // 2. If item.element is a component function or class (e.g. item.element = Component)
    else if (typeof item.element === 'function') {
        const Component = item.element as React.ComponentType<any>
        resolvedChildren = <Component {...props} />
    }
    // 3. If item.element is an object containing nested element ({ element: <Component /> })
    else if (item.element && typeof item.element === 'object') {
        const innerElement = (item.element as any).element
        if (React.isValidElement(innerElement)) {
            resolvedChildren = innerElement
        } else if (typeof innerElement === 'function') {
            const Component = innerElement as React.ComponentType<any>
            resolvedChildren = <Component {...props} />
        }
    }
    // 4. Fallback to children
    else if (React.isValidElement(item.children)) {
        resolvedChildren = <>{item.children}</>
    } else {
        resolvedChildren = (
            <div className="p-8 text-primary lowercase">
                <h2 className="text-lg font-bold">content for {item.key || path}</h2>
            </div>
        )
    }

    return (
        <>
            {appWindow?.modal?.type === 'standard' ? (
                <PageModal>{resolvedChildren}</PageModal>
            ) : appWindow?.modal?.type === 'floating' ? (
                <FloatingModal>{resolvedChildren}</FloatingModal>
            ) : (
                (!props.minimizing || appWindow?.appSettings?.size?.autoHeight) && resolvedChildren
            )}
        </>
    )
}

const WindowRouterMemo = React.memo(WindowRouterInner, (prev, next) => {
    return (
        prev.item.path === next.item.path &&
        prev.item.key === next.item.key &&
        JSON.stringify(prev.item.props) === JSON.stringify(next.item.props)
    )
})
WindowRouterMemo.displayName = 'WindowRouterInner'

const WindowRouter = (props: WindowRouterProps) => (
    <div data-scheme="primary" className="bg-primary text-primary size-full flex flex-col min-h-0">
        <WindowRouterMemo {...props} />
    </div>
)

export default WindowRouter
