import type { AppWindow } from '../context/Window'

export function openNotebookWindow({
    notebookId,
    notebookTitle,
    windows,
    isMobile,
    addWindow,
    updateWindow,
    mark,
}: {
    notebookId: string
    notebookTitle?: string
    windows: AppWindow[]
    isMobile?: boolean
    addWindow: (item: Record<string, unknown>) => void
    updateWindow: (windowItem: AppWindow, updates: Partial<AppWindow>) => void
    mark?: 'mention' | 'comment' | string
}): void {
    const suffix = mark ? `?mark=${encodeURIComponent(mark)}` : ''
    const targetPath = `/notebooks/${notebookId}${suffix}`
    const existing = windows.find(
        (w) => w.key === `notebook-${notebookId}` || String(w.path || '').startsWith(`/notebooks/${notebookId}`)
    )

    if (existing) {
        updateWindow(existing, { minimized: false, focused: true, path: targetPath })
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
