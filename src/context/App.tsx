/* eslint-disable @typescript-eslint/no-empty-function */
import React, {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
} from 'react'
import dynamic from 'next/dynamic'
import { AppWindow } from './Window'
import { isSafeInternalPath } from 'lib/utils'
import { User } from 'hooks/useUser'
import Start from 'components/Start'
import useDataPipelinesNav from '../navs/useDataPipelinesNav'
import useSourcesNav from '../navs/useSourcesNav'
import initialMenu from '../navs'
import { useToast } from './Toast'
import { themeOptions } from '../hooks/useTheme'
import qs from 'qs'
import usePostHog from '../hooks/usePostHog'
import { mergeWindowUpdate, windowModeFlags, type WindowUpdate } from 'lib/windowState'
import { installSqueakFetchGuard } from 'lib/squeak'
import { isForumPath } from 'components/AppWindow/WindowRouter'
import { findAskAiWindow, findNotebookWindow, windowSlot } from 'lib/open-ask-ai-window'
import { snapLayout } from 'components/AppWindow/SnapAssistOverlay'
import {
    applyWallpaperBrowserChrome,
    DEFAULT_REDUCE_TRANSPARENCY,
    DEFAULT_WALLPAPER,
    migrateAppearanceSettings,
    resolveKeptWallpaper,
} from '../lib/wallpaperChrome'
import { getSessionAccessToken } from 'lib/wim-auth'
import { useWorldAccountSync } from '../hooks/useWorldAccountSync'
import { createWorldRoom } from '../lib/world-account'
import {
    exitVisitingRoom,
    isVisitingRoom,
    readPinnedItems,
    readVisitingRoomToken,
    type WorldSnapshot,
} from '../lib/world-snapshot'

const ContactSales = dynamic(() => import('components/ContactSales'), { ssr: false })

declare global {
    interface Window {
        __setPreferredTheme: (theme: string) => string
        __onThemeChange: (theme: string) => void
    }
}

export interface MenuItem {
    name: string
    url?: string
    icon?: React.ReactNode
    color?: string
    platformLogo?: string
    showChildrenIcons?: boolean
    sortChildrenAlpha?: boolean
    // When set, this item (and its children) is only shown to users for whom the
    // named PostHog feature flag is enabled. Gating is client-side only — see
    // src/hooks/useActiveFeatureFlags.ts and note the static-site caveat.
    featureFlag?: string
    children?: MenuItem[]
    /** Key into dynamicMenus (pipelines / sources nav injects). */
    dynamicChildren?: string
}

export type Menu = MenuItem[]

interface ChatContext {
    type: 'page'
    value: { path: string; label: string }
}

