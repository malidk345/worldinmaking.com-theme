import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'components/Link'
import { useAppActions, useAppSettings, useAppUIState, useAppWindows } from '../../context/App'
import { openAskAiWindow } from '../../lib/open-ask-ai-window'
import { GlassIcon } from 'components/OSIcons'
import { AppIcon, AppItem } from 'components/OSIcons/AppIcon'
import ContextMenu from 'components/RadixUI/ContextMenu'
import DesktopIcon from './DesktopIcon'
import NotificationsPanel from 'components/NotificationsPanel'
import { ClaudeWorkspaceChatPanel } from 'components/ClaudeWorkspaceChat'
import Wallpapers, { getWallpaperGlow } from './Wallpapers'
import HedgeHogModeEmbed from 'components/HedgehogMode'
import ReactConfetti from 'react-confetti'
import { apps, useProductLinks } from './desktopApps'

export { apps, useProductLinks }

const APP_CONTAINER_TOP_PADDING = 8
const TASKBAR_HEIGHT = 42
const DESKTOP_TOP_OFFSET = APP_CONTAINER_TOP_PADDING + TASKBAR_HEIGHT

function Desktop() {
    const productLinks = useProductLinks()
    const { setConfetti, addWindow, updateWindow, handleSnapToSide } =
        useAppActions()
    const { siteSettings, isMobile } = useAppSettings()
    const { windows } = useAppWindows()
    const { confetti } = useAppUIState()
    const [pinnedApps, setPinnedApps] = useState<AppItem[]>([])
    const router = useRouter()

    useEffect(() => {
        if (router.query.open === 'chat') {
            openAskAiWindow({
                windows,
                isMobile,
                addWindow,
                updateWindow,
                snapWindow: handleSnapToSide,
            })
            router.replace('/desktop', undefined, { shallow: true })
        }
    }, [router.query.open])

    const loadPinnedApps = useCallback(() => {
        if (typeof window === 'undefined') return
        try {
            const customAppsKey = 'wim_os_desktop_pinned_items'
            const raw = localStorage.getItem(customAppsKey)
            const existing = JSON.parse(raw || '[]')
            if (!Array.isArray(existing)) {
                setPinnedApps([])
                return
            }

            let deletedIds: string[] = []
            try {
                deletedIds = JSON.parse(localStorage.getItem('wim_os_deleted_notebook_ids') || '[]')
            } catch {
                deletedIds = []
            }
            const deletedSet = new Set(Array.isArray(deletedIds) ? deletedIds : [])

            let existingNotebookIds: Set<string> | null = null
            try {
                const storedRaw = localStorage.getItem('wim_os_notebooks')
                if (storedRaw) {
                    const parsed = JSON.parse(storedRaw)
                    if (Array.isArray(parsed)) {
                        existingNotebookIds = new Set(
                            parsed.flatMap((n: any) => [n?.id, n?.short_id].filter(Boolean))
                        )
                    }
                }
            } catch {
                existingNotebookIds = null
            }

            const validItems = existing.filter((item: any) => {
                if (!item) return false
                const targetId = item.notebookId || item.id
                if (!targetId) return true
                if (deletedSet.has(targetId)) return false
                if (existingNotebookIds && !existingNotebookIds.has(targetId)) {
                    return false
                }
                return true
            })

            if (validItems.length !== existing.length) {
                localStorage.setItem(customAppsKey, JSON.stringify(validItems))
            }

            const mapped: AppItem[] = validItems.map((item: any) => ({
                label: item.label,
                Icon: <AppIcon name="doc" />,
                url: item.url || (item.notebookId ? `/notebooks?id=${item.notebookId}` : '/notebooks'),
                source: 'desktop',
            }))
            setPinnedApps(mapped)
        } catch (e) {
            console.error('Failed to load pinned apps', e)
        }
    }, [])

    useEffect(() => {
        loadPinnedApps()
        window.addEventListener('wimDesktopPinnedChanged', loadPinnedApps)
        return () => window.removeEventListener('wimDesktopPinnedChanged', loadPinnedApps)
    }, [loadPinnedApps])

    const glow = getWallpaperGlow(siteSettings.wallpaper)
    const applyGlow = (items: AppItem[]) =>
        items.map((app) =>
            React.isValidElement(app.Icon) && app.Icon.type === GlassIcon
                ? {
                      ...app,
                      Icon: React.cloneElement(app.Icon as React.ReactElement, {
                          glowColor: glow.light,
                          glowColorDark: glow.dark,
                      }),
                  }
                : app
        )
    const leftApps = applyGlow([...productLinks, ...pinnedApps])
    const rightApps = applyGlow(apps)

    const mobileIconListClassName = 'list-none m-0 p-0 flex flex-row flex-wrap pointer-events-auto w-full sm:hidden'
    const desktopIconListClassName = 'list-none m-0 p-0 flex flex-col content-start pointer-events-auto'
    const desktopIconListStyle = {
        height: `calc(100dvh - ${DESKTOP_TOP_OFFSET + 32}px)`,
        maxHeight: `calc(100dvh - ${DESKTOP_TOP_OFFSET + 32}px)`,
    } as const

    return (
        <>
            <ContextMenu
                menuItems={[
                    {
                        type: 'item',
                        children: (
                            <Link href="/about" state={{ newWindow: true }}>
                                about
                            </Link>
                        ),
                    },
                    {
                        type: 'item',
                        children: (
                            <Link href="/display-options" state={{ newWindow: true }}>
                                Display options
                            </Link>
                        ),
                        shortcut: [','],
                    },
                    {
                        type: 'item',
                        children: (
                            <Link href="/kbd" state={{ newWindow: true }}>
                                Keyboard shortcuts
                            </Link>
                        ),
                        shortcut: ['.'],
                    },
                ]}
            >
                <div
                    data-scheme="primary"
                    data-app="Desktop"
                    className="fixed inset-0 pointer-events-none"
                >
                    <Wallpapers wallpaper={siteSettings.wallpaper} reduceMotion={siteSettings.performanceBoost} />

                    <nav className="px-1" style={{ paddingTop: DESKTOP_TOP_OFFSET + 16 }}>
                        <ul className={mobileIconListClassName}>
                            {[...leftApps, ...rightApps].map((app) => (
                                <DesktopIcon key={app.label} app={app} />
                            ))}
                        </ul>
                        <div className="hidden sm:flex sm:justify-between items-start">
                            <ul className={`${desktopIconListClassName} flex-wrap`} style={desktopIconListStyle}>
                                {leftApps.map((app) => (
                                    <DesktopIcon key={app.label} app={app} />
                                ))}
                            </ul>
                            <ul
                                className={`${desktopIconListClassName} flex-wrap-reverse`}
                                style={desktopIconListStyle}
                            >
                                {rightApps.map((app) => (
                                    <DesktopIcon key={app.label} app={app} />
                                ))}
                            </ul>
                        </div>
                    </nav>
                </div>
                <HedgeHogModeEmbed />
            </ContextMenu>
            <NotificationsPanel />
            <ClaudeWorkspaceChatPanel />
            {confetti && (
                <div className="fixed inset-0 pointer-events-none">
                    <ReactConfetti
                        onConfettiComplete={() => setConfetti(false)}
                        recycle={false}
                        numberOfPieces={1200}
                        gravity={0.12}
                        initialVelocityY={20}
                        initialVelocityX={10}
                        tweenDuration={200}
                    />
                    <ReactConfetti
                        recycle={false}
                        numberOfPieces={800}
                        confettiSource={{
                            x: 0,
                            y: 0,
                            w: typeof window !== 'undefined' ? window.innerWidth : 1280,
                            h: typeof window !== 'undefined' ? window.innerHeight : 800,
                        }}
                        initialVelocityY={-8}
                        initialVelocityX={5}
                        gravity={0.15}
                        tweenDuration={1}
                    />
                </div>
            )}
        </>
    )
}

export default React.memo(Desktop)
