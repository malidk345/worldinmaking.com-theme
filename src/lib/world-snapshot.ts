import { resolveKeptWallpaper, type ColorMode, type WallpaperName } from './wallpaperChrome'

export type WorldWindow = {
    path: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    zIndex: number
    snapped?: 'left' | 'right' | false
}

export type WorldSnapshot = {
    v: 1
    wallpaper: WallpaperName
    colorMode: ColorMode
    reduceTransparency?: boolean
    clickBehavior?: 'single' | 'double'
    windows: WorldWindow[]
    pinnedItems?: unknown[]
}

const MAX_WINDOWS = 12
const MAX_PATH = 200
const MAX_PINNED = 40

function num(value: unknown, fallback = 0): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
    return Number.isFinite(n) ? n : fallback
}

function clampPct(value: number): number {
    return Math.min(100, Math.max(0, value))
}

function isSafePath(path: unknown): path is string {
    if (typeof path !== 'string') return false
    if (!path.startsWith('/') || path.length > MAX_PATH) return false
    if (path.includes('//') || path.includes('\\')) return false
    if (/[\s<>"]/.test(path)) return false
    return true
}

export function parseWorldSnapshot(raw: unknown): WorldSnapshot | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const row = raw as Record<string, unknown>
    const colorMode: ColorMode =
        row.colorMode === 'dark' || row.colorMode === 'system' || row.colorMode === 'light' ? row.colorMode : 'light'
    const windowsIn = Array.isArray(row.windows) ? row.windows : []
    const windows: WorldWindow[] = []
    for (const item of windowsIn.slice(0, MAX_WINDOWS)) {
        if (!item || typeof item !== 'object') continue
        const win = item as Record<string, unknown>
        if (!isSafePath(win.path)) continue
        const position = (win.position || {}) as Record<string, unknown>
        const size = (win.size || {}) as Record<string, unknown>
        const rawSnapped = win.snapped
        const snapped = rawSnapped === 'left' || rawSnapped === 'right' ? rawSnapped : false
        windows.push({
            path: win.path,
            position: { x: clampPct(num(position.x)), y: clampPct(num(position.y)) },
            size: {
                width: clampPct(num(size.width, 40)),
                height: clampPct(num(size.height, 50)),
            },
            zIndex: Math.max(0, Math.floor(num(win.zIndex))),
            ...(snapped ? { snapped } : {}),
        })
    }
    const pinnedItems = parsePinnedItems(row.pinnedItems)
    return {
        v: 1,
        wallpaper: resolveKeptWallpaper(typeof row.wallpaper === 'string' ? row.wallpaper : ''),
        colorMode,
        reduceTransparency: !!row.reduceTransparency,
        clickBehavior: row.clickBehavior === 'single' ? 'single' : 'double',
        windows,
        pinnedItems,
    }
}

function parsePinnedItems(raw: unknown): unknown[] {
    if (!Array.isArray(raw)) return []
    const out: unknown[] = []
    for (const item of raw.slice(0, MAX_PINNED)) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const label = typeof row.label === 'string' ? row.label.slice(0, 80) : ''
        const rawUrl = typeof row.url === 'string' ? row.url : ''
        const url = rawUrl.startsWith('/') && rawUrl.length <= MAX_PATH ? rawUrl : undefined
        if (rawUrl && !url) continue
        const notebookId = typeof row.notebookId === 'string' ? row.notebookId.slice(0, 80) : undefined
        const id = typeof row.id === 'string' ? row.id.slice(0, 80) : undefined
        if (!label && !url && !notebookId) continue
        const pin: Record<string, string> = {}
        if (label) pin.label = label
        if (url) pin.url = url
        if (notebookId) pin.notebookId = notebookId
        if (id) pin.id = id
        out.push(pin)
    }
    return out
}

export function readPinnedItems(): unknown[] {
    if (typeof window === 'undefined') return []
    try {
        return parsePinnedItems(JSON.parse(localStorage.getItem(PINNED_APPS_KEY) || '[]'))
    } catch {
        return []
    }
}

export function isVisitingRoom(): boolean {
    if (typeof window === 'undefined') return false
    try {
        return !!sessionStorage.getItem(VISITING_ROOM_KEY)
    } catch {
        return false
    }
}

export function readVisitingRoomToken(): string {
    if (typeof window === 'undefined') return ''
    try {
        return sessionStorage.getItem(VISITING_ROOM_KEY) || ''
    } catch {
        return ''
    }
}

export function exitVisitingRoom(): void {
    if (typeof window === 'undefined') return
    try {
        const home = sessionStorage.getItem(HOME_WORLD_KEY)
        sessionStorage.removeItem(VISITING_ROOM_KEY)
        sessionStorage.removeItem(HOME_WORLD_KEY)
        if (home) sessionStorage.setItem(PENDING_ROOM_KEY, home)
    } catch {
        /* ignore */
    }
    window.location.assign('/')
}

