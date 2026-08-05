"use client"

import React from 'react'
import IdeasHub from 'components/Ideas'
import ProfileWrapper from 'components/Profile'
import { NotebooksListSkeleton } from 'components/Notebooks/NotebooksList'
import Inbox from 'components/Inbox'
import Handbook from '../../templates/Handbook'
import BlogPost from '../../templates/BlogPost'
import PostListing from '../../templates/PostListing'
import DisplayOptions from 'components/DisplayOptions'
import Legal from 'components/Legal'
import { AppWindow } from '../../context/Window'
import Editor from 'components/Editor'
import PostEditorWindow from 'components/Community/PostEditorWindow'


export interface WindowRouterProps {
    item: AppWindow & { children?: React.ReactNode }
}

function WindowRouterInner({ item }: WindowRouterProps) {
    const rawPath: string = item.path || item.props?.path || ''
    const path: string = rawPath.replace(/\/+$/, '') || '/'
    const props = item.props || {}

    // 1. If item.element is a valid React Element (e.g. <MyComponent />)
    if (React.isValidElement(item.element)) {
        return item.element
    }

    // 2. If item.element is a component function or class (e.g. item.element = Component)
    if (typeof item.element === 'function') {
        const Component = item.element as React.ComponentType<any>
        return <Component {...props} />
    }

    // 3. If item.element is an object containing nested element ({ element: <Component /> })
    if (item.element && typeof item.element === 'object') {
        const innerElement = (item.element as any).element
        if (React.isValidElement(innerElement)) {
            return innerElement
        }
        if (typeof innerElement === 'function') {
            const Component = innerElement as React.ComponentType<any>
            return <Component {...props} />
        }
    }

    // 4. Route-based resolution
    if (path === '/editor/post' || path === '/community/new' || path.startsWith('/community/new')) {
        return <PostEditorWindow />
    }
    if (path === '/editor' || path.startsWith('/editor')) {
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
        return <PostListing {...props} />
    }
    if (/^\/(blog|posts)\/.+/.test(path) || props.pageContext?.post || props.data?.postData) {
        return <BlogPost {...props} />
    }
    if (['/terms', '/privacy', '/dpa', '/baa', '/subprocessors'].includes(path)) {
        return <Legal defaultTab={path}>{(item.element as any)?.element || item.element || item.children}</Legal>
    }

    // 5. Fallback to children
    if (React.isValidElement(item.children)) {
        return <>{item.children}</>
    }

    return (
        <div className="p-8 text-primary lowercase">
            <h2 className="text-lg font-bold">content for {item.key || path}</h2>
        </div>
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

// No solid bg-primary wrapper here — opaque fills kill WINDOW_BG frosted glass.
// Pages set their own data-scheme / backgrounds (same as wimpos AppWindow content).
const WindowRouter = (props: WindowRouterProps) => (
    // min-h-full + h-auto: short pages fill the window; long pages grow so parent can scroll
    <div data-scheme="primary" className="text-primary min-h-full h-auto flex flex-col">
        <WindowRouterMemo {...props} />
    </div>
)

export default WindowRouter
