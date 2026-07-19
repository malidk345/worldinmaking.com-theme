// OS window chrome surface styles — centralized so every surface is consistent.
// heaterMode = true  → frosted glass (default, backdrop-blur enabled)
// heaterMode = false → solid opaque bg, no blur (Reduce transparency mode)

/** App windows — frosted by default; solid when reduce transparency is on */
export const WINDOW_BG = 'bg-white/75 dark:bg-black/75 backdrop-blur-3xl transform-gpu reduce-transparency:!bg-white reduce-transparency:dark:!bg-zinc-900 reduce-transparency:backdrop-blur-none'

/** Panel bg (sidebars, overlays) */
export const PANEL_BG = 'bg-white/75 dark:bg-black/75 backdrop-blur-3xl transform-gpu reduce-transparency:!bg-white reduce-transparency:dark:!bg-zinc-900 reduce-transparency:backdrop-blur-none'

/** Taskbar — always has a subtle blur regardless of heaterMode */
export const TASKBAR_BG = 'bg-white/50 dark:bg-black/50 backdrop-blur-3xl transform-gpu'

/** GPU layer hint for surfaces in motion */
export const MOTION_LAYER = 'will-change-[transform,backdrop-filter] reduce-transparency:will-change-transform'

export const getWindowSurfaceBg = () => WINDOW_BG
export const getPanelSurfaceBg = () => PANEL_BG
export const getTaskbarSurfaceBg = () => TASKBAR_BG
export const getSurfaceMotionLayer = (active?: boolean) => active ? MOTION_LAYER : ''
export const getTaskbarMotionLayer = (active?: boolean) => active ? MOTION_LAYER : ''