export function createRoomToken(): string {
    const bytes = new Uint8Array(9)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes)
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
    }
    const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789'
    let out = 'r'
    for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length]
    return out
}

export const VISITING_ROOM_KEY = 'wim_visiting_room'
export const PENDING_ROOM_KEY = 'wim_pending_room'
export const HOME_WORLD_KEY = 'wim_home_world'
export const WORLD_UPDATED_AT_KEY = 'wim_world_updated_at'
export const PINNED_APPS_KEY = 'wim_os_desktop_pinned_items'

/** Minimal live-window shape needed to collect a world snapshot. */
export type SnapshotSourceWindow = {
    minimized?: boolean
    path: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    zIndex: number
    snapped?: 'left' | 'right' | false
}

export type SnapshotViewport = {
    innerWidth: number
    innerHeight: number
    taskbarHeight: number
}

export type SnapRect = {
    size: { width: number; height: number }
    position: { x: number; y: number }
}

/** Percent-normalized windows for persistence (same rules as App collectSnapshot). */
export function collectWorldWindows(
    windows: SnapshotSourceWindow[],
    viewport: SnapshotViewport
): WorldWindow[] {
    const { innerWidth, innerHeight, taskbarHeight } = viewport
    const heightBudget = Math.max(1, innerHeight - taskbarHeight)
    return [...windows]
        .filter((win) => !win.minimized && win.path.startsWith('/'))
        .sort((a, b) => a.zIndex - b.zIndex)
        .slice(0, MAX_WINDOWS)
        .map((win) => ({
            path: win.path.slice(0, MAX_PATH),
            position: {
                x: (win.position.x / innerWidth) * 100,
                y: (win.position.y / heightBudget) * 100,
            },
            size: {
                width: (win.size.width / innerWidth) * 100,
                height: (win.size.height / innerHeight) * 100,
            },
            zIndex: win.zIndex,
            snapped: win.snapped,
        }))
}

export function buildWorldSnapshot(input: {
    wallpaper: string
    colorMode: ColorMode
    reduceTransparency?: boolean
    clickBehavior?: 'single' | 'double'
    windows: WorldWindow[]
    pinnedItems?: unknown[]
}): WorldSnapshot {
    return {
        v: 1,
        wallpaper: resolveKeptWallpaper(input.wallpaper),
        colorMode: input.colorMode,
        reduceTransparency: !!input.reduceTransparency,
        clickBehavior: input.clickBehavior === 'single' ? 'single' : 'double',
        windows: input.windows,
        pinnedItems: input.pinnedItems,
    }
}

/**
 * Rebuild desktop AppWindow fields from a persisted WorldWindow.
 * Snap geometry is applied via `applySnapOverrides` (typically buildSnapOverrides)
 * so restore stays consistent with live snap updates.
 */
export function restoreAppWindowFromWorld(
    win: WorldWindow,
    index: number,
    opts: {
        innerWidth: number
        innerHeight: number
        taskbarHeight: number
        fullW: number
        fullH: number
        isMobileClient: boolean
        applySnapOverrides: (
            snappedSide: 'left' | 'right' | false,
            prevWindow: { size: { width: number; height: number }; position: { x: number; y: number } },
            snapRect: SnapRect | null
        ) => Record<string, unknown>
        getSnapRect: (side: 'left' | 'right') => SnapRect | null
    }
): Record<string, unknown> {
    const size = {
        width: (win.size.width / 100) * opts.innerWidth,
        height: (win.size.height / 100) * opts.innerHeight,
    }
    const position = {
        x: (win.position.x / 100) * opts.innerWidth,
        y: (win.position.y / 100) * (opts.innerHeight - opts.taskbarHeight),
    }
    const label = win.path.split('/').filter(Boolean).pop() || 'Window'
    const baseWin: Record<string, unknown> = {
        key: `${win.path}#${index}`,
        path: win.path,
        title: label,
        meta: { title: label },
        size: opts.isMobileClient ? { width: opts.fullW, height: opts.fullH } : size,
        position: opts.isMobileClient ? { x: 0, y: 0 } : position,
        previousSize: size,
        previousPosition: position,
        sizeConstraints: {
            min: { width: 280, height: 180 },
            max: { width: opts.fullW, height: opts.fullH },
        },
        fixedSize: false,
        element: null,
        zIndex: win.zIndex || index + 1,
        minimized: false,
        windowed: true,
        expanded: opts.isMobileClient,
        snapped: opts.isMobileClient ? false : win.snapped || false,
        fromHistory: false,
        props: { path: win.path },
    }

    if (!opts.isMobileClient && (win.snapped === 'left' || win.snapped === 'right')) {
        const snapRect = opts.getSnapRect(win.snapped)
        Object.assign(
            baseWin,
            opts.applySnapOverrides(win.snapped, baseWin as { size: typeof size; position: typeof position }, snapRect)
        )
    }

    return baseWin
}
