"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import { NotebooksListSkeleton } from 'components/Notebooks/NotebooksList'
import { LEGAL_PATHS } from 'lib/legal-paths'
import type { AppWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import { useWindow } from '../../context/Window'
import { isAskAiPath } from '../../lib/open-ask-ai-window'
import { isProfilePath } from '../../lib/profile-path'
import {
    canonicalWindowPath,
    isArtifactWindowPath,
    isAssistantWindowPath,
    isBlogPath,
    isForumPath,
    isNotebookWindowPath,
    isPathRoutedWindow,
    isScratchpadWindowPath,
    isTrashWindowPath,
} from '../../lib/window-path'

export { isForumPath, isBlogPath }

const routeFallback = () => <div className="h-full min-h-0 flex-1" aria-hidden />

const IdeasHub = dynamic(() => import('components/Ideas'), { loading: routeFallback })
const ProfileWrapper = dynamic(() => import('components/Profile'), { loading: routeFallback })
const Inbox = dynamic(() => import('components/Inbox'), { loading: routeFallback })
const BlogPost = dynamic(() => import('../../templates/BlogPost'), { loading: routeFallback })
const PostListing = dynamic(() => import('../../templates/PostListing'), { loading: routeFallback })
const DisplayOptions = dynamic(() => import('components/DisplayOptions'), { ssr: false, loading: routeFallback })
const Legal = dynamic(() => import('components/Legal'), { loading: routeFallback })
const WimAuthPortal = dynamic(() => import('components/Auth/WimAuthPortal'), { ssr: false, loading: routeFallback })
const TapePlayer = dynamic(() => import('components/TapePlayer'), { ssr: false, loading: routeFallback })
const AdminDashboard = dynamic(() => import('components/Admin/AdminDashboard'), { ssr: false, loading: routeFallback })
const ArchiveWindow = dynamic(() => import('components/Archive/ArchiveWindow'), { loading: routeFallback })
const ContactWindow = dynamic(() => import('components/Contact/ContactWindow'), { loading: routeFallback })
const HomeWindow = dynamic(() => import('components/Home/HomeWindow'), { loading: routeFallback })
const AccountWindow = dynamic(() => import('components/Account/AccountWindow'), { loading: routeFallback })
const AboutContent = dynamic(() => import('../../pages/about').then((m) => ({ default: m.AboutContent })), {
    loading: routeFallback,
})
const Bookmarks = dynamic(() => import('../../pages/bookmarks'), { loading: routeFallback })
const NotificationsPage = dynamic(() => import('../../pages/community/notifications'), { loading: routeFallback })
const ScratchpadWindow = dynamic(() => import('../ScratchpadWindow').then((m) => ({ default: m.ScratchpadWindow })), {
    loading: routeFallback,
})
const TrashWindow = dynamic(() => import('../TrashWindow').then((m) => ({ default: m.TrashWindow })), {
    loading: routeFallback,
})
const AskAiWindow = dynamic(() => import('../ClaudeWorkspaceChat/AskAiWindow'), { ssr: false, loading: routeFallback })
const PricingWindow = dynamic(() => import('../Pricing/PricingWindow'), { ssr: false, loading: routeFallback })
const AssistantWindow = dynamic(() => import('../AssistantWindow'), { ssr: false, loading: routeFallback })

export interface WindowRouterProps {
    item: AppWindow & { children?: React.ReactNode }
}

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

    if (path === '/pricing') {
        return <PricingWindow />
    }

    if (path === '/home') {
        return <HomeWindow />
    }

    if (path === '/account') {
        return <AccountWindow />
    }

    if (isAskAiPath(path)) {
        return <AskAiWindow />
    }

    if (path === '/scratchpad' || path.startsWith('/scratchpad/')) {
        return <ScratchpadWindow />
    }

    if (path === '/trash' || path.startsWith('/trash/')) {
        return <TrashWindow />
    }

    if (path === '/assistant' || path.startsWith('/assistant/')) {
        return <AssistantWindow />
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
    if ((LEGAL_PATHS as readonly string[]).includes(path)) {
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

// No solid bg-primary wrapper here — opaque fills kill WINDOW_BG frosted glass.
// Pages set their own data-scheme / backgrounds (same as wimpos AppWindow content).
const WindowRouter = (props: WindowRouterProps) => {
    const path = canonicalWindowPath(props.item?.path || props.item?.props?.path || '')
    const fillHeight =
        isForumPath(path) ||
        isAskAiPath(path) ||
        isBlogPath(path) ||
        isArtifactWindowPath(path) ||
        isNotebookWindowPath(path) ||
        isScratchpadWindowPath(path) ||
        isTrashWindowPath(path) ||
        isAssistantWindowPath(path) ||
        isProfilePath(path)
    // Forum / Ask AI / blog / notebooks: fill the window so chrome (sidebar pin,
    // settings, mobile FAB) stays on the pane. Content scrolls inside.
    return (
        <div
            data-scheme="primary"
            className={
                fillHeight
                    ? `text-primary h-full min-h-0 flex flex-col overflow-hidden${
                          isScratchpadWindowPath(path) || isTrashWindowPath(path) || isAssistantWindowPath(path) ? ' bg-primary' : ''
                      }`
                    : 'text-primary min-h-full h-auto flex flex-col'
            }
        >
            <WindowRouterMemo {...props} />
        </div>
    )
}

export default WindowRouter
