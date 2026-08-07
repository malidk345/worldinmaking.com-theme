// OS window chrome — full literal strings so Tailwind JIT picks up every class.
// Default: frosted glass. Solid opaque when body[data-reduce-transparency="true"]
// or prefers-reduced-transparency (via the `reduce-transparency:` variant).

/** App windows — frosted by default; solid when reduce transparency is on */
export const WINDOW_BG =
    'bg-white/40 dark:bg-[#0a0a0c]/70 backdrop-blur-[25px] backdrop-saturate-[190%] transform-gpu reduce-transparency:!bg-primary reduce-transparency:backdrop-blur-none'

/** Reader sidebar overlays */
export const PANEL_BG =
    'bg-white/40 dark:bg-primary backdrop-blur-[25px] backdrop-saturate-[190%] transform-gpu reduce-transparency:!bg-primary reduce-transparency:backdrop-blur-none'

/** Taskbar — always frosted; not tied to reduce transparency */
export const TASKBAR_BG = 'bg-white/40 dark:bg-[#0a0a0c]/70 backdrop-blur-[25px] backdrop-saturate-[190%] transform-gpu'

/** Promote compositor layers while a surface is moving */
export const MOTION_LAYER = 'will-change-[transform,backdrop-filter] reduce-transparency:will-change-transform'
