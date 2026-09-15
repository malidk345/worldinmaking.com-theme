export type WorkspacePresetName =
    | 'deep_reading'
    | 'studio'
    | 'minimal'
    | 'split_dual'
    | 'research'

export type WorkspacePresetLayout =
    | { kind: 'split'; left: string; right: string }
    | { kind: 'focus'; path: string }

/** Diff Split / dual-tile: prefer an open notebook on the left, Ask AI on the right. */
export function resolveSplitDualPaths(windows: { path: string }[]): { left: string; right: string } {
    const openNotebook = windows.find((w) => w.path.startsWith('/notebooks/'))
    const leftPath = openNotebook ? openNotebook.path : '/notebooks'
    return {
        left: leftPath,
        right: '/workspace-chat',
    }
}

/**
 * Resolve a named workspace preset to concrete window paths.
 * Returns null for unknown/empty presets (caller should no-op, not guess).
 * Known: deep_reading, studio, minimal, split_dual, research.
 */
export function resolveWorkspacePresetLayout(
    preset: string | undefined | null,
    windows: { path: string }[] = []
): WorkspacePresetLayout | null {
    const p = String(preset || '')
        .toLowerCase()
        .trim()
    if (!p) return null

    switch (p) {
        case 'deep_reading':
            return { kind: 'split', left: '/posts', right: '/notebooks' }
        case 'studio':
            return { kind: 'split', left: '/notebooks', right: '/workspace-chat' }
        case 'minimal':
            return { kind: 'focus', path: '/notebooks' }
        case 'split_dual':
            return { kind: 'split', ...resolveSplitDualPaths(windows) }
        case 'research':
            return { kind: 'split', left: '/scratchpad', right: '/notebooks' }
        default:
            return null
    }
}
