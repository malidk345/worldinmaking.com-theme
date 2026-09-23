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
import { useShellNav } from './hooks/useShellNav'
import { useAuthBridge } from './hooks/useAuthBridge'
import { useWindowRegistry } from './hooks/useWindowRegistry'
import { AppWindow } from './Window'
import { isSafeInternalPath } from 'lib/utils'
import { User, useUser } from 'hooks/useUser'
import initialMenu from '../navs'
import { useToast } from './Toast'
import { themeOptions } from '../hooks/useTheme'
import usePostHog from '../hooks/usePostHog'
import { type WindowUpdate } from 'lib/windowState'
import { installSqueakFetchGuard } from 'lib/squeak'
import {
    applyWallpaperBrowserChrome,
    DEFAULT_ICON_SET,
    DEFAULT_REDUCE_TRANSPARENCY,
    DEFAULT_WALLPAPER,
    migrateAppearanceSettings,
    resolveKeptWallpaper,
    SITE_APPEARANCE_DEFAULTS_VERSION,
} from '../lib/wallpaperChrome'
import { getSessionAccessToken } from 'lib/wim-auth'
import { createWorldRoom } from '../lib/world-account'
import {
    exitVisitingRoom,
    readVisitingRoomToken,
    WORLD_UPDATED_AT_KEY,
} from '../lib/world-snapshot'
import { useWorldSnapshot } from './hooks/useWorldSnapshot'

const Start = dynamic(() => import('components/Start'), { ssr: false })

declare global {
    interface Window {
        __setPreferredTheme?: (theme: string) => string
        __onThemeChange?: (theme: string) => void
        __wallpaper?: string
        __setWallpaper?: (wallpaper: string) => void
        __theme?: string
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
    | 'setIsAuthModalOpen'
    | 'exitSharedRoom'

export type AppActionsContextType = Pick<AppContextType, AppActionKeys> & {
    // A stable ref to the latest windowsInView, for consumers that need the value
    // lazily without subscribing to re-renders.
    windowsInViewRef: React.MutableRefObject<AppWindow[]>
}

// Rarely-changing global state (display settings, environment flags, nav menu).
// Split out so consumers reading only these don't re-render when volatile window
// state (windows, focusedWindow, panels, etc.) changes. See `useAppSettings`.
type AppSettingsKeys = 'siteSettings' | 'compact' | 'isMobile' | 'posthogInstance' | 'menu' | 'taskbarHeight'

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
    | 'searchInitialFilter'
    | 'chatOpen'
    | 'chatParams'
    | 'isAuthModalOpen'
    | 'authModalView'
    | 'authModalOnSuccess'
    | 'visitingRoomToken'

export type AppUIStateContextType = Pick<AppContextType, AppUIStateKeys>

// The volatile window list, isolated into its own context so consumers that only need
// `windows` (e.g. the taskbar, the window list) re-render only when windows actually
// change — not on every unrelated AppProvider render. See `useAppWindows`.
type AppWindowsKeys = 'windows' | 'focusedWindow' | 'isActiveWindowsPanelOpen' | 'closingAllWindowsAnimation'

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
        iconSet: DEFAULT_ICON_SET,
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
    setIsAuthModalOpen: () => {},
    exitSharedRoom: () => {},
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
        iconSet: DEFAULT_ICON_SET,
        wallpaper: DEFAULT_WALLPAPER,
        reduceTransparency: DEFAULT_REDUCE_TRANSPARENCY,
        clickBehavior: 'double',
        performanceBoost: false,
    },
    compact: false,
    isMobile: false,
    posthogInstance: undefined,
    menu: [],
    taskbarHeight: 0,
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
    searchInitialFilter: '',
    chatOpen: false,
    chatParams: null,
    isAuthModalOpen: false,
    authModalView: 'sign-in',
    authModalOnSuccess: null,
    visitingRoomToken: null,
})

