import type { AppWindow } from '../context/Window'

export function openNotebookWindow({
    notebookId,
    notebookTitle,
    windows,
    isMobile,
    addWindow,
    updateWindow,
}: {
    notebookId: string
    notebookTitle?: string
    windows: AppWindow[]
    isMobile?: boolean
    addWindow: (item: Record<string, unknown>) => void
    updateWindow: (windowItem: AppWindow, updates: Partial<AppWindow>) => void
}): void {
    const targetPath = `/notebooks/${notebookId}`
    const existing = windows.find((w) => w.path === targetPath || w.key === `notebook-${notebookId}`)

    if (existing) {
        updateWindow(existing, { minimized: false, focused: true })
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
