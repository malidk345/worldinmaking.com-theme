import type { AppWindow } from '../context/Window'

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

export const windowModeFlags = (mode: WindowMode) => ({
    expanded: mode === 'maximized',
    windowed: mode === 'normal',
    snapped: mode === 'snapped-left' ? ('left' as const) : mode === 'snapped-right' ? ('right' as const) : false,
})

export const getWindowMode = (window: Pick<AppWindow, 'expanded' | 'snapped'>): WindowMode => {
    if (window.expanded) return 'maximized'
    if (window.snapped === 'left') return 'snapped-left'
    if (window.snapped === 'right') return 'snapped-right'
    return 'normal'
}

export const isMaximizedWindow = (window: Pick<AppWindow, 'expanded' | 'snapped'>): boolean =>
    getWindowMode(window) === 'maximized'
