// OS window chrome surface styles — centralized so every surface is consistent.
// heaterMode = true  → frosted glass (default, backdrop-blur enabled)
// heaterMode = false → solid opaque bg, no blur (Reduce transparency mode)

/** Solid window bg — no blur (matches Community Forum list inner bg) */
export const WINDOW_BG = 'bg-white dark:bg-[#121214] transform-gpu'

/** Frosted glass window bg — default when heaterMode is on */
export const HEATER_WINDOW_BG =
    'bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl transform-gpu'

/** Panel bg (sidebars, overlays) — solid */
export const PANEL_BG = 'bg-white dark:bg-[#121214] transform-gpu'

/** Frosted panel bg — default when heaterMode is on */
export const HEATER_PANEL_BG =
    'bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl transform-gpu'

/** Taskbar — always has a subtle blur regardless of heaterMode */
export const TASKBAR_BG =
    'bg-white/70 dark:bg-[#121214]/60 backdrop-blur-2xl backdrop-saturate-150 transform-gpu'

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
