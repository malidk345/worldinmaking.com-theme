// OS window chrome surface styles — centralized so every surface is consistent.
// heaterMode = true  → frosted glass (default, backdrop-blur enabled)
// heaterMode = false → solid opaque bg, no blur (Reduce transparency mode)

/** Solid window bg — no blur */
export const WINDOW_BG = 'bg-[var(--color-bg-surface-primary)] dark:bg-[var(--color-bg-3000-dark)] transform-gpu'

/** Frosted glass window bg — default when heaterMode is on */
export const HEATER_WINDOW_BG =
    'bg-[var(--color-bg-surface-primary)]/80 dark:bg-[var(--color-bg-3000-dark)]/75 backdrop-blur-xl backdrop-saturate-150 transform-gpu'

/** Panel bg (sidebars, overlays) — solid */
export const PANEL_BG = 'bg-[var(--color-bg-surface-primary)] dark:bg-[var(--color-bg-3000-dark)] transform-gpu'

/** Frosted panel bg — default when heaterMode is on */
export const HEATER_PANEL_BG =
    'bg-[var(--color-bg-surface-primary)]/80 dark:bg-[var(--color-bg-3000-dark)]/75 backdrop-blur-xl backdrop-saturate-150 transform-gpu'

/** Taskbar — subtle frosted glass matching PostHog 3000 theme */
export const TASKBAR_BG =
    'bg-[var(--color-bg-surface-primary)]/90 dark:bg-[var(--color-bg-3000-dark)]/85 backdrop-blur-xl backdrop-saturate-150 transform-gpu'

/** GPU layer hint for surfaces in motion */
export const MOTION_LAYER = 'will-change-transform'
export const HEATER_MOTION_LAYER = 'will-change-[transform,backdrop-filter]'

export const getWindowSurfaceBg = (heaterMode?: boolean) =>
    heaterMode ? HEATER_WINDOW_BG : WINDOW_BG

export const getPanelSurfaceBg = (heaterMode?: boolean) =>
    heaterMode ? HEATER_PANEL_BG : PANEL_BG

export const getTaskbarSurfaceBg = () => TASKBAR_BG

export const getSurfaceMotionLayer = (heaterMode?: boolean, active?: boolean) =>
    active ? (heaterMode ? HEATER_MOTION_LAYER : MOTION_LAYER) : ''

export const getTaskbarMotionLayer = (active?: boolean) =>
    active ? HEATER_MOTION_LAYER : ''