export interface ChatParams {
    path: string
    context?: ChatContext[]
    quickQuestions?: string[]
    chatId?: string
    date?: string
    initialQuestion?: string
    codeSnippet?: { code: string; language: string; sourceUrl: string }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WindowElement = any

interface AppContextType {
    windows: AppWindow[]
    closeWindow: (item: AppWindow) => void
    bringToFront: (item: AppWindow) => void
    setWindowTitle: (appWindow: AppWindow, title: string) => void
    focusedWindow?: AppWindow
    location: any
    minimizeWindow: (appWindow: AppWindow) => void
    taskbarHeight: number
    addWindow: (element: WindowElement | React.ReactElement) => void
    updateWindowRef: (appWindow: AppWindow, ref: React.RefObject<HTMLDivElement>) => void
    updateWindow: (appWindow: AppWindow, updates: WindowUpdate) => AppWindow
    getPositionDefaults: (
        key: string,
        size: { width: number; height: number },
        windows: AppWindow[]
    ) => { x: number; y: number }
    getDesktopCenterPosition: (size: { width: number; height: number }) => { x: number; y: number }
    openSearch: (initialFilter?: string) => void
    handleSnapToSide: (side: 'left' | 'right', target?: AppWindow) => void
    constraintsRef: React.RefObject<HTMLDivElement>
    taskbarRef: React.RefObject<HTMLDivElement>
    expandWindow: (target?: AppWindow) => void
    getExpandedDimensions: () => { position: { x: number; y: number }; size: { width: number; height: number } }
    openSignIn: (onSuccess?: (user: User) => void) => void
    openRegister: () => void
    openForgotPassword: () => void
    siteSettings: SiteSettings
    updateSiteSettings: (settings: SiteSettings) => void
    openNewChat: (params: ChatParams) => void
    isNotificationsPanelOpen: boolean
    setIsNotificationsPanelOpen: (isOpen: boolean) => void
    isClaudeChatOpen: boolean
    setIsClaudeChatOpen: (isOpen: boolean) => void
    isActiveWindowsPanelOpen: boolean
    setIsActiveWindowsPanelOpen: (isOpen: boolean) => void
    isMobile: boolean
    compact: boolean
    menu: Menu
    openStart: ({ subdomain, initialTab }: { subdomain?: string; initialTab?: string }) => void
    animateClosingAllWindows: () => void
    closingAllWindowsAnimation: boolean
    closeAllWindows: () => void
    setClosingAllWindowsAnimation: (isOpen: boolean) => void
    setConfetti: (isActive: boolean) => void
    confetti: boolean
    posthogInstance?: string
    desktopParams?: string
    copyDesktopParams: () => void
    desktopCopied: boolean
    shareableDesktopURL: string
    visitingRoomToken: string | null
    exitSharedRoom: () => void
    windowsInView: AppWindow[]
    searchOpen: boolean
    setSearchOpen: (isOpen: boolean) => void
    searchInitialFilter: string
    chatOpen: boolean
    setChatOpen: (isOpen: boolean) => void
    chatParams: ChatParams | null
    setChatParams: React.Dispatch<React.SetStateAction<ChatParams | null>>
    updateTaskbarHeight: () => void
    isAuthModalOpen: boolean
    setIsAuthModalOpen: (isOpen: boolean) => void
    authModalView: 'sign-in' | 'sign-up' | 'forgot-password'
    authModalOnSuccess: ((user: User) => void) | null
}

// Keys whose identities are stable for the provider's lifetime (callbacks, state
// setters, refs). Split into their own context so consumers that only dispatch
// actions don't re-render when volatile window state changes. See `useAppActions`.
type AppActionKeys =
    | 'closeWindow'
    | 'bringToFront'
    | 'setWindowTitle'
    | 'minimizeWindow'
    | 'addWindow'
    | 'updateWindowRef'
    | 'updateWindow'
    | 'getPositionDefaults'
    | 'getDesktopCenterPosition'
    | 'openSearch'
    | 'handleSnapToSide'
    | 'constraintsRef'
    | 'taskbarRef'
    | 'expandWindow'
    | 'getExpandedDimensions'
    | 'openSignIn'
    | 'openRegister'
    | 'openForgotPassword'
    | 'updateSiteSettings'
    | 'openNewChat'
    | 'setIsNotificationsPanelOpen'
    | 'setIsClaudeChatOpen'
    | 'setIsActiveWindowsPanelOpen'
    | 'openStart'
    | 'animateClosingAllWindows'
    | 'closeAllWindows'
    | 'setClosingAllWindowsAnimation'
    | 'setConfetti'
    | 'copyDesktopParams'
    | 'setSearchOpen'
    | 'setChatOpen'
    | 'setChatParams'
    | 'updateTaskbarHeight'

export type AppActionsContextType = Pick<AppContextType, AppActionKeys> & {
    // A stable ref to the latest windowsInView, for consumers that need the value
    // lazily without subscribing to re-renders.
    windowsInViewRef: React.MutableRefObject<AppWindow[]>
}

// Rarely-changing global state (display settings, environment flags, nav menu).
// Split out so consumers reading only these don't re-render when volatile window
// state (windows, focusedWindow, panels, etc.) changes. See `useAppSettings`.
type AppSettingsKeys = 'siteSettings' | 'compact' | 'isMobile' | 'posthogInstance' | 'menu'

export type AppSettingsContextType = Pick<AppContextType, AppSettingsKeys>

// Transient global UI flags that toggle independently of window state. Split out so
// consumers reading these (e.g. the desktop) don't re-render when windows change.
// See `useAppUIState`.
type AppUIStateKeys =
    | 'isNotificationsPanelOpen'
    | 'isClaudeChatOpen'
    | 'isActiveWindowsPanelOpen'
    | 'closingAllWindowsAnimation'
    | 'confetti'
    | 'searchOpen'
    | 'chatOpen'
    | 'chatParams'

export type AppUIStateContextType = Pick<AppContextType, AppUIStateKeys>

// The volatile window list, isolated into its own context so consumers that only need
// `windows` (e.g. the taskbar, the window list) re-render only when windows actually
// change — not on every unrelated AppProvider render. See `useAppWindows`.
type AppWindowsKeys = 'windows'

export type AppWindowsContextType = Pick<AppContextType, AppWindowsKeys>

interface AppProviderProps {
    children: React.ReactNode
    location: any
    element: {
        element: React.ReactNode
        key: string
        props: {
            path: string
            pageContext: any
            data: any
            params: any
            location: {
                pathname: string
            }
        }
    }
}

const cleanupCustomCursor = () => {
    if (typeof document !== 'undefined') {
        const styleElement = document.getElementById('custom-cursor-style')
        if (styleElement) {
            styleElement.remove()
        }
    }
}

export const Context = createContext<AppContextType>({
    windows: [],
    closeWindow: () => {},
    bringToFront: () => {},
    setWindowTitle: () => null,
    focusedWindow: undefined,
    location: {},
    minimizeWindow: () => {},
    taskbarHeight: 0,
    addWindow: () => {},
    updateWindowRef: () => {},
    updateWindow: (w) => w,
    getPositionDefaults: () => ({ x: 0, y: 0 }),
    getDesktopCenterPosition: () => ({ x: 0, y: 0 }),
    openSearch: () => {},
    handleSnapToSide: () => {},
    constraintsRef: { current: null },
    taskbarRef: { current: null },
    expandWindow: () => {},
    getExpandedDimensions: () => ({ position: { x: 0, y: 0 }, size: { width: 0, height: 0 } }),
    openSignIn: () => null,
    openRegister: () => {},
    openForgotPassword: () => {},
    siteSettings: {
        theme: 'light',
        colorMode: 'light',
        skinMode: 'modern',
        wallpaper: DEFAULT_WALLPAPER,
        reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
        clickBehavior: 'double',
        performanceBoost: false,
    },
    updateSiteSettings: () => {},
    openNewChat: () => {},
    isNotificationsPanelOpen: false,
    setIsNotificationsPanelOpen: () => {},
    isClaudeChatOpen: false,
    setIsClaudeChatOpen: () => {},
    isActiveWindowsPanelOpen: false,
    setIsActiveWindowsPanelOpen: () => {},
    isMobile: false,
    compact: false,
    menu: [],
    openStart: () => {},
    animateClosingAllWindows: () => {},
    closingAllWindowsAnimation: false,
    closeAllWindows: () => {},
    setClosingAllWindowsAnimation: () => {},
    setConfetti: () => {},
    confetti: false,
    posthogInstance: undefined,
    desktopParams: undefined,
    copyDesktopParams: () => {},
    desktopCopied: false,
    shareableDesktopURL: '',
    visitingRoomToken: null,
    exitSharedRoom: () => {},
    windowsInView: [],
    searchOpen: false,
    setSearchOpen: () => {},
    searchInitialFilter: '',
    chatOpen: false,
    setChatOpen: () => {},
    chatParams: null,
    setChatParams: () => {},
    updateTaskbarHeight: () => {},
    isAuthModalOpen: false,
    setIsAuthModalOpen: () => {},
    authModalView: 'sign-in',
    authModalOnSuccess: null,
})

// Stable-identity actions context. Consumers that only dispatch actions (open/close
// windows, toggle panels, etc.) should read from `useAppActions()` so they don't
// re-render when volatile app state changes.
export const ActionsContext = createContext<AppActionsContextType>({
    closeWindow: () => {},
    bringToFront: () => {},
    setWindowTitle: () => null,
    minimizeWindow: () => {},
    addWindow: () => {},
    updateWindowRef: () => {},
    updateWindow: (w) => w,
    getPositionDefaults: () => ({ x: 0, y: 0 }),
    getDesktopCenterPosition: () => ({ x: 0, y: 0 }),
    openSearch: () => {},
    handleSnapToSide: () => {},
    constraintsRef: { current: null },
    taskbarRef: { current: null },
    expandWindow: () => {},
    getExpandedDimensions: () => ({ position: { x: 0, y: 0 }, size: { width: 0, height: 0 } }),
    openSignIn: () => null,
    openRegister: () => {},
    openForgotPassword: () => {},
    updateSiteSettings: () => {},
    openNewChat: () => {},
    setIsNotificationsPanelOpen: () => {},
    setIsClaudeChatOpen: () => {},
    setIsActiveWindowsPanelOpen: () => {},
    openStart: () => {},
    animateClosingAllWindows: () => {},
    closeAllWindows: () => {},
    setClosingAllWindowsAnimation: () => {},
    setConfetti: () => {},
    copyDesktopParams: () => {},
    setSearchOpen: () => {},
    setChatOpen: () => {},
    setChatParams: () => {},
    updateTaskbarHeight: () => {},
    windowsInViewRef: { current: [] },
})

// Rarely-changing settings context. Consumers that only read display settings /
// environment flags / the nav menu should read from `useAppSettings()` so they
// don't re-render when volatile window state changes.
export const SettingsContext = createContext<AppSettingsContextType>({
    siteSettings: {
        theme: 'light',
        colorMode: 'light',
        skinMode: 'modern',
        wallpaper: DEFAULT_WALLPAPER,
        reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
        clickBehavior: 'double',
        performanceBoost: false,
    },
    compact: false,
    isMobile: false,
    posthogInstance: undefined,
    menu: [],
})

// Transient UI-flags context. Consumers reading only these (panels, confetti,
// search) should read from `useAppUIState()` so they don't re-render
// when volatile window state changes.
export const UIStateContext = createContext<AppUIStateContextType>({
    isNotificationsPanelOpen: false,
    isClaudeChatOpen: false,
    isActiveWindowsPanelOpen: false,
    closingAllWindowsAnimation: false,
    confetti: false,
    searchOpen: false,
    chatOpen: false,
    chatParams: null,
})

export const WindowsContext = createContext<AppWindowsContextType>({
    windows: [],
})

export interface AppSetting {
    experiment?: {
        variant: 'control' | 'test'
        flag: string
    }
    size?: {
        min: { width: number; height: number }
        max: { width: number; height: number }
        fixed?: boolean
        autoHeight?: boolean
    }
    position?: {
        center?: boolean // Centers window both horizontally and vertically
        topCenter?: boolean // Centers horizontally, anchors from top (100px desktop only, 0px mobile)
        getPositionDefaults?: (
            size: { width: number; height: number },
            windows: AppWindow[],
            getDesktopCenterPosition: (size: { width: number; height: number }) => { x: number; y: number }
        ) => { x: number; y: number }
    }
    modal?: {
        type: 'standard' | 'side' | 'floating'
    }
    closeOnEscape?: boolean
    toolbar?: boolean
    hideTitle?: boolean
}

export interface AppSettings {
    [key: string]: AppSetting
}

const appSettings: AppSettings = {
    '/': {
        experiment: {
            variant: 'control',
            flag: 'homepage-test',
        },
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 1200,
                height: 1500,
            },
            fixed: false,
        },
        position: {
            center: true,
            getPositionDefaults: (size, _windows, getDesktopCenterPosition) => {
                if (typeof window === 'undefined') {
                    return {
                        x: 0,
                        y: 0,
                    }
                }

                const { x, y } = getDesktopCenterPosition(size)
                const iconColumnRight = 145
                const keyboardGardenImageLeft = window.innerWidth - 700
                if (x + size.width > keyboardGardenImageLeft) {
                    const availableWidth = keyboardGardenImageLeft - iconColumnRight
                    const newX = iconColumnRight + Math.max(0, (availableWidth - size.width) / 2)
                    return { x: newX, y }
                }
                return { x, y }
            },
        },
    },
    '/ko': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 960,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
            getPositionDefaults: (size, _windows, getDesktopCenterPosition) => {
                if (typeof window === 'undefined') {
                    return {
                        x: 0,
                        y: 0,
                    }
                }

                const { x, y } = getDesktopCenterPosition(size)
                const iconColumnRight = 145
                const keyboardGardenImageLeft = window.innerWidth - 700
                if (x + size.width > keyboardGardenImageLeft) {
                    const availableWidth = keyboardGardenImageLeft - iconColumnRight
                    const newX = iconColumnRight + Math.max(0, (availableWidth - size.width) / 2)
                    return { x: newX, y }
                }
                return { x, y }
            },
        },
    },
    '/products': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 960,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
            getPositionDefaults: (size, _windows, getDesktopCenterPosition) => {
                if (typeof window === 'undefined') {
                    return {
                        x: 0,
                        y: 0,
                    }
                }

                const { x, y } = getDesktopCenterPosition(size)
                const iconColumnRight = 145
                const keyboardGardenImageLeft = window.innerWidth - 700
                if (x + size.width > keyboardGardenImageLeft) {
                    const availableWidth = keyboardGardenImageLeft - iconColumnRight
                    const newX = iconColumnRight + Math.max(0, (availableWidth - size.width) / 2)
                    return { x: newX, y }
                }
                return { x, y }
            },
        },
    },
    '/wizard': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/mcp': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/tooling': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 1000,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/desktop': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/research': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/replay-vision': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    'home-test': {
        experiment: {
            variant: 'test',
            flag: 'homepage-test',
        },
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 1200,
                height: 900,
            },
            fixed: false,
        },
        position: {
            center: true,
            getPositionDefaults: (size, _windows, getDesktopCenterPosition) => {
                if (typeof window === 'undefined') {
                    return {
                        x: 0,
                        y: 0,
                    }
                }

                const { x, y } = getDesktopCenterPosition(size)
                const iconColumnRight = 145
                const keyboardGardenImageLeft = window.innerWidth - 700
                if (x + size.width > keyboardGardenImageLeft) {
                    const availableWidth = keyboardGardenImageLeft - iconColumnRight
                    const newX = iconColumnRight + Math.max(0, (availableWidth - size.width) / 2)
                    return { x: newX, y }
                }
                return { x, y }
            },
        },
    },
    '/paint': {
        size: {
            min: {
                width: 850,
                height: 400,
            },
            max: {
                width: 2000,
                height: 2000,
            },
            fixed: false,
        },
    },
    '/talk-to-a-human': {
        size: {
            min: {
                width: 500,
                height: 500,
            },
            max: {
                width: 700,
                height: 552,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    '/merch/orders': {
        size: {
            min: {
                width: 470,
                height: 299,
            },
            max: {
                width: 470,
                height: 299,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    '/services': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 850,
                height: 1000,
            },
        },
    },
    '/about': {
        size: {
            min: {
                width: 750,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/partnerships': {
        size: {
            min: {
                width: 700,
                height: 500,
            },
            max: {
                width: 900,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/data-stack': {
        size: {
            min: {
                width: 750,
                height: 500,
            },
            max: {
                width: 1000,
                height: 1000,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/signup': {
        size: {
            min: {
                width: 900,
                height: 750,
            },
            max: {
                width: 900,
                height: 750,
            },
            fixed: true,
        },
    },
    '/connect/posthog/redirect': {
        size: {
            min: {
                width: 425,
                height: 250,
            },
            max: {
                width: 425,
                height: 280,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    '/display-options': {
        closeOnEscape: true,
        size: {
            min: {
                width: 600,
                height: 550,
            },
            max: {
                width: 600,
                height: 550,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
        toolbar: true,
    },
    '/terms': {
        size: {
            min: {
                width: 1,
                height: 1,
            },
            max: {
                width: 10000,
                height: 10000,
            },
        },
        position: {
            center: true,
        },
    },
    '/privacy': {
        size: {
            min: {
                width: 1,
                height: 1,
            },
            max: {
                width: 10000,
                height: 10000,
            },
        },
        position: {
            center: true,
        },
    },
    '/dpa': {
        size: {
            min: {
                width: 1,
                height: 1,
            },
            max: {
                width: 10000,
                height: 10000,
            },
        },
        position: {
            center: true,
        },
    },
    '/baa': {
        size: {
            min: {
                width: 1,
                height: 1,
            },
            max: {
                width: 10000,
                height: 10000,
            },
        },
        position: {
            center: true,
        },
    },
    '/vibe-check': {
        closeOnEscape: true,
        size: {
            min: {
                width: 750,
                height: 575,
            },
            max: {
                width: 750,
                height: 575,
            },
            fixed: true,
        },
        position: {
            center: true,
        },
    },
    '/credits': {
        closeOnEscape: true,
        size: {
            min: {
                width: 300,
                height: 700,
            },
            max: {
                width: 300,
                height: 700,
            },
            fixed: true,
        },
        position: {
            center: true,
        },
    },
    '/kbd': {
        closeOnEscape: true,
        size: {
            min: {
                width: 600,
                height: 625,
            },
            max: {
                width: 600,
                height: 625,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    'research-talk': {
        size: {
            min: {
                width: 960,
                height: 682,
            },
            max: {
                width: 960,
                height: 682,
            },
            fixed: false,
            autoHeight: true,
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    '/demo': {
        toolbar: true,
        size: {
            min: {
                width: 960,
                height: 682,
            },
            max: {
                width: 960,
                height: 682,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    '/changelog-video': {
        size: {
            min: {
                width: 960,
                height: 682,
            },
            max: {
                width: 960,
                height: 682,
            },
            fixed: false,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    '/videos/play': {
        size: {
            min: {
                width: 960,
                height: 480,
            },
            max: {
                width: 1440,
                height: 810,
            },
            fixed: false,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    '/sales': {
        size: {
            min: {
                width: 875,
                height: 600,
            },
            max: {
                width: 1100,
                height: 900,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    '/spicy.mov': {
        size: {
            min: {
                width: 960,
                height: 682,
            },
            max: {
                width: 960,
                height: 682,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
        toolbar: true,
    },
    cher: {
        size: {
            min: {
                width: 960,
                height: 682,
            },
            max: {
                width: 960,
                height: 682,
            },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
    'ask-max': {
        size: {
            min: {
                width: 400,
                height: 600,
            },
            max: {
                width: 400,
                height: 600,
            },
            fixed: false,
        },
        modal: {
            type: 'floating',
        },
    },
    'community-auth-signin': {
        size: {
            min: {
                width: 470,
                height: 299,
            },
            max: {
                width: 470,
                height: 299,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    'community-auth-register': {
        size: {
            min: {
                width: 470,
                height: 299,
            },
            max: {
                width: 470,
                height: 299,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    search: {
        size: {
            min: {
                width: 550,
                height: 72,
            },
            max: {
                width: 800,
                height: 72,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            topCenter: true,
        },
    },
    '/reset-password': {
        size: {
            min: {
                width: 470,
                height: 299,
            },
            max: {
                width: 470,
                height: 299,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    'community-auth-forgot-password': {
        size: {
            min: {
                width: 470,
                height: 299,
            },
            max: {
                width: 470,
                height: 299,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    share: {
        size: {
            min: {
                width: 500,
                height: 500,
            },
            max: {
                width: 500,
                height: 500,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    'media-upload': {
        size: {
            min: {
                width: 900,
                height: 500,
            },
            max: {
                width: 900,
                height: 800,
            },
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
        toolbar: true,
    },
    'hedgehog-generator': {
        size: {
            min: {
                width: 550,
                height: 650,
            },
            max: {
                width: 550,
                height: 650,
            },
            autoHeight: true,
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    'cool-tech-jobs-issue': {
        size: {
            min: {
                width: 500,
                height: 500,
            },
            max: {
                width: 500,
                height: 500,
            },
            fixed: true,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    'cool-tech-jobs-add-a-job': {
        size: {
            min: {
                width: 600,
                height: 400,
            },
            max: {
                width: 600,
                height: 775,
            },
        },
        position: {
            center: true,
        },
    },
    'signup-embed': {
        size: {
            min: {
                width: 500,
                height: 400,
            },
            max: {
                width: 500,
                height: 400,
            },
            fixed: true,
        },
        position: {
            center: true,
        },
    },
    'ask-a-question': {
        size: {
            min: {
                width: 600,
                height: 500,
            },
            max: {
                width: 600,
                height: 500,
            },
            // Regular window — fixed:true draws the full-site bg-black/50 dimmer.
            fixed: false,
            autoHeight: true,
        },
        position: {
            center: true,
        },
    },
    'application-success': {
        size: {
            min: {
                width: 575,
                height: 500,
            },
            max: {
                width: 575,
                height: 1000,
            },
            autoHeight: true,
            fixed: true,
        },
        position: {
            center: true,
        },
    },
    'edit-roadmap': {
        size: {
            min: {
                width: 650,
                height: 500,
            },
            max: {
                width: 650,
                height: 800,
            },
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    'add-roadmap': {
        size: {
            min: {
                width: 650,
                height: 500,
            },
            max: {
                width: 650,
                height: 800,
            },
        },
        position: {
            center: true,
        },
    },
    '/community/achievements': {
        size: {
            min: {
                width: 500,
                height: 650,
            },
            max: {
                width: 500,
                height: 650,
            },
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    '/community/reputation': {
        size: {
            min: {
                width: 500,
                height: 1000,
            },
            max: {
                width: 500,
                height: 1000,
            },
            autoHeight: true,
        },
        position: {
            center: true,
        },
        modal: {
            type: 'standard',
        },
    },
    '/fm': {
        size: {
            min: {
                width: 1100,
                height: 660,
            },
            max: {
                width: 1100,
                height: 660,
            },
            fixed: true,
        },
    },
    'fm/mixtapes': {
        size: {
            min: {
                width: 450,
                height: 709,
            },
            max: {
                width: 450,
                height: 709,
            },
            fixed: true,
        },
    },
    '/fm/mixtapes/new': {
        size: {
            min: {
                width: 850,
                height: 597,
            },
            max: {
                width: 850,
                height: 597,
            },
            fixed: true,
        },
    },
    '/fm/mixtapes/edit/:id': {
        size: {
            min: {
                width: 850,
                height: 597,
            },
            max: {
                width: 850,
                height: 597,
            },
            fixed: true,
        },
    },
    'fm/dance-mode': {
        size: {
            min: {
                width: 500,
                height: 500,
            },
            max: {
                width: 500,
                height: 500,
            },
            fixed: true,
        },
    },
    '/docs': {
        toolbar: true,
    },
    '/merch': {
        toolbar: true,
        hideTitle: true,
    },
    '/trash': {
        toolbar: true,
    },
    '/web-analytics': {
        toolbar: true,
    },
    '/feature-flags': {
        toolbar: true,
    },
    '/experiments': {
        toolbar: true,
    },
    '/surveys': {
        toolbar: true,
    },
    '/error-tracking': {
        toolbar: true,
    },
    '/logs': {
        toolbar: true,
    },
    '/workflows': {
        toolbar: true,
    },
    '/endpoints': {
        toolbar: true,
    },
    '/ai': {
        toolbar: true,
    },
    '/ai-observability': {
        toolbar: true,
    },
    '/mcp-analytics': {
        toolbar: true,
    },
    '/hog': {
        toolbar: true,
    },
    '/changelog': {
        toolbar: true,
    },
    '/feet-pics': {
        toolbar: true,
    },
} as const

export interface SiteSettings {
    colorMode: 'light' | 'dark' | 'system'
    /** Stored theme; runtime may briefly pass broader strings from window.__onThemeChange. */
    theme: 'light' | 'dark' | string
    skinMode: 'modern' | 'classic'
    wallpaper:
        | 'cobalt'
        | 'hogzilla'
        | 'keyboard-mint'
        | 'draft-world'
        | 'rain-embers'
        | 'plaza-bang'
    reduceTransparency?: boolean
    clickBehavior?: 'single' | 'double'
    performanceBoost?: boolean
    siteDefaultsVersion?: number
}

const isLabel = (item: any) => !item?.url && item?.name

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const getInitialSiteSettings = (): SiteSettings => {
    let stored: Partial<SiteSettings> = {}
    try {
        stored =
            typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('siteSettings') || '{}') : {}
    } catch {
        stored = {}
    }

    const siteSettings: SiteSettings = migrateAppearanceSettings({
        colorMode: (typeof window !== 'undefined' && (window as any).__theme) || 'light',
        theme: (typeof window !== 'undefined' && (window as any).__theme) || 'light',
        skinMode: 'modern',
        wallpaper: DEFAULT_WALLPAPER,
        clickBehavior: 'double',
        performanceBoost: false,
        reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
        ...stored,
    })

    siteSettings.wallpaper = resolveKeptWallpaper(siteSettings.wallpaper)

    // The classic skin has been retired; force anyone with it saved back to modern
    siteSettings.skinMode = 'modern'

    if (typeof window !== 'undefined' && siteSettings.siteDefaultsVersion !== stored.siteDefaultsVersion) {
        try {
            localStorage.setItem('siteSettings', JSON.stringify(siteSettings))
        } catch {
            /* ignore */
        }
    }

    return siteSettings
}

export const Provider = ({ children, element, location }: AppProviderProps) => {
    const isSSR = typeof window === 'undefined'
    const [hasMounted, setHasMounted] = useState(false)
    const layoutRestoredRef = useRef(false)

    useEffect(() => {
        setHasMounted(true)
        // Block accidental Squeak/Strapi fetches (WIM is Supabase-only)
        const uninstallSqueakGuard = installSqueakFetchGuard()
        return () => {
            uninstallSqueakGuard()
        }
    }, [])

    const routerRef = useRef<any>(null)
    useEffect(() => {
        // Capture router on client only to avoid SSR crash
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            routerRef.current = require('next/router').default
        } catch (e) {
            // ignore
        }
    }, [])

    const safePush = useCallback(
        (url: string, opts?: any) => {
            try {
                if (typeof window !== 'undefined') {
                    const next = new URL(url, window.location.origin)
                    if (next.pathname === window.location.pathname && next.search === window.location.search) {
                        return
                    }
                }
                const r = routerRef.current
                if (r && typeof r.push === 'function') {
                    r.push(url, undefined, opts)
                } else if (typeof window !== 'undefined') {
                    window.location.href = url
                }
            } catch (e) {
                if (typeof window !== 'undefined') {
                    window.location.href = url
                }
            }
        },
        []
    )

    const [compact, setCompact] = useState(false)
    const constraintsRef = useRef<HTMLDivElement>(null)
    const taskbarRef = useRef<HTMLDivElement>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({
        colorMode: 'light',
        theme: 'light',
        skinMode: 'modern',
        wallpaper: DEFAULT_WALLPAPER,
        clickBehavior: 'double',
        performanceBoost: false,
        reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
    })
    const [taskbarHeight, setTaskbarHeight] = useState(59)
    const [lastClickedElementRect, setLastClickedElementRect] = useState<{ x: number; y: number } | null>(null)
    const [desktopCopied, setDesktopCopied] = useState(false)
    const [pinEpoch, setPinEpoch] = useState(0)
    const [visitingRoomToken, setVisitingRoomToken] = useState<string | null>(null)
    const [lastRoomURL, setLastRoomURL] = useState('')
    const copyingRoomRef = useRef(false)
    const [windowsInView, setWindowsInView] = useState<AppWindow[]>([])
    // Stable ref mirror of windowsInView so consumers that only need the latest value
    // lazily can read it without subscribing to the volatile context and re-rendering on every provider render.
    const windowsInViewRef = useRef(windowsInView)
    useEffect(() => {
        windowsInViewRef.current = windowsInView
    }, [windowsInView])
    const stateWindows = (element as any)?.props?.location?.state?.savedWindows
    const posthog = usePostHog()

    const [windows, setWindows] = useState<AppWindow[]>(() => {
        if (isSSR) {
            return [createNewWindow(element as WindowElement, [], location, true, taskbarHeight)]
        }
        let queryString = ''
        try {
            if (location?.search) {
                queryString = typeof location.search === 'string' ? (typeof location?.search === 'string' ? location.search.substring(1) : '') : ''
            } else if (location?.href) {
                const urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com')
                queryString = urlObj?.search.substring(1)
            }
        } catch {
            queryString = ''
        }
        const parsed = qs.parse(queryString)
        if (parsed?.windows) return []
        return getInitialWindows(element)
    })
    const windowsRef = useRef(windows)
    useEffect(() => {
        windowsRef.current = windows
    }, [windows])
    const focusedWindow = useMemo(() => {
        return windows.reduce<AppWindow | undefined>(
            (highest, current) => (current.zIndex > (highest?.zIndex ?? -1) ? current : highest),
            undefined
        )
    }, [windows])
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false)
    const [isClaudeChatOpen, setIsClaudeChatOpen] = useState(false)
    const [isActiveWindowsPanelOpen, setIsActiveWindowsPanelOpen] = useState(false)
    const [closingAllWindowsAnimation, setClosingAllWindowsAnimation] = useState(false)
    const [confetti, setConfetti] = useState(false)
    const [posthogInstance, setPosthogInstance] = useState<string>()
    const [searchOpen, setSearchOpen] = useState<boolean>(false)
    const [searchInitialFilter, setSearchInitialFilter] = useState<string>('')
    const [chatOpen, setChatOpen] = useState<boolean>(false)
    const [chatParams, setChatParams] = useState<ChatParams | null>(null)
    const { addToast } = useToast()

    // Hydrate client-only state before first paint to avoid layout flash
    useIsomorphicLayoutEffect(() => {
        const compactValue = window !== window.parent
        const isMobileValue = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        setCompact(compactValue)
        setIsMobile(isMobileValue)
        setSiteSettings(getInitialSiteSettings())

        if (isMobileValue) {
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : window.innerWidth - 16
            const fullH = bounds ? bounds.height : window.innerHeight - taskbarHeight - 16
            setWindows((prev) =>
                prev.map((w) => ({
                    ...w,
                    size: { width: fullW, height: fullH },
                    expanded: true,
                    windowed: true,
                    position: { x: 0, y: 0 },
                }))
            )
        }
    }, [])

    useEffect(() => {
        if (!hasMounted || isMobile || layoutRestoredRef.current) return
        if (isVisitingRoom()) {
            layoutRestoredRef.current = true
            return
        }

        try {
            const saved = JSON.parse(localStorage.getItem('worldinmaking-window-layout:v1') || '{}')
            if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
                setWindows((prev) =>
                    prev.map((win) => {
                        const stored = saved[win.path]
                        if (
                            !stored ||
                            typeof stored !== 'object' ||
                            typeof stored.size?.width !== 'number' ||
                            typeof stored.size?.height !== 'number' ||
                            typeof stored.position?.x !== 'number' ||
                            typeof stored.position?.y !== 'number'
                        ) {
                            return win
                        }
                        return {
                            ...win,
                            size: { ...win.size, ...stored.size },
                            position: { ...win.position, ...stored.position },
                            expanded: stored.expanded ?? win.expanded,
                            snapped: stored.snapped ?? win.snapped,
                            windowed: stored.windowed ?? win.windowed,
                        }
                    })
                )
            }
        } catch {
            // Ignore malformed layout data and use the default window positions.
            localStorage.removeItem('worldinmaking-window-layout:v1')
        }
        layoutRestoredRef.current = true
    }, [hasMounted, isMobile])

    useEffect(() => {
        if (!layoutRestoredRef.current || isMobile || isVisitingRoom()) return

        const layout = windows.reduce<Record<string, unknown>>((result, win) => {
            if (win.path.startsWith('/')) {
                result[win.path] = {
                    size: win.size,
                    position: win.position,
                    expanded: win.expanded,
                    snapped: win.snapped,
                    windowed: win.windowed,
                }
            }
            return result
        }, {})

        try {
            localStorage.setItem('worldinmaking-window-layout:v1', JSON.stringify(layout))
        } catch {
            // Storage can be unavailable in private browsing or embedded contexts.
        }
    }, [windows, isMobile])

    const destinationNav = useDataPipelinesNav({ type: 'destination' })
    const transformationNav = useDataPipelinesNav({ type: 'transformation' })
    const sourceWebhooksNav = useDataPipelinesNav({ type: 'source_webhook' })
    const cdpSourcesNav = useSourcesNav('/docs/cdp/sources')
    const dwSourcesNav = useSourcesNav('/docs/data-warehouse/sources')

    const dynamicMenus = useMemo(
        () => ({
            'data-pipeline-destinations': destinationNav,
            'data-pipeline-transformations': transformationNav,
            'data-pipeline-source-webhooks': sourceWebhooksNav,
            'data-pipeline-sources': cdpSourcesNav,
            'data-warehouse-sources': dwSourcesNav,
        }),
        [destinationNav, transformationNav, sourceWebhooksNav, cdpSourcesNav, dwSourcesNav]
    )

    const desktopParams = useMemo(() => {
        if (isSSR) return undefined
        const innerWidth = window.innerWidth
        const innerHeight = window.innerHeight

        const savedWindows = [...windows]
            .filter((win) => !win.minimized && win.path.startsWith('/'))
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((win) => ({
                path: win.path,
                position: {
                    x: (win.position.x / innerWidth) * 100,
                    y: (win.position.y / (innerHeight - taskbarHeight)) * 100,
                },
                size: {
                    width: (win.size.width / innerWidth) * 100,
                    height: (win.size.height / innerHeight) * 100,
                },
                zIndex: win.zIndex,
            }))

        if (savedWindows.length === 0) return undefined

        // Preserve existing query parameters from the current URL
        const currentParams = qs.parse((typeof location?.search === 'string' ? location.search.substring(1) : ''))
        const allParams = {
            ...currentParams,
            windows: savedWindows,
        }

        return `${location.pathname}?${qs.stringify(allParams, { encode: false })}`
    }, [windows, taskbarHeight, location, isSSR])

    const shareableDesktopURL = useMemo(() => {
        if (isSSR) return ''
        const origin =
            (typeof window !== 'undefined' && window.location.origin) ||
            (typeof location?.origin === 'string' ? location.origin : '')
        if (visitingRoomToken) return `${origin}/room/${visitingRoomToken}`
        if (lastRoomURL) return lastRoomURL
        return ''
    }, [location, isSSR, visitingRoomToken, lastRoomURL])

    const collectSnapshot = useCallback((): WorldSnapshot => {
        const innerWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
        const innerHeight = typeof window !== 'undefined' ? window.innerHeight : 800
        const heightBudget = Math.max(1, innerHeight - taskbarHeight)
        const savedWindows = [...windows]
            .filter((win) => !win.minimized && win.path.startsWith('/'))
            .sort((a, b) => a.zIndex - b.zIndex)
            .slice(0, 12)
            .map((win) => ({
                path: win.path.slice(0, 200),
                position: {
                    x: (win.position.x / innerWidth) * 100,
                    y: (win.position.y / heightBudget) * 100,
                },
                size: {
                    width: (win.size.width / innerWidth) * 100,
                    height: (win.size.height / innerHeight) * 100,
                },
                zIndex: win.zIndex,
            }))
        return {
            v: 1,
            wallpaper: resolveKeptWallpaper(siteSettings.wallpaper),
            colorMode: siteSettings.colorMode,
            reduceTransparency: !!siteSettings.reduceTransparency,
            clickBehavior: siteSettings.clickBehavior === 'single' ? 'single' : 'double',
            windows: savedWindows,
            pinnedItems: readPinnedItems(),
        }
    }, [windows, siteSettings, taskbarHeight])

    const applySnapshot = useCallback(
        (snapshot: WorldSnapshot, opts?: { reopenWindows?: boolean }) => {
            const visiting = isVisitingRoom()
            const next: SiteSettings = {
                ...siteSettings,
                wallpaper: snapshot.wallpaper,
                colorMode: snapshot.colorMode,
                reduceTransparency: !!snapshot.reduceTransparency,
                clickBehavior: snapshot.clickBehavior,
            }
            setSiteSettings(next)
            if (!visiting) {
                try {
                    localStorage.setItem('siteSettings', JSON.stringify(next))
                } catch {
                    /* ignore */
                }
            }
            if (snapshot.colorMode === 'dark' || snapshot.colorMode === 'light') {
                try {
                    window.__setPreferredTheme?.(snapshot.colorMode)
                } catch {
                    /* ignore */
                }
            }
            if (visiting) {
                setVisitingRoomToken(readVisitingRoomToken() || null)
            }
            if (!opts?.reopenWindows || snapshot.windows.length === 0) return

            const innerWidth = window.innerWidth
            const innerHeight = window.innerHeight
            const isMobileClient =
                innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : innerWidth - 16
            const fullH = bounds ? bounds.height : innerHeight - taskbarHeight - 16
            layoutRestoredRef.current = true
            setWindows(
                snapshot.windows.map((win, i) => {
                    const size = {
                        width: (win.size.width / 100) * innerWidth,
                        height: (win.size.height / 100) * innerHeight,
                    }
                    const position = {
                        x: (win.position.x / 100) * innerWidth,
                        y: (win.position.y / 100) * (innerHeight - taskbarHeight),
                    }
                    const label = win.path.split('/').filter(Boolean).pop() || 'Window'
                    return {
                        key: `${win.path}#${i}`,
                        path: win.path,
                        title: label,
                        meta: { title: label },
                        size: isMobileClient ? { width: fullW, height: fullH } : size,
                        position: isMobileClient ? { x: 0, y: 0 } : position,
                        previousSize: size,
                        previousPosition: position,
                        sizeConstraints: {
                            min: { width: 280, height: 180 },
                            max: { width: fullW, height: fullH },
                        },
                        fixedSize: false,
                        element: null,
                        zIndex: win.zIndex || i + 1,
                        minimized: false,
                        windowed: true,
                        expanded: isMobileClient,
                        snapped: false as const,
                        fromHistory: false,
                        props: { path: win.path },
                    }
                })
            )
        },
        [siteSettings, taskbarHeight]
    )

    const worldEpoch = `${siteSettings.wallpaper}|${siteSettings.colorMode}|${
        siteSettings.reduceTransparency ? '1' : '0'
    }|${siteSettings.clickBehavior || 'double'}|${desktopParams || ''}|${pinEpoch}`

    useWorldAccountSync({
        worldEpoch,
        collectSnapshot,
        applySnapshot,
    })

    useEffect(() => {
        setVisitingRoomToken(readVisitingRoomToken() || null)
        const bump = () => setPinEpoch((n) => n + 1)
        window.addEventListener('wimDesktopPinnedChanged', bump)
        return () => window.removeEventListener('wimDesktopPinnedChanged', bump)
    }, [])

    const injectDynamicChildren = useCallback((menu: Menu) => {
        return menu?.map((item) => {
            const processedItem = { ...item }

            if (item.dynamicChildren && (dynamicMenus as any)[item.dynamicChildren]) {
                const newChildren = [
                    ...(item.children || []),
                    ...(dynamicMenus as any)[item.dynamicChildren],
                ].reduce((acc: MenuItem[][], child: MenuItem) => {
                    if (isLabel(child)) {
                        acc.push([child])
                    } else {
                        const lastGroup = acc[acc.length - 1]
                        if (!lastGroup || isLabel(lastGroup[lastGroup.length - 1])) {
                            acc.push([child])
                        } else {
                            lastGroup.push(child)
                        }
                    }
                    return acc
                }, [] as MenuItem[][])

                newChildren.forEach((group: MenuItem[]) => {
                    group.sort((a: MenuItem, b: MenuItem) => {
                        if (!a.url || !b.url) return 0
                        return a.name.localeCompare(b.name)
                    })
                })

                processedItem.children = newChildren.flat()
            }

            if (processedItem.children && processedItem.children.length > 0) {
                processedItem.children = injectDynamicChildren(processedItem.children)
            }

            return processedItem
        })
    }, [])

    // Stabilize identity so the settings context (and `menu` consumers) don't churn
    // on every provider render. `injectDynamicChildren` is referentially stable.
    const menu = useMemo(() => injectDynamicChildren(initialMenu), [injectDynamicChildren])

    const closeWindow = useCallback((itemOrKey?: string | AppWindow) => {
        if (!itemOrKey) return
        const targetKey = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key || itemOrKey.path
        setWindows((prev) => {
            const filtered = prev.filter((w) => w.key !== targetKey && w.path !== targetKey && w !== itemOrKey)
            const sorted = [...filtered].sort((a, b) => a.zIndex - b.zIndex)
            return sorted.map((w, idx) => ({
                ...w,
                zIndex: idx + 1,
            }))
        })
    }, [])

    const bringToFront = useCallback(
        (
            itemOrKey: string | AppWindow,
            location?: Location,
            additional: {
                expanded?: boolean
                windowed?: boolean
                snapped?: 'left' | 'right' | false
                size?: { width: number; height: number }
                position?: { x: number; y: number }
            } = {}
        ) => {
            const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key || itemOrKey?.path
            setWindows((prev) => {
                const existing = prev.find((w) => w.key === key || w.path === key || w === itemOrKey)
                if (!existing) return prev
                const maxZIndex = Math.max(...prev.map((w) => w.zIndex), 0)
                if (existing.zIndex === maxZIndex && !existing.minimized && Object.keys(additional).length === 0) {
                    return prev
                }

                return prev.map((el) => {
                    const isTarget = el.key === existing.key || el.path === existing.path || el === existing
                    const newZIndex = isTarget ? maxZIndex + 1 : el.zIndex > existing.zIndex ? el.zIndex - 1 : el.zIndex
                    const newMinimized = isTarget ? false : el.minimized
                    const newLocation = isTarget ? location || el.location : el.location

                    if (!isTarget && newZIndex === el.zIndex && newMinimized === el.minimized && newLocation === el.location) {
                        return el
                    }

                    return {
                        ...el,
                        zIndex: newZIndex,
                        minimized: newMinimized,
                        location: newLocation,
                        ...(isTarget ? additional : {}),
                    }
                })
            })
        },
        []
    )

    const setWindowTitle = useCallback((itemOrKey: string | AppWindow, title: string) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key || itemOrKey?.path
        setWindows((windows) => windows.map((w) => (w.key === key || w.path === key || w === itemOrKey ? { ...w, meta: { title } } : w)))
    }, [])

    const minimizeWindow = useCallback((itemOrKey: string | AppWindow) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key || itemOrKey?.path
        setWindows((windows) => windows.map((w) => (w.key === key || w.path === key || w === itemOrKey ? { ...w, minimized: true } : w)))
    }, [])

    function getWindowBasedSizeConstraints() {
        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        return {
            min: {
                width: viewportW * 0.2,
                height: viewportH * 0.2,
            },
            max: {
                width: viewportW * 0.9,
                height: viewportH * 0.9,
            },
        }
    }

    function getDesktopCenterPosition(size: { width: number; height: number }) {
        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        return {
            x: Math.max(0, viewportW / 2 - size.width / 2),
            y: Math.max(0, (viewportH - taskbarHeight) / 2 - size.height / 2),
        }
    }

    function getPositionDefaults(key: string, size: { width: number; height: number }, windows: AppWindow[]) {
        if (appSettings[key]?.position?.center) {
            return getDesktopCenterPosition(size)
        }

        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        if (appSettings[key]?.position?.topCenter) {
            const isDesktop = viewportW >= 768
            const topOffset = isDesktop ? 100 : 0

            return {
                x: Math.max(0, viewportW / 2 - size.width / 2),
                y: topOffset,
            }
        }

        if (key?.startsWith('ask-max')) {
            return {
                x: Math.max(0, viewportW - size.width - 20),
                y: Math.max(0, viewportH - size.height - 20),
            }
        }

        const sortedWindows = [...windows].sort((a, b) => b.zIndex - a.zIndex)
        const previousWindow = sortedWindows[0]

        if (previousWindow?.key === '/') {
            return getDesktopCenterPosition(size)
        }

        if (previousWindow && !previousWindow.key?.startsWith('ask-max')) {
            const potentialX = previousWindow.position.x + 10

            const screenMidpoint = viewportW / 2
            const windowRightEdge = potentialX + size.width
            const amountOnRight = Math.max(0, windowRightEdge - screenMidpoint)
            const proportionOnRight = amountOnRight / size.width

            if (proportionOnRight > 2 / 3) {
                return getDesktopCenterPosition(size)
            }

            return {
                x: potentialX,
                y: previousWindow.position.y + 10,
            }
        }

        return getDesktopCenterPosition(size)
    }

    function getInitialSize(key: string) {
        const settings = appSettings[key]
        if (settings?.size?.fixed) {
            return settings.size.min
        }
        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        const defaultSize =
            settings?.size?.max ||
            (key?.startsWith('ask-max')
                ? appSettings['ask-max']?.size?.max
                : {
                      width: viewportW * 0.9,
                      height: viewportH * 0.9,
                  }) || {
                width: viewportW * 0.9,
                height: viewportH * 0.9,
            }
        return {
            width: Math.min(defaultSize.width, viewportW * 0.9),
            height: Math.min(defaultSize.height, viewportH * 0.9),
        }
    }

    function getLastClickedElementRect() {
        return lastClickedElementRect || undefined
    }

    function getInitialWindows(element: any) {
        if (isSSR) {
            return [createNewWindow(element, [], location, isSSR, taskbarHeight)]
        }
        let urlObj: URL | null = null; try { if (location?.href) { urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com') } } catch { urlObj = null }
        const contact = urlObj?.searchParams.get('contact')
        if (contact) {
            const initialWindowSize = { width: window.innerWidth * 0.58, height: window.innerHeight * 0.8 }
            const formWindowWidth = window.innerWidth * 0.4
            const formWindowSize = {
                width: formWindowWidth,
                height: formWindowWidth <= 545 ? 732 : 568,
            }
            const padding = [65, 20]

            const initialWindow = createNewWindow(element, [], location, isSSR, taskbarHeight, {
                size: initialWindowSize,
                position: { x: padding[0], y: padding[1] },
                zIndex: 2,
            })
            const formWindow = createNewWindow(
                React.createElement(ContactSales as any, {
                    location: { pathname: `/talk-to-a-human` },
                    key: '/talk-to-a-human',
                }),
                [],
                { pathname: `talk-to-a-human` },
                isSSR,
                taskbarHeight,
                {
                    size: formWindowSize,
                    position: {
                        x: window.innerWidth - formWindowSize.width - padding[0],
                        y: window.innerHeight - formWindowSize.height - padding[1] - taskbarHeight,
                    },
                    zIndex: 0,
                }
            )
            return [initialWindow, formWindow]
        }
        if (location.pathname === '/login' || location.pathname === '/signup') {
            const formWindowSize = {
                width: Math.min(480, isSSR ? 480 : window.innerWidth * 0.9),
                height: 580,
            }
            const bgWindow = createNewWindow(
                React.createElement(Start as any, { location: { pathname: `/` }, key: '/' }),
                [],
                { pathname: `/` },
                isSSR,
                taskbarHeight,
                { zIndex: 1 }
            )
            const authWindow = createNewWindow(
                element as WindowElement,
                [],
                location,
                isSSR,
                taskbarHeight,
                {
                    size: formWindowSize,
                    position: {
                        x: isSSR ? 100 : (window.innerWidth - formWindowSize.width) / 2,
                        y: isSSR ? 50 : Math.max(20, (window.innerHeight - formWindowSize.height - taskbarHeight) / 2),
                    },
                    zIndex: 2,
                    windowed: true,
                }
            )
            return [bgWindow, authWindow]
        }
        return [createNewWindow(element, [], location, isSSR, taskbarHeight)]
    }

    function getKey(key: string) {
        const experiment = appSettings[key]?.experiment
        if (!experiment?.flag) return key
        const assignedVariant = posthog?.getFeatureFlag?.(experiment?.flag)
        if (!assignedVariant) return key
        const keyToUse = Object.keys(appSettings).find(
            (key) =>
                appSettings[key]?.experiment?.flag === experiment?.flag &&
                appSettings[key]?.experiment?.variant === assignedVariant
        )
        return keyToUse || key
    }

    function createNewWindow(
        element: WindowElement,
        windows: AppWindow[],
        location: any,
        isSSR: boolean,
        taskbarHeight: number,
        options = {} as {
            size?: { width: number; height: number }
            position?: { x: number; y: number }
            zIndex?: number
            windowed?: boolean
        }
    ) {
        const el = element as any
        const keyToUse = getKey(el?.key)
        const targetLocation = el?.props?.location || location
        const targetPath = targetLocation?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
        const targetState = targetLocation?.state || {}

        const size = targetState?.size || el?.props?.size || getInitialSize(keyToUse)
        const position =
            targetState?.position ||
            el?.props?.position ||
            appSettings[keyToUse]?.position?.getPositionDefaults?.(size, windows, getDesktopCenterPosition) ||
            getPositionDefaults(keyToUse, size, windows)
        const settings = appSettings[keyToUse]
        const lastClickedElementRect = getLastClickedElementRect()

        // Windowed (centered/cascaded) is default for regular pages so windows stack over each other.
        const isMobileClient =
            typeof window !== 'undefined' &&
            (window.innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        const canWindow = (isSSR || window.innerWidth >= 768) && !isMobileClient
        const isWindowed =
            options.windowed ??
            targetState?.windowed ??
            (canWindow &&
                !keyToUse?.startsWith('ask-max') &&
                !settings?.size?.fixed &&
                !el?.props?.minimal &&
                !settings?.modal)
        const shouldExpand = isMobileClient
        const bounds = constraintsRef.current?.getBoundingClientRect()
        const fullW = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth - 16 : 1200)
        const fullH = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - taskbarHeight - 16 : 800)

        const finalSize = shouldExpand ? { width: fullW, height: fullH } : size
        const finalPos = shouldExpand ? { x: 0, y: 0 } : position

        const maxZ = Math.max(...windows.map((w) => w.zIndex), 0)
        const newWindow: AppWindow = {
            element: el as React.ReactNode,
            zIndex: options.zIndex ?? maxZ + 1,
            key: el?.key,
            coordinates: location?.state?.coordinates || { x: 0, y: 0 },
            minimized: false,
            path: targetPath,
            fromHistory: location?.state?.fromHistory || false,
            props: {
                pageContext: el?.props?.pageContext,
                data: el?.props?.data,
                params: el?.props?.params,
                path: targetPath,
            },
            size: options.size || finalSize,
            previousSize: size,
            position: options.position || finalPos,
            previousPosition: position,
            sizeConstraints:
                settings?.size?.fixed && settings.size
                    ? { min: settings.size.min, max: settings.size.max }
                    : getWindowBasedSizeConstraints(),
            fixedSize: settings?.size?.fixed || false,
            fromOrigin:
                targetState?.fromOrigin ||
                (lastClickedElementRect
                    ? {
                          x: lastClickedElementRect.x - size.width / 2,
                          y: lastClickedElementRect.y - size.height / 2,
                      }
                    : undefined),
            minimal: el?.props?.minimal ?? false,
            appSettings: appSettings[keyToUse],
            location: targetLocation,
            expanded: shouldExpand,
            snapped: false,
            windowed: isWindowed,
        }

        if (!newWindow.expanded) {
            // Adjust width if window extends beyond right edge
            if (newWindow.position.x + newWindow.size.width > (isSSR ? 0 : window.innerWidth) - 20) {
                newWindow.size.width = isSSR ? 0 : window.innerWidth - newWindow.position.x - 20
            }

            // Adjust height if window extends beyond bottom edge
            if (newWindow.position.y + newWindow.size.height > (isSSR ? 0 : window.innerHeight) - taskbarHeight - 20) {
                newWindow.size.height = isSSR ? 0 : window.innerHeight - newWindow.position.y - taskbarHeight - 20
            }
        }

        return { ...newWindow, ...options }
    }

    const updatePages = (element: WindowElement) => {
        const targetPath = element?.props?.location?.pathname || location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
        const targetLocation = element?.props?.location || location
        const existingWindow = windows.find((w) => w.path === targetPath)
        const newWindow = createNewWindow(element, windows, location, isSSR, taskbarHeight)
        
        const isMobileClient =
            typeof window !== 'undefined' &&
            (window.innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        if (isMobileClient) {
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : window.innerWidth - 16
            const fullH = bounds ? bounds.height : window.innerHeight - taskbarHeight - 16
            newWindow.expanded = true
            newWindow.windowed = true
            newWindow.snapped = false
            newWindow.size = { width: fullW, height: fullH }
            newWindow.position = { x: 0, y: 0 }
        } else {
            newWindow.snapped = false
            newWindow.expanded = false
            newWindow.windowed = true
        }

        if (existingWindow) {
            bringToFront(existingWindow, targetLocation)
        } else if (newWindow.appSettings?.size?.fixed) {
            setWindows([...windows.filter((w) => !w.appSettings?.size?.fixed), newWindow])
        } else {
            setWindows([...windows, newWindow])
        }
    }

    const addWindow = (item: WindowElement | React.ReactElement) => {
        if (React.isValidElement(item)) {
            updatePages(item as any)
            return
        }

        const key = item.key || item.path
        const path = item.path || '/'
        if (path === '/login' || path.startsWith('/login')) {
            setAuthModalView('sign-in')
            setIsAuthModalOpen(true)
            return
        }
        if (path === '/signup' || path.startsWith('/signup')) {
            setAuthModalView('sign-up')
            setIsAuthModalOpen(true)
            return
        }

        setWindows((prev) => {
            if (isForumPath(path)) {
                const existingForum = prev.find((w) => isForumPath(w.path))
                if (existingForum) {
                    const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)
                    // Thread slug only (wimpos params.permalink) — not topic/list routes
                    const threadMatch = path.match(
                        /^\/(?:questions|forum)\/(?!topic(?:\/|$)|subscriptions(?:\/|$))([^/?#]+)\/?$/
                    )
                    const permalink = threadMatch?.[1]
                    // Keep existing key stable — changing key remounts AppWindow and kills panel state
                    return prev.map((w) =>
                        w.key === existingForum.key
                            ? {
                                  ...w,
                                  path,
                                  zIndex: maxZ + 1,
                                  minimized: false,
                                  props: { ...w.props, path, permalink },
                              }
                            : w
                    )
                }
            }

            const existing = prev.find((w) => w.key === key || w.path === path)
            if (existing) {
                const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)
                return prev.map((w) => (w.key === existing.key ? { ...w, zIndex: maxZ + 1, minimized: false } : w))
            }

            const isMobileClient =
                typeof window !== 'undefined' &&
                (window.innerWidth < 768 ||
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth - 16 : 1200)
            const fullH = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - taskbarHeight - 16 : 800)

            const snappedSide = item.snapped === 'left' || item.snapped === 'right' ? item.snapped : false
            const snapRect =
                !isMobileClient && snappedSide ? getSnapDimensions(snappedSide) : null
            const size = isMobileClient
                ? { width: fullW, height: fullH }
                : snapRect?.size || item.size || { width: 900, height: 650 }
            const position = isMobileClient
                ? { x: 0, y: 0 }
                : snapRect?.position || item.position || getPositionDefaults(key, size, prev)
            const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)

            const newWin: AppWindow = {
                key,
                path,
                title: item.title || (path === '/archive' ? 'Archive' : path === '/home' || path === '/' ? 'Home' : path === '/workspace-chat' || path.startsWith('/workspace-chat/') ? 'WIM AI' : path === '/posts' || path === '/blog' ? 'Posts' : path === '/login' || path === '/signup' ? 'Sign In' : path.startsWith('/profile') ? 'Profile' : path.startsWith('/notebooks') ? 'Notebooks' : path.split('/').pop() || 'Window'),
                size,
                position,
                previousSize: item.size || { width: 900, height: 650 },
                previousPosition: item.position || { x: 50, y: 50 },
                sizeConstraints: item.sizeConstraints || {
                    min: { width: 280, height: 180 },
                    max: { width: fullW, height: fullH },
                },
                fixedSize: item.fixedSize || false,
                element: item.element,
                meta: { title: item.title || path.split('/').pop() || 'Window' },
                zIndex: maxZ + 1,
                minimized: false,
                windowed: true,
                expanded: isMobileClient || item.expanded,
                snapped: isMobileClient ? false : snappedSide,
                fromOrigin: item.fromOrigin,
                props: { path },
            }
            return [...prev, newWin]
        })

        if (typeof window !== 'undefined' && window.history) {
            try {
                window.history.pushState({ windowKey: key }, '', path)
            } catch (e) {
                console.error(e)
            }
        }
    }

    const updateWindowRef = (appWindow: AppWindow, ref: React.RefObject<HTMLDivElement>) => {
        setWindows((windows) => windows.map((w) => (w.key === appWindow.key ? { ...w, ref } : w)))
    }

    const updateWindow = (
        appWindow: AppWindow,
        updates: WindowUpdate
    ) => {
        let nextWindow: AppWindow | undefined
        setWindows((windows) =>
            windows.map((window) => {
                if (window.key !== appWindow.key) return window

                nextWindow = mergeWindowUpdate(window, updates)
                return nextWindow
            })
        )
        // React state updates are batched, so the callback result is not
        // synchronously available. Callers only need a window identity here.
        return nextWindow || appWindow
    }

    const openSearch = (initialFilter?: string) => {
        setSearchInitialFilter(initialFilter || '')
        setSearchOpen(true)
    }

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
    const [authModalView, setAuthModalView] = useState<'sign-in' | 'sign-up' | 'forgot-password'>('sign-in')
    const [authModalOnSuccess, setAuthModalOnSuccess] = useState<((user: User) => void) | null>(null)

    const openSignIn = (onSuccess?: (user: User) => void) => {
        setAuthModalView('sign-in')
        setAuthModalOnSuccess(() => onSuccess || null)
        setIsAuthModalOpen(true)
    }

    const openRegister = () => {
        setAuthModalView('sign-up')
        setAuthModalOnSuccess(null)
        setIsAuthModalOpen(true)
    }

    const openForgotPassword = () => {
        setAuthModalView('forgot-password')
        setAuthModalOnSuccess(null)
        setIsAuthModalOpen(true)
    }

    const openStart = ({ subdomain, initialTab }: { subdomain?: string; initialTab?: string }) => {
        addWindow(
            React.createElement(Start as any, {
                subdomain,
                initialTab,
                location: { pathname: `start` },
                key: 'start',
                newWindow: true,
            })
        )
    }

    // Workspace chat is the ClaudeWorkspaceChat slide-over, not a managed window.
    const openNewChat = (params: ChatParams) => {
        setChatParams(params)
        setChatOpen(true)
        setIsClaudeChatOpen(true)
    }

    function getDesktopSize() {
        const bounds = constraintsRef.current?.getBoundingClientRect()
        if (bounds) return { width: bounds.width, height: bounds.height }
        if (isSSR) return { width: 0, height: 0 }
        return {
            width: Math.max(0, window.innerWidth - 16),
            height: Math.max(0, window.innerHeight - taskbarHeight - 16),
        }
    }

    function getSnapDimensions(side: 'left' | 'right') {
        // Windows live inside constraintsRef. Using #taskbar.left here treated a
        // viewport inset as a desktop-local x, so the left half sat inward of the header
        // while the right half clipped flush. Commit with pad 0 so both edges match the header.
        const layout = snapLayout(side, getDesktopSize(), 0)
        return {
            size: { width: layout.width, height: layout.height },
            position: { x: layout.x, y: layout.y },
        }
    }

    const handleSnapToSide = (side: 'left' | 'right', target?: AppWindow) => {
        const windowToSnap = target ?? focusedWindow
        if (!constraintsRef.current || !windowToSnap) return

        const { size, position } = getSnapDimensions(side)

        let prevSize = windowToSnap.size
        let prevPos = windowToSnap.position
        if (windowToSnap.expanded) {
            const cr = constraintsRef.current.getBoundingClientRect()
            prevSize = { width: cr.width - 16, height: cr.height - 8 }
            prevPos = { x: 8, y: 0 }
        }

        updateWindow(windowToSnap, {
            position,
            size,
            previousSize: prevSize,
            previousPosition: prevPos,
            ...windowModeFlags(side === 'left' ? 'snapped-left' : 'snapped-right'),
        })

        const slot = windowSlot(windowToSnap)
        if (!slot) return
        const mate =
            slot === 'notebook' ? findAskAiWindow(windows) : findNotebookWindow(windows)
        if (!mate || mate.key === windowToSnap.key) return
        const otherSide = side === 'left' ? 'right' : 'left'
        const other = getSnapDimensions(otherSide)
        updateWindow(mate, {
            position: other.position,
            size: other.size,
            ...windowModeFlags(otherSide === 'left' ? 'snapped-left' : 'snapped-right'),
        })
    }

    function getExpandedDimensions() {
        const layout = snapLayout('maximize', getDesktopSize(), 0)
        return {
            position: { x: layout.x, y: layout.y },
            size: { width: layout.width, height: layout.height },
        }
    }

    const expandWindow = (target?: AppWindow) => {
        const windowToExpand = target ?? focusedWindow
        if (!windowToExpand) return
        // When expanding a side-by-side (snapped) window, drop the other snapped
        // window(s) so the one being expanded takes over the whole screen. Sync the
        // URL to it without re-running the page/window setup (skipPageUpdate).
        const dropSnappedSiblings = !!windowToExpand.snapped
        if (dropSnappedSiblings && windowToExpand.path.startsWith('/')) {
            safePush(`${windowToExpand.path}${windowToExpand.location?.search || ''}`, {
                state: { skipPageUpdate: true },
            })
        }
        setWindows((windows) =>
            windows
                .filter(
                    (w) => !(dropSnappedSiblings && w.key !== windowToExpand.key && w.snapped && !w.appSettings?.size?.fixed)
                )
                .map((w) =>
                    w.key === windowToExpand.key
                        ? {
                              ...w,
                              previousSize: w.size,
                              previousPosition: w.position,
                              ...windowModeFlags('maximized'),
                              zIndex: windows.length,
                          }
                        : w
                )
        )
    }

    const updateSiteSettings = (settings: SiteSettings) => {
        try {
            setSiteSettings(settings)
            localStorage.setItem('siteSettings', JSON.stringify(settings))
        } catch (error) {
            console.error('Failed to update site settings:', error)
        }
    }

    const animateClosingAllWindows = () => {
        setClosingAllWindowsAnimation(true)
    }

    const closeAllWindows = () => {
        setWindows([])
        setClosingAllWindowsAnimation(false)
    }

    const copyDesktopParams = () => {
        if (copyingRoomRef.current) return
        copyingRoomRef.current = true
        void (async () => {
            try {
                const visiting = readVisitingRoomToken()
                const origin =
                    (typeof window !== 'undefined' && window.location.origin) ||
                    (typeof location?.origin === 'string' ? location.origin : '')
                let url = visiting ? `${origin}/room/${visiting}` : lastRoomURL
                if (!visiting) {
                    const jwt = await getSessionAccessToken()
                    const created = await createWorldRoom({
                        snapshot: collectSnapshot(),
                        title: 'Shared room',
                        jwt,
                    })
                    if ('error' in created) {
                        addToast({
                            error: true,
                            description:
                                created.status === 503
                                    ? 'Rooms are not ready yet. Apply the user_worlds migration.'
                                    : created.error,
                            duration: 2800,
                        })
                        return
                    }
                    url = `${origin}${created.urlPath}`
                    setLastRoomURL(url)
                }
                await navigator.clipboard.writeText(url)
                setDesktopCopied(true)
                window.setTimeout(() => setDesktopCopied(false), 2000)
                addToast({
                    description: 'Room link copied',
                    duration: 2000,
                })
            } catch (error) {
                console.error(error)
                addToast({
                    error: true,
                    description: 'Failed to copy room link',
                    duration: 2000,
                })
            } finally {
                copyingRoomRef.current = false
            }
        })()
    }

    const exitSharedRoom = () => {
        exitVisitingRoom()
    }

    const updateTaskbarHeight = () => {
        if (isSSR) return
        const rect = document.querySelector('#taskbar')?.getBoundingClientRect()
        if (rect && rect.height > 0) {
            const newHeight = Math.round(rect.top + rect.height)
            setTaskbarHeight((prev) => (prev !== newHeight ? newHeight : prev))
        }
    }

    useEffect(() => {
        if (!location?.href) return
        try {
            let urlObj: URL | null = null; try { if (location?.href) { urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com') } } catch { urlObj = null }
            const queryString = urlObj?.search?.substring(1) || ''
            const parsed = qs.parse(queryString)
            if (parsed?.windows || (location as any)?.state?.skipPageUpdate) {
                return
            }
            updatePages(element as any)
        } catch (e) {
            updatePages(element as any)
        }
    }, [location?.pathname, (element as any)?.key])

    useEffect(() => {
        updateTaskbarHeight()

        if (!isSSR) {
            window.addEventListener('resize', updateTaskbarHeight)
            return () => window.removeEventListener('resize', updateTaskbarHeight)
        }
    }, [])

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const link = target.closest('a')
            const button = target.closest('button')
            const isClickable = link || button
            if (isClickable) {
                // Capture immediately on click to avoid forced reflow during window creation
                const rect = target.getBoundingClientRect()
                setLastClickedElementRect({ x: rect.left, y: rect.top })
            }
        }
        document.addEventListener('click', handleClick)

        return () => {
            document.removeEventListener('click', handleClick)
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement

            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.shadowRoot ||
                target.isContentEditable ||
                target.closest('[contenteditable="true"]') ||
                target.closest('[role="textbox"]') ||
                (target instanceof HTMLElement && target.closest('.mdxeditor'))
            ) {
                return
            }

            // Global shortcuts
            if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                openSearch()
            }
            // Cmd+K (Mac) or Ctrl+K (Windows/Linux) for search
            if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                e.preventDefault()
                openSearch()
            }
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault()
                openNewChat({ path: 'ask-max' })
            }
            if (e.key === ',' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                // Open display options
                safePush('/display-options', { state: { newWindow: true } })
            }
            if (e.key === '.' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                // Open keyboard shortcuts pane
                safePush('/kbd', { state: { newWindow: true } })
            }

            // Wallpaper cycle with \ key (without Shift)
            if (e.key === '\\' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                e.stopPropagation()

                // Get current wallpaper index
                const currentIndex = themeOptions.findIndex((theme) => theme.value === siteSettings.wallpaper)
                // Cycle to next wallpaper (wrap around to first if at end)
                const nextIndex = (currentIndex + 1) % themeOptions.length
                const nextWallpaper = themeOptions[nextIndex]

                updateSiteSettings({
                    ...siteSettings,
                    wallpaper: nextWallpaper.value as SiteSettings['wallpaper'],
                })

                // Add toast notification
                addToast({
                    description: `Switched to ${nextWallpaper.label} wallpaper`,
                    duration: 2000,
                })
            }

            // Window-specific shortcuts
            if (e.shiftKey && e.key === 'ArrowLeft') {
                handleSnapToSide('left')
            }
            if (e.shiftKey && e.key === 'ArrowRight') {
                handleSnapToSide('right')
            }
            if (e.shiftKey && e.key === 'ArrowUp') {
                if (focusedWindow?.expanded) {
                    updateWindow(focusedWindow, { expanded: false, windowed: true, snapped: false })
                } else {
                    expandWindow()
                }
            }
            if (e.shiftKey && e.key === 'ArrowDown') {
                e.preventDefault()
                if (focusedWindow) {
                    minimizeWindow(focusedWindow)
                }
            }
            if (e.shiftKey && e.key.toLowerCase() === 'w') {
                e.preventDefault()
                if (focusedWindow) {
                    // Trigger the same close animation as clicking the X button
                    const closeEvent = new CustomEvent('windowClose', { detail: { windowKey: focusedWindow.key } })
                    document.dispatchEvent(closeEvent)
                }
            }
            if (e.shiftKey && e.key === 'X') {
                e.preventDefault()
                // Close all windows with animation
                animateClosingAllWindows()
            }
            if (e.shiftKey && e.key === '<') {
                e.preventDefault()
                // Open active windows panel
                setIsActiveWindowsPanelOpen(true)
            }
            if (e.shiftKey && e.key === '>') {
                e.preventDefault()
                // Cycle to next window
                if (windows.length > 1) {
                    // Find the currently focused window index
                    const currentIndex = windows.findIndex((w) => w.key === focusedWindow?.key)
                    // Calculate next window index (wrap around to first if at end)
                    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % windows.length
                    const nextWindow = windows[nextIndex]

                    // Navigate to the next window
                    if (nextWindow.path.startsWith('/')) {
                        safePush(`${nextWindow.path}${nextWindow.location?.search || ''}`)
                    } else {
                        bringToFront(nextWindow)
                    }
                }
            }
            if (e.shiftKey && e.key === 'C') {
                e.preventDefault()
                copyDesktopParams()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [
        handleSnapToSide,
        expandWindow,
        focusedWindow,
        closeWindow,
        openSearch,
        openNewChat,
        siteSettings,
        updateSiteSettings,
        addToast,
        animateClosingAllWindows,
        minimizeWindow,
        setIsActiveWindowsPanelOpen,
        windows,
        bringToFront,
        setConfetti,
        confetti,
    ])

    useEffect(() => {
        const applyChromeAttrs = (el: HTMLElement | null) => {
            if (!el) return
            if (siteSettings.skinMode) {
                el.setAttribute('data-skin', siteSettings.skinMode)
            }
            if (siteSettings.wallpaper) {
                el.setAttribute('data-wallpaper', siteSettings.wallpaper)
            }
            el.setAttribute('data-reduce-transparency', siteSettings.reduceTransparency ? 'true' : 'false')
        }

        applyChromeAttrs(document.body)
        applyChromeAttrs(document.documentElement)
        applyWallpaperBrowserChrome({
            wallpaper: siteSettings.wallpaper,
            colorMode: siteSettings.colorMode,
            theme: document.body.className.includes('dark') ? 'dark' : 'light',
        })
        cleanupCustomCursor()
    }, [siteSettings])

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (compact) {
            // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive ready signal
            window.parent.postMessage(
                {
                    type: 'docs-ready',
                },
                '*'
            )

            // window.parent.postMessage(
            //     {
            //         type: 'docs-menu',
            //         menu: docsMenu.children,
            //     },
            //     '*'
            // )
        }

        const onMessage = (e: MessageEvent): void => {
            if (e.data.type === 'theme-toggle') {
                window.__setPreferredTheme(e.data.isDarkModeOn ? 'dark' : 'light')
                return
            }
            if (e.data.type === 'navigate' && isSafeInternalPath(e.data.url)) {
                safePush(e.data.url)
            }
        }

        window.__onThemeChange = (theme) => {
            updateSiteSettings({
                ...siteSettings,
                theme: (theme === 'dark' || theme === 'light' ? theme : siteSettings.theme) as SiteSettings['theme'],
            })
        }

        window.addEventListener('message', onMessage)

        return () => window.removeEventListener('message', onMessage)
    }, [])

    useEffect(() => {
        if (compact) {
            // nosemgrep: javascript.browser.security.wildcard-postmessage-configuration.wildcard-postmessage-configuration - intentional for docs embedding, parent origin unknown, non-sensitive navigation data
            window.parent.postMessage(
                {
                    type: 'internal-navigation',
                    url: location.pathname,
                },
                '*'
            )
        }
    }, [location.pathname])

    useEffect(() => {
        if (window) {
            const instanceCookie = document.cookie
                .split('; ')
                ?.filter((row) => row.startsWith('ph_current_instance='))
                ?.map((c) => c.split('=')?.[1])?.[0]
            if (instanceCookie) {
                setPosthogInstance(instanceCookie)
            }
        }
    }, [])

    useEffect(() => {
        const newWindows = windows.map((w) => ({ ...w, modal: undefined }))
        setWindows(newWindows)
    }, [])

    const convertWindowsToPixels = (windows: any[]) => {
        const innerWidth = window.innerWidth
        const innerHeight = window.innerHeight

        return windows.map((win) => ({
            ...win,
            size: {
                width: (parseFloat(win.size.width) / 100) * innerWidth,
                height: (parseFloat(win.size.height) / 100) * innerHeight,
            },
            position: {
                x: (parseFloat(win.position.x) / 100) * innerWidth,
                y: (parseFloat(win.position.y) / 100) * (innerHeight - taskbarHeight),
            },
        }))
    }

    useEffect(() => {
        if (isSSR) return

        let urlObj: URL | null = null; try { if (location?.href) { urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com') } } catch { urlObj = null }
        const queryString = urlObj?.search.substring(1)
        const parsed = qs.parse(queryString || '')
        const paramsWindows = parsed?.windows

        if (paramsWindows && Array.isArray(paramsWindows)) {
            const [initialWindow, ...rest] = convertWindowsToPixels(paramsWindows as any[])

            // Preserve non-windows query parameters when navigating
            const nonWindowsParams = { ...parsed }
            delete nonWindowsParams.windows
            const nonWindowsQueryString =
                Object.keys(nonWindowsParams).length > 0 ? `?${qs.stringify(nonWindowsParams, { encode: false })}` : ''

            safePush(`${initialWindow.path}${nonWindowsQueryString}`, {
                state: {
                    newWindow: true,
                    size: initialWindow.size,
                    position: initialWindow.position,
                    savedWindows: rest,
                },
            })
        }

        if (stateWindows) {
            const [nextWindow, ...rest] = stateWindows
            if (!nextWindow) return

            // Preserve query parameters from current URL when navigating to next window
            const currentParams = qs.parse((typeof location?.search === 'string' ? location.search.substring(1) : ''))
            delete currentParams.windows
            const currentQueryString =
                Object.keys(currentParams).length > 0 ? `?${qs.stringify(currentParams, { encode: false })}` : ''

            safePush(`${nextWindow.path}${currentQueryString}`, {
                state: {
                    newWindow: true,
                    size: nextWindow.size,
                    position: nextWindow.position,
                    savedWindows: rest.length > 0 ? rest : undefined,
                },
            })
        }
    }, [stateWindows])

    useEffect(() => {
        const visibleWindows = windows.filter((window) => {
            if (window.minimized) return false
            if (window.expanded) return true

            const windowsAbove = windows.filter((w) => w !== window && w.zIndex > window.zIndex && !w.minimized)

            let coveredArea = 0
            const currentArea = window.size.width * window.size.height

            for (const windowAbove of windowsAbove) {
                const left = Math.max(window.position.x, windowAbove.position.x)
                const right = Math.min(
                    window.position.x + window.size.width,
                    windowAbove.position.x + windowAbove.size.width
                )
                const top = Math.max(window.position.y, windowAbove.position.y)
                const bottom = Math.min(
                    window.position.y + window.size.height,
                    windowAbove.position.y + windowAbove.size.height
                )

                if (left < right && top < bottom) {
                    coveredArea += (right - left) * (bottom - top)
                }
            }

            const coverageRatio = currentArea > 0 ? coveredArea / currentArea : 0
            return coverageRatio < 0.8
        })

        setWindowsInView(visibleWindows)
    }, [windows])

    // Keep the latest implementations in a ref so the stable wrappers below always
    // call the freshest closures (no stale state) while keeping a constant identity.
    const latestActionsRef = useRef<AppActionsContextType>()
    latestActionsRef.current = {
        closeWindow,
        bringToFront,
        setWindowTitle,
        minimizeWindow,
        addWindow,
        updateWindowRef,
        updateWindow,
        getPositionDefaults,
        getDesktopCenterPosition,
        openSearch,
        handleSnapToSide,
        constraintsRef,
        taskbarRef,
        expandWindow,
        getExpandedDimensions,
        openSignIn,
        openRegister,
        openForgotPassword,
        updateSiteSettings,
        openNewChat,
        setIsNotificationsPanelOpen,
        setIsActiveWindowsPanelOpen,
        openStart,
        animateClosingAllWindows,
        closeAllWindows,
        setClosingAllWindowsAnimation,
        setConfetti,
        copyDesktopParams,
        setSearchOpen,
        setChatOpen,
        setChatParams,
        updateTaskbarHeight,
        setIsClaudeChatOpen,
        windowsInViewRef,
    }

    // Stable-identity actions object. Refs and state setters are already stable and
    // pass through directly; callbacks forward to the latest implementation. This
    // object never changes identity, so `useAppActions()` consumers don't re-render
    // when volatile app state changes.
    const actions = useMemo<AppActionsContextType>(
        () => ({
            closeWindow: (...args) => latestActionsRef.current!.closeWindow(...args),
            bringToFront: (...args) => latestActionsRef.current!.bringToFront(...args),
            setWindowTitle: (...args) => latestActionsRef.current!.setWindowTitle(...args),
            minimizeWindow: (...args) => latestActionsRef.current!.minimizeWindow(...args),
            addWindow: (...args) => latestActionsRef.current!.addWindow(...args),
            updateWindowRef: (...args) => latestActionsRef.current!.updateWindowRef(...args),
            updateWindow: (...args) => latestActionsRef.current!.updateWindow(...args),
            getPositionDefaults: (...args) => latestActionsRef.current!.getPositionDefaults(...args),
            getDesktopCenterPosition: (...args) => latestActionsRef.current!.getDesktopCenterPosition(...args),
            openSearch: (...args) => latestActionsRef.current!.openSearch(...args),
            handleSnapToSide: (...args) => latestActionsRef.current!.handleSnapToSide(...args),
            expandWindow: (...args) => latestActionsRef.current!.expandWindow(...args),
            getExpandedDimensions: (...args) => latestActionsRef.current!.getExpandedDimensions(...args),
            openSignIn: (...args) => latestActionsRef.current!.openSignIn(...args),
            openRegister: (...args) => latestActionsRef.current!.openRegister(...args),
            openForgotPassword: (...args) => latestActionsRef.current!.openForgotPassword(...args),
            updateSiteSettings: (...args) => latestActionsRef.current!.updateSiteSettings(...args),
            openNewChat: (...args) => latestActionsRef.current!.openNewChat(...args),
            openStart: (...args) => latestActionsRef.current!.openStart(...args),
            animateClosingAllWindows: (...args) => latestActionsRef.current!.animateClosingAllWindows(...args),
            closeAllWindows: (...args) => latestActionsRef.current!.closeAllWindows(...args),
            copyDesktopParams: (...args) => latestActionsRef.current!.copyDesktopParams(...args),
            updateTaskbarHeight: (...args) => latestActionsRef.current!.updateTaskbarHeight(...args),
            setIsNotificationsPanelOpen,
            setIsClaudeChatOpen,
            setIsActiveWindowsPanelOpen,
            setClosingAllWindowsAnimation,
            setConfetti,
            setSearchOpen,
            setChatOpen,
            setChatParams,
            constraintsRef,
            taskbarRef,
            windowsInViewRef,
        }),
        []
    )

    const settings = useMemo<AppSettingsContextType>(
        () => ({
            siteSettings,
            compact,
            isMobile,
            posthogInstance,
            menu,
        }),
        [siteSettings, compact, isMobile, posthogInstance, menu]
    )

    const uiState = useMemo<AppUIStateContextType>(
        () => ({
            isNotificationsPanelOpen,
            isClaudeChatOpen,
            isActiveWindowsPanelOpen,
            closingAllWindowsAnimation,
            confetti,
            searchOpen,
            chatOpen,
            chatParams,
        }),
        [
            isNotificationsPanelOpen,
            isClaudeChatOpen,
            isActiveWindowsPanelOpen,
            closingAllWindowsAnimation,
            confetti,
            searchOpen,
            chatOpen,
            chatParams,
        ]
    )

    const windowsValue = useMemo<AppWindowsContextType>(() => ({ windows }), [windows])

    return (
        <ActionsContext.Provider value={actions}>
            <SettingsContext.Provider value={settings}>
                <UIStateContext.Provider value={uiState}>
                    <WindowsContext.Provider value={windowsValue}>
                        <Context.Provider
                            value={{
                                windows,
                                closeWindow,
                                bringToFront,
                                setWindowTitle,
                                focusedWindow,
                                location,
                                minimizeWindow,
                                taskbarHeight,
                                addWindow,
                                updateWindowRef,
                                getPositionDefaults,
                                updateWindow,
                                getDesktopCenterPosition,
                                openSearch,
                                handleSnapToSide,
                                constraintsRef,
                                taskbarRef,
                                expandWindow,
                                getExpandedDimensions,
                                openSignIn,
                                openRegister,
                                openForgotPassword,
                                siteSettings,
                                updateSiteSettings,
                                openNewChat,
                                isNotificationsPanelOpen,
                                setIsNotificationsPanelOpen,
                                isClaudeChatOpen,
                                setIsClaudeChatOpen,
                                isActiveWindowsPanelOpen,
                                setIsActiveWindowsPanelOpen,
                                isMobile,
                                compact,
                                menu,
                                openStart,
                                animateClosingAllWindows,
                                closingAllWindowsAnimation,
                                setClosingAllWindowsAnimation,
                                closeAllWindows,
                                setConfetti,
                                confetti,
                                posthogInstance,
                                desktopParams,
                                copyDesktopParams,
                                desktopCopied,
                                shareableDesktopURL,
                                visitingRoomToken,
                                exitSharedRoom,
                                windowsInView,
                                searchOpen,
                                setSearchOpen,
                                searchInitialFilter,
                                chatOpen,
                                setChatOpen,
                                chatParams,
                                setChatParams,
                                isAuthModalOpen,
                                setIsAuthModalOpen,
                                authModalView,
                                authModalOnSuccess,
                                updateTaskbarHeight,
                            }}
                        >
                            {children}
                        </Context.Provider>
                    </WindowsContext.Provider>
                </UIStateContext.Provider>
            </SettingsContext.Provider>
        </ActionsContext.Provider>
    )
}

export const useOptionalApp = (): AppContextType | null => {
    return useContext(Context)
}

export const useApp = (): AppContextType => {
    const context = useOptionalApp()

    if (!context) {
        throw new Error('useApp must be used within an AppProvider')
    }

    return context
}

// Subscribe only to the stable actions (callbacks, setters, refs) without
// re-rendering when volatile app state changes. Prefer this over `useApp()` in
// components that only dispatch actions and don't read state.
export const useAppActions = (): AppActionsContextType => {
    return useContext(ActionsContext)
}

// Subscribe only to rarely-changing settings (display settings, environment flags,
// nav menu) without re-rendering when volatile window state changes. Prefer this
// over `useApp()` in components that only read these values.
export const useAppSettings = (): AppSettingsContextType => {
    return useContext(SettingsContext)
}

// Subscribe only to transient UI flags (panels, confetti, search)
// without re-rendering when volatile window state changes. Prefer this over
// `useApp()` in components that only read these flags.
export const useAppUIState = (): AppUIStateContextType => {
    return useContext(UIStateContext)
}

// Subscribe only to the window list. Re-renders when windows change but not on
// unrelated AppProvider renders. Prefer this over `useApp()` in components that
// only need `windows` (e.g. taskbar, window list).
export const useAppWindows = (): AppWindowsContextType => {
    return useContext(WindowsContext)
}
