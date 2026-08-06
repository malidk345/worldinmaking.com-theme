import type { AppWindow } from '../context/Window'
import type { ReactNode } from 'react'

export type WindowUpdate = {
    position?: { x?: number; y?: number }
    size?: { width?: number; height?: number }
    previousPosition?: { x?: number; y?: number }
    previousSize?: { width?: number; height?: number }
    element?: ReactNode
    expanded?: boolean
    windowed?: boolean
    snapped?: 'left' | 'right' | false
    appSettings?: AppWindow['appSettings']
    path?: string
    props?: Record<string, any>
    location?: any
}

export type WindowMode = 'normal' | 'maximized' | 'snapped-left' | 'snapped-right'

export type WindowModeAction =
    | { type: 'toggle-maximize' }
    | { type: 'snap'; side: 'left' | 'right' }
    | { type: 'restore' }

export const transitionWindowMode = (mode: WindowMode, action: WindowModeAction): WindowMode => {
    if (action.type === 'toggle-maximize') return mode === 'maximized' ? 'normal' : 'maximized'
    if (action.type === 'snap') return action.side === 'left' ? 'snapped-left' : 'snapped-right'
    return 'normal'
}

export const windowModeFlags = (
    mode: WindowMode
): { expanded: boolean; windowed: boolean; snapped: AppWindow['snapped'] } => {
    // Explicit AppWindow['snapped'] so `false` is not widened to `boolean`.
    let snapped: AppWindow['snapped'] = false
    if (mode === 'snapped-left') snapped = 'left'
    else if (mode === 'snapped-right') snapped = 'right'
    return {
        expanded: mode === 'maximized',
        windowed: mode === 'normal',
        snapped,
    }
}

export const getWindowMode = (window: Pick<AppWindow, 'expanded' | 'snapped'>): WindowMode => {
    if (window.expanded) return 'maximized'
    if (window.snapped === 'left') return 'snapped-left'
    if (window.snapped === 'right') return 'snapped-right'
    return 'normal'
}

export const isMaximizedWindow = (window: Pick<AppWindow, 'expanded' | 'snapped'>): boolean =>
    getWindowMode(window) === 'maximized'

export const mergeWindowUpdate = (window: AppWindow, updates: WindowUpdate): AppWindow => {
    const nextPath = updates.path !== undefined ? updates.path : window.path
    return {
        ...window,
        position: { ...window.position, ...(updates.position || {}) },
        size: { ...window.size, ...(updates.size || {}) },
        previousPosition: { ...window.previousPosition, ...(updates.previousPosition || {}) },
        previousSize: { ...window.previousSize, ...(updates.previousSize || {}) },
        ...(updates.element ? { element: updates.element } : {}),
        ...(updates.expanded !== undefined ? { expanded: updates.expanded } : {}),
        ...(updates.windowed !== undefined ? { windowed: updates.windowed } : {}),
        ...(updates.snapped !== undefined ? { snapped: updates.snapped } : {}),
        ...(updates.appSettings ? { appSettings: { ...window.appSettings, ...updates.appSettings } } : {}),
        ...(updates.path !== undefined ? { path: updates.path } : {}),
        ...(updates.props
            ? { props: { ...(window.props || {}), ...updates.props, path: nextPath } }
            : updates.path !== undefined
              ? { props: { ...(window.props || {}), path: updates.path } }
              : {}),
        ...(updates.location !== undefined
            ? { location: updates.location }
            : updates.path !== undefined
              ? { location: { ...(window.location || {}), pathname: updates.path } }
              : {}),
    }
}
