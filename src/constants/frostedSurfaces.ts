// OS window chrome — full literal strings so Tailwind JIT picks up every class.
// Default: frosted glass. Solid opaque when body[data-reduce-transparency="true"]
// or prefers-reduced-transparency (via the \`reduce-transparency:\` variant).

/** App windows — frosted by default; solid when reduce transparency is on */
export const WINDOW_BG =
    'bg-white/95 dark:bg-[#121214]/95 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-[#0a0a0c]/80 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:saturate-[190%] border border-black/10 dark:border-white/10 reduce-transparency:!bg-primary reduce-transparency:backdrop-blur-none reduce-transparency:saturate-100'

/** Reader sidebar overlays */
export const PANEL_BG =
    'bg-white/95 dark:bg-[#121214]/95 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-[#0a0a0c]/80 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:saturate-[190%] border border-black/10 dark:border-white/10 reduce-transparency:!bg-primary reduce-transparency:backdrop-blur-none reduce-transparency:saturate-100'

/** Taskbar — always frosted; not tied to reduce transparency */
export const TASKBAR_BG = 'bg-white/95 dark:bg-[#121214]/95 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-[#0a0a0c]/80 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:saturate-[190%] border border-black/10 dark:border-white/10'

/** Promote compositor layers while a surface is moving */
export const MOTION_LAYER = 'will-change-[transform,backdrop-filter] reduce-transparency:will-change-transform'
