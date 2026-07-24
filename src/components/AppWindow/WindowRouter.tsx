"use client"

import React from 'react'
import IdeasHub from 'components/Ideas'
import ProfileWrapper from 'components/Profile'
import { NotebooksListSkeleton } from 'components/Notebooks/NotebooksList'
import Inbox from 'components/Inbox'
import Handbook from '../../templates/Handbook'
import BlogPost from '../../templates/BlogPost'
import Legal from 'components/Legal'
import { AppWindow as AppWindowType } from '../../context/Window'

export interface WindowRouterProps {
    item: AppWindowType & { children?: React.ReactNode }
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
    if (/^\/ideas|^\/blueprints/.test(path)) {
        return <IdeasHub />
    }
    if (/^\/profile|^\/u\//.test(path)) {
        return <ProfileWrapper {...props} />
    }
    if (/^\/notebooks/.test(path)) {
        return <NotebooksListSkeleton />
    }
    if (/^\/questions/.test(path)) {
        return <Inbox {...props} />
    }
    if (/^\/handbook|^\/docs\/(?!api)|^\/manual/.test(path) && props.data?.post) {
        return <Handbook {...props} />
    }
    if ((props.pageContext?.post || /^posts/.test(path)) && props.data) {
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

const WindowRouter = React.memo(WindowRouterInner, (prev, next) => {
    return prev.item.path === next.item.path && prev.item.key === next.item.key
})
WindowRouter.displayName = 'WindowRouter'

export default WindowRouter