export const WindowsContext = createContext<AppWindowsContextType>({
    windows: [],
    focusedWindow: undefined,
    isActiveWindowsPanelOpen: false,
    closingAllWindowsAnimation: false,
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

export const appSettings: AppSettings = {

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
    '/home': {
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
    '/account': {
        size: {
            min: {
                width: 520,
                height: 480,
            },
            max: {
                width: 720,
                height: 900,
            },
            fixed: false,
        },
        position: {
            center: true,
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
        },
        position: {
            center: true,
        },
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
    '/cookies': {
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
    '/refund': {
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
    '/guidelines': {
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
    '/copyright': {
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
    '/subprocessors': {
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
    '/trash': {
        toolbar: true,
    },
    '/assistant': {
        toolbar: true,
        size: {
            min: { width: 560, height: 480 },
            max: { width: 920, height: 800 },
            fixed: false,
        },
        position: {
            center: true,
        },
    },
} as const

export interface SiteSettings {
    colorMode: 'light' | 'dark' | 'system'
    /** Stored theme; runtime may briefly pass broader strings from window.__onThemeChange. */
    theme: 'light' | 'dark' | string
    skinMode: 'modern' | 'classic'
    iconSet: 'default' | 'pixel'
    wallpaper:
        | 'cobalt'
        | 'hogzilla'
        | 'keyboard-mint'
        | 'draft-world'
        | 'rain-embers'
        | 'plaza-bang'
        | 'paper-white'
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
        iconSet: stored.iconSet === 'default' || stored.iconSet === 'pixel' ? stored.iconSet : DEFAULT_ICON_SET,
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
    const { user } = useUser()
    const signedInUserRef = useRef(user)
    signedInUserRef.current = user

    useEffect(() => {
        setHasMounted(true)
        // Block accidental Squeak/Strapi fetches (WIM is Supabase-only)
        const uninstallSqueakGuard = installSqueakFetchGuard()
        return () => {
            uninstallSqueakGuard()
        }
    }, [])

    const { safePush } = useShellNav()

    const [compact, setCompact] = useState(false)
    const constraintsRef = useRef<HTMLDivElement>(null)
    const taskbarRef = useRef<HTMLDivElement>(null)
    const [isMobile, setIsMobile] = useState(false)
    // First paint must match the server. Saved wallpaper/theme is applied in the
    // layout effect below, before the browser paints.
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({
        colorMode: 'light',
        theme: 'light',
        skinMode: 'modern',
        iconSet: DEFAULT_ICON_SET,
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
    const posthog = usePostHog()

    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false)
    const [isClaudeChatOpen, setIsClaudeChatOpen] = useState(false)
    const [isActiveWindowsPanelOpen, setIsActiveWindowsPanelOpen] = useState(false)
    const [confetti, setConfetti] = useState(false)
    const [posthogInstance, setPosthogInstance] = useState<string>()
    const [searchOpen, setSearchOpen] = useState<boolean>(false)
    const [searchInitialFilter, setSearchInitialFilter] = useState<string>('')
    const [chatOpen, setChatOpen] = useState<boolean>(false)
    const [chatParams, setChatParams] = useState<ChatParams | null>(null)
    const { addToast } = useToast()

    const {
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalView,
        setAuthModalView,
        authModalOnSuccess,
        openSignIn,
        openRegister,
        openForgotPassword,
    } = useAuthBridge()

    const {
        windows,
        setWindows,
        focusedWindow,
        windowsInView,
        windowsInViewRef,
        layoutRestoredRef,
        closingAllWindowsAnimation,
        setClosingAllWindowsAnimation,
        desktopParams,
        closeWindow,
        bringToFront,
        setWindowTitle,
        minimizeWindow,
        addWindow,
        updateWindowRef,
        updateWindow,
        getPositionDefaults,
        getDesktopCenterPosition,
        getSnapDimensions,
        handleSnapToSide,
        expandWindow,
        getExpandedDimensions,
        animateClosingAllWindows,
        closeAllWindows,
    } = useWindowRegistry({
        element,
        location,
        isSSR,
        hasMounted,
        taskbarHeight,
        constraintsRef,
        lastClickedElementRect,
        posthog,
        signedInUserRef,
        isMobile,
        setAuthModalView,
        setIsAuthModalOpen,
        safePush,
        appSettings,
    })

    // Hydrate client-only state before first paint to avoid layout flash
    useIsomorphicLayoutEffect(() => {
        const compactValue = window !== window.parent
        const isMobileValue = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        setCompact(compactValue)
        setIsMobile(isMobileValue)
        setSiteSettings(getInitialSiteSettings())
    }, [])

    const dynamicMenus = useMemo(() => ({} as Record<string, unknown[]>), [])

    const shareableDesktopURL = useMemo(() => {
        if (isSSR) return ''
        const origin =
            (typeof window !== 'undefined' && window.location.origin) ||
            (typeof location?.origin === 'string' ? location.origin : '')
        if (visitingRoomToken) return `${origin}/room/${visitingRoomToken}`
        if (lastRoomURL) return lastRoomURL
        return ''
    }, [location, isSSR, visitingRoomToken, lastRoomURL])

    const { collectSnapshot } = useWorldSnapshot({
        windows,
        setWindows,
        siteSettings,
        setSiteSettings,
        taskbarHeight,
        constraintsRef,
        layoutRestoredRef,
        getSnapDimensions,
        setVisitingRoomToken,
        desktopParams,
        pinEpoch,
    })

    useEffect(() => {
        setVisitingRoomToken(readVisitingRoomToken() || null)
        const bump = () => setPinEpoch((n) => n + 1)
        window.addEventListener('wimDesktopPinnedChanged', bump)
        return () => {
            window.removeEventListener('wimDesktopPinnedChanged', bump)
        }
    }, [])

    const injectDynamicChildren = useCallback((menu: Menu) => {
        return menu?.map((item) => {
            const processedItem = { ...item }

            if (item.dynamicChildren && (dynamicMenus as any)[item.dynamicChildren]) {
                // Bolt: Refactored to avoid spread array allocations and O(N^2) reduce pattern, reducing main thread layout parsing time.
                const newChildren: MenuItem[][] = []
                const processChild = (child: MenuItem) => {
                    if (isLabel(child)) {
                        newChildren.push([child])
                    } else {
                        const lastGroup = newChildren[newChildren.length - 1]
                        if (!lastGroup || isLabel(lastGroup[lastGroup.length - 1])) {
                            newChildren.push([child])
                        } else {
                            lastGroup.push(child)
                        }
                    }
                }

                if (item.children) {
                    for (const child of item.children) processChild(child)
                }

                const dynamicChildrenList = (dynamicMenus as any)[item.dynamicChildren]
                if (dynamicChildrenList) {
                    for (const child of dynamicChildrenList) processChild(child)
                }

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

    const openSearch = (initialFilter?: string) => {
        setSearchInitialFilter(initialFilter || '')
        setSearchOpen(true)
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

    const updateSiteSettings = (settings: SiteSettings) => {
        try {
            setSiteSettings((prev) => {
                const next: SiteSettings = {
                    ...prev,
                    ...settings,
                    // Preserve migration stamp so reload does not re-default wallpaper.
                    siteDefaultsVersion:
                        settings.siteDefaultsVersion ??
                        prev.siteDefaultsVersion ??
                        SITE_APPEARANCE_DEFAULTS_VERSION,
                }
                try {
                    localStorage.setItem('siteSettings', JSON.stringify(next))
                    // Local appearance edits must beat a stale user_worlds row on reload.
                    localStorage.setItem(WORLD_UPDATED_AT_KEY, new Date().toISOString())
                } catch {
                    /* ignore quota */
                }
                return next
            })
        } catch (error) {
            console.error('Failed to update site settings:', error)
        }
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
        updateTaskbarHeight()

        if (!isSSR) {
            window.addEventListener('resize', updateTaskbarHeight)
            return () => window.removeEventListener('resize', updateTaskbarHeight)
        }
    }, [])

    useEffect(() => {
        const handlePointerDown = (e: MouseEvent | PointerEvent) => {
            const target = e.target as HTMLElement | null
            if (!target) return
            const clickable = target.closest('a, button, [role="button"], [data-icon-label], [data-window-trigger], li') as HTMLElement | null
            if (clickable) {
                const rect = clickable.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    setLastClickedElementRect({
                        x: Math.round(rect.left + rect.width / 2),
                        y: Math.round(rect.top + rect.height / 2),
                    })
                    return
                }
            }
            if (e.clientX || e.clientY) {
                setLastClickedElementRect({ x: Math.round(e.clientX), y: Math.round(e.clientY) })
            }
        }
        document.addEventListener('pointerdown', handlePointerDown, true)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true)
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
                // Cmd+K ownership: If Ask AI SearchModal is open, let it handle the shortcut.
                if (document.getElementById('workspace-search-modal')) {
                    return
                }
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
                const wallpaper = resolveKeptWallpaper(nextWallpaper.value) as SiteSettings['wallpaper']
                // Paint scene attrs + browser chrome in the same turn (DisplayOptions parity).
                applyWallpaperBrowserChrome({
                    wallpaper,
                    colorMode: siteSettings.colorMode,
                    theme:
                        document.documentElement.classList.contains('dark') ||
                        document.body.classList.contains('dark')
                            ? 'dark'
                            : 'light',
                    force: true,
                })
                document.documentElement.setAttribute('data-wallpaper', wallpaper)
                document.body.setAttribute('data-wallpaper', wallpaper)
                updateSiteSettings({
                    ...siteSettings,
                    wallpaper,
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
            el.setAttribute('data-icon-set', siteSettings.iconSet === 'pixel' ? 'pixel' : 'default')
            el.setAttribute('data-reduce-transparency', siteSettings.reduceTransparency ? 'true' : 'false')
        }

        applyChromeAttrs(document.body)
        applyChromeAttrs(document.documentElement)
        const paintChrome = (force = false) =>
            applyWallpaperBrowserChrome({
                wallpaper: siteSettings.wallpaper,
                colorMode: siteSettings.colorMode,
                theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                force,
            })
        // Always force on siteSettings change so a stale boot-script wallpaper cannot stick.
        paintChrome(true)
        cleanupCustomCursor()
        if (siteSettings.colorMode !== 'system') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const onScheme = () => paintChrome(true)
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onScheme)
        else if (typeof mq.addListener === 'function') mq.addListener(onScheme)
        return () => {
            if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onScheme)
            else if (typeof mq.removeListener === 'function') mq.removeListener(onScheme)
        }
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
                window.__setPreferredTheme?.(e.data.isDarkModeOn ? 'dark' : 'light')
                return
            }
            if (e.data.type === 'navigate' && isSafeInternalPath(e.data.url)) {
                safePush(e.data.url)
            }
        }

        // Functional update only — never close over mount-time siteSettings.
        // applySnapshot calls __setPreferredTheme during world hydrate; a stale
        // DEFAULT_WALLPAPER spread would clobber the user's kept wallpaper on every reload.
        window.__onThemeChange = (theme) => {
            setSiteSettings((prev) => {
                const nextTheme = (
                    theme === 'dark' || theme === 'light' ? theme : prev.theme
                ) as SiteSettings['theme']
                if (prev.theme === nextTheme) return prev
                const next: SiteSettings = { ...prev, theme: nextTheme }
                try {
                    localStorage.setItem('siteSettings', JSON.stringify(next))
                } catch {
                    /* ignore */
                }
                return next
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
        setIsAuthModalOpen,
        exitSharedRoom,
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
            setIsAuthModalOpen,
            exitSharedRoom: (...args) => latestActionsRef.current!.exitSharedRoom(...args),
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
            taskbarHeight,
        }),
        [siteSettings, compact, isMobile, posthogInstance, menu, taskbarHeight]
    )

    const uiState = useMemo<AppUIStateContextType>(
        () => ({
            isNotificationsPanelOpen,
            isClaudeChatOpen,
            isActiveWindowsPanelOpen,
            closingAllWindowsAnimation,
            confetti,
            searchOpen,
            searchInitialFilter,
            chatOpen,
            chatParams,
            isAuthModalOpen,
            authModalView,
            authModalOnSuccess,
            visitingRoomToken,
        }),
        [
            isNotificationsPanelOpen,
            isClaudeChatOpen,
            isActiveWindowsPanelOpen,
            closingAllWindowsAnimation,
            confetti,
            searchOpen,
            searchInitialFilter,
            chatOpen,
            chatParams,
            isAuthModalOpen,
            authModalView,
            authModalOnSuccess,
            visitingRoomToken,
        ]
    )

    const windowsValue = useMemo<AppWindowsContextType>(
        () => ({ windows, focusedWindow, isActiveWindowsPanelOpen, closingAllWindowsAnimation }),
        [windows, focusedWindow, isActiveWindowsPanelOpen, closingAllWindowsAnimation]
    )

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
