import { resolveKeptWallpaper, type ColorMode, type WallpaperName } from './wallpaperChrome'

export type WorldWindow = {
    path: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    zIndex: number
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
        windows.push({
            path: win.path,
            position: { x: clampPct(num(position.x)), y: clampPct(num(position.y)) },
            size: {
                width: clampPct(num(size.width, 40)),
                height: clampPct(num(size.height, 50)),
            },
            zIndex: Math.max(0, Math.floor(num(win.zIndex))),
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
