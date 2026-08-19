import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'components/Link'
import { useAppActions, useAppSettings, useAppUIState, useAppWindows } from '../../context/App'
import { openAskAiWindow } from '../../lib/open-ask-ai-window'
import { GlassIcon } from 'components/OSIcons'
import { AppIcon, AppItem } from 'components/OSIcons/AppIcon'
import ContextMenu from 'components/RadixUI/ContextMenu'
import DesktopIcon from './DesktopIcon'
import { Screensaver } from '../Screensaver'
import { useInactivityDetection } from '../../hooks/useInactivityDetection'
import NotificationsPanel from 'components/NotificationsPanel'
import { ClaudeWorkspaceChatPanel } from 'components/ClaudeWorkspaceChat'
import Wallpapers, { getWallpaperGlow } from './Wallpapers'
import HedgeHogModeEmbed from 'components/HedgehogMode'
import ReactConfetti from 'react-confetti'
import { useToast } from '../../context/Toast'
import { apps, useProductLinks } from './desktopApps'

export { apps, useProductLinks }

const APP_CONTAINER_TOP_PADDING = 8
const TASKBAR_HEIGHT = 42
const DESKTOP_TOP_OFFSET = APP_CONTAINER_TOP_PADDING + TASKBAR_HEIGHT

function Desktop() {
    const productLinks = useProductLinks()
    const { setScreensaverPreviewActive, setConfetti, updateSiteSettings, addWindow, updateWindow, handleSnapToSide } =
        useAppActions()
    const { siteSettings, compact, isMobile } = useAppSettings()
    const { windows } = useAppWindows()
    const { screensaverPreviewActive, confetti } = useAppUIState()
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
        try {
            const customAppsKey = 'wim_os_desktop_pinned_items'
            const existing = JSON.parse(localStorage.getItem(customAppsKey) || '[]')
            const mapped: AppItem[] = existing.map((item: any) => ({
                label: item.label,
                Icon: <AppIcon name="doc" />,
                url: `/notebooks?id=${item.notebookId}`,
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

    const { isInactive, dismiss } = useInactivityDetection({
        enabled: !siteSettings.screensaverDisabled,
    })
    const { addToast } = useToast()

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

    const handleScreensaverDismiss = () => {
        addToast({
            title: 'Screensaver dismissed',
            description: 'Want to disable it permanently?',
            duration: 10000,
            actionLabel: 'Disable screensaver',
            onAction: () => {
                updateSiteSettings({ ...siteSettings, screensaverDisabled: true })
                addToast({
                    title: 'Screensaver disabled',
                    description: (
                        <>
                            Change this setting in{' '}
                            <Link
                                href="/display-options"
                                className="text-red dark:text-yellow font-semibold"
                                state={{ newWindow: true }}
                            >
                                Display options
                            </Link>
                            .
                        </>
                    ),
                    duration: 10000,
                    onUndo: () => {
                        updateSiteSettings({ ...siteSettings, screensaverDisabled: false })
                    },
                })
            },
        })
        setScreensaverPreviewActive(false)
        dismiss()
    }

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
                {!compact && (
                    <Screensaver
                        isActive={isInactive || screensaverPreviewActive}
                        onDismiss={handleScreensaverDismiss}
                    />
                )}
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
