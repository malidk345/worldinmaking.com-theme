"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import IdeasHub from 'components/Ideas'
import ProfileWrapper from 'components/Profile'
import { NotebooksListSkeleton } from 'components/Notebooks/NotebooksList'
import Inbox from 'components/Inbox'
import BlogPost from '../../templates/BlogPost'
import PostListing from '../../templates/PostListing'
import DisplayOptions from 'components/DisplayOptions'
import Legal from 'components/Legal'
import type { AppWindow } from '../../context/Window'
import WimAuthPortal from 'components/Auth/WimAuthPortal'
import TapePlayer from 'components/TapePlayer'
import { useApp } from '../../context/App'
import { useWindow } from '../../context/Window'

function AuthWindow() {
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()
    return (
        <WimAuthPortal
            onSuccess={() => {
                if (appWindow) closeWindow(appWindow)
            }}
        />
    )
}

import AdminDashboard from 'components/Admin/AdminDashboard'
import ArchiveWindow from 'components/Archive/ArchiveWindow'
import ContactWindow from 'components/Contact/ContactWindow'
import HomeWindow from 'components/Home/HomeWindow'
import { AboutContent } from '../../pages/about'
import Bookmarks from '../../pages/bookmarks'
import NotificationsPage from '../../pages/community/notifications'
import { isAskAiPath } from '../../lib/open-ask-ai-window'
import { isProfilePath } from '../../lib/profile-path'
import { canonicalWindowPath, isArtifactWindowPath, isPathRoutedWindow } from '../../lib/window-path'

const AskAiWindow = dynamic(() => import('../ClaudeWorkspaceChat/AskAiWindow'), { ssr: false })

export interface WindowRouterProps {
    item: AppWindow & { children?: React.ReactNode }
}

function WindowRouterInner({ item }: WindowRouterProps) {
    const rawPath: string = item.path || item.props?.path || ''
    const path: string = canonicalWindowPath(rawPath)
    const props = { ...(item.props || {}), path }

    // Path-first for posts/questions: F5 passes the Next.js page as `item.element`,
    // which renders an empty shell until router.query hydrates. In-app addWindow
    // already uses path. Always resolve those routes from path.
    const preferPath = isPathRoutedWindow(path)

    if (!preferPath) {
        if (React.isValidElement(item.element)) {
            return <>{item.element}</>
        }
        if (
            item.element &&
            typeof (item.element as any).element !== 'undefined' &&
            React.isValidElement((item.element as any).element)
        ) {
            return <>{(item.element as any).element}</>
        }
    }

    if (path === '/about') {
        return <AboutContent />
    }

    if (path === '/archive') {
        return <ArchiveWindow />
    }

    if (path === '/contact') {
        return <ContactWindow />
    }

    if (path === '/home') {
        return <HomeWindow />
    }

    if (isAskAiPath(path)) {
        return <AskAiWindow />
    }

    if (path === '/admin' || path === '/community/admin') {
        return <AdminDashboard />
    }

    if (!preferPath) {
        if (React.isValidElement(item.element)) {
            return item.element
        }
        if (typeof item.element === 'function') {
            const Component = item.element as React.ComponentType<any>
            return <Component {...props} />
        }
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
    }

    // Route-based resolution
    if (/^\/tape-player|^\/mixtapes/.test(path)) {
        return <TapePlayer {...props} />
    }
    if (/^\/auth(\/|$)/.test(path)) {
        return null
    }
    if (/^\/login|^\/signup/.test(path)) {
        return (
            <div className="flex min-h-full items-center justify-center bg-slate-950/90 p-6">
                <AuthWindow />
            </div>
        )
    }
    if (path === '/manifesto' || path === '/about-wim' || path === '/world-in-making') {
        return null
    }
    if (path === '/display-options') {
        return <DisplayOptions />
    }
    if (path === '/bookmarks') {
        return <Bookmarks />
    }
    if (path === '/community/notifications' || path === '/notifications') {
        return <NotificationsPage />
    }
    if (/^\/ideas|^\/blueprints/.test(path)) {
        return <IdeasHub />
    }
    if (isProfilePath(path)) {
        return <ProfileWrapper path={path} {...props} />
    }
    if (/^\/notebooks/.test(path)) {
        return <NotebooksListSkeleton />
    }
    if (/^\/questions|^\/forum|^\/community/.test(path)) {
        // Only real thread slugs open the detail panel — not /questions, /topic/*, /subscriptions
        // (matches wimpos Gatsby params.permalink behavior)
        const threadMatch = path.match(
            /^\/(?:questions|forum)\/(?!topic(?:\/|$)|subscriptions(?:\/|$))([^/?#]+)\/?$/
        )
        const permalink = threadMatch?.[1]
        // h-full min-h-0: Inbox needs a definite height budget for list+panel split (wimpos)
        return (
            <div className="h-full min-h-0 flex flex-col overflow-hidden">
                <Inbox permalink={permalink} path={path} {...props} />
            </div>
        )
    }
    if (path === '/blog' || path === '/posts') {
        return <PostListing {...props} />
    }
    if (/^\/(blog|posts)\/.+/.test(path) || props.pageContext?.post || props.data?.postData) {
        // Pass path so BlogPost can load Supabase body even when window props are empty
        // (comments already resolve by slug; content previously did not)
        return <BlogPost {...props} path={path} />
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
    const sameShell =
        prev.item.path === next.item.path &&
        prev.item.key === next.item.key &&
        JSON.stringify(prev.item.props) === JSON.stringify(next.item.props)
    if (!sameShell) return false
    if (isArtifactWindowPath(prev.item.path || '')) {
        return prev.item.element === next.item.element && prev.item.children === next.item.children
    }
    return true
})
WindowRouterMemo.displayName = 'WindowRouterInner'

export const isForumPath = (p: string): boolean =>
    typeof p === 'string' &&
    (/^\/questions/.test(p) ||
        /^\/forum/.test(p) ||
        (p.startsWith('/community') &&
            !p.startsWith('/community/profiles') &&
            !p.startsWith('/community/achievements')))

/** Blog listing or article — ReaderView chrome must stay window-tall, not post-tall. */
export const isBlogPath = (p: string): boolean => typeof p === 'string' && /^\/(blog|posts)(\/|$)/.test(p)

// No solid bg-primary wrapper here — opaque fills kill WINDOW_BG frosted glass.
// Pages set their own data-scheme / backgrounds (same as wimpos AppWindow content).
const WindowRouter = (props: WindowRouterProps) => {
    const path = canonicalWindowPath(props.item?.path || props.item?.props?.path || '')
    const fillHeight = isForumPath(path) || isAskAiPath(path) || isBlogPath(path) || isArtifactWindowPath(path)
    // Forum / Ask AI / blog: fill the window so chrome (sidebar pin, settings)
    // stays on the pane. Notebooks still grow and scroll the window.
    return (
        <div
            data-scheme="primary"
            className={
                fillHeight
                    ? 'text-primary h-full min-h-0 flex flex-col overflow-hidden'
                    : 'text-primary min-h-full h-auto flex flex-col'
            }
        >
            <WindowRouterMemo {...props} />
        </div>
    )
}

export default WindowRouter
