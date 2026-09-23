import type { AppWindow } from '../context/Window'

export function openNotebookWindow({
    notebookId,
    notebookTitle,
    windows,
    isMobile,
    addWindow,
    mark,
}: {
    notebookId: string
    notebookTitle?: string
    windows: AppWindow[]
    isMobile?: boolean
    addWindow: (item: Record<string, unknown>) => void
    /** Kept so existing call sites typecheck. Focus goes through addWindow — mergeWindowUpdate drops minimized/focused. */
    updateWindow?: (windowItem: AppWindow, updates: Partial<AppWindow>) => void
    mark?: 'mention' | 'comment' | string
}): void {
    const suffix = mark ? `?mark=${encodeURIComponent(mark)}` : ''
    const targetPath = `/notebooks/${notebookId}${suffix}`
    const existing = windows.find(
        (w) => w.key === `notebook-${notebookId}` || String(w.path || '').startsWith(`/notebooks/${notebookId}`)
    )

    if (existing) {
        addWindow({
            key: existing.key || `notebook-${notebookId}`,
            path: targetPath,
            title: notebookTitle || existing.title || 'Notebook',
        })
        return
    }

    addWindow({
        key: `notebook-${notebookId}`,
        path: targetPath,
        title: notebookTitle || 'Notebook',
        icon: 'notebook',
        focused: true,
        width: isMobile ? undefined : 800,
        height: isMobile ? undefined : 640,
    })
}
