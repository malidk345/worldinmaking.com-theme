import type { AppWindow } from '../context/Window'

export const ASK_AI_PATH = '/workspace-chat'
export const ASK_AI_KEY = 'ask-ai'

/** Named layout slots — not a new chrome layer. Path is content; slot is who sits left/right. */
export const WINDOW_SLOTS = {
    notebook: 'notebook',
    askAi: 'ask-ai',
} as const

export function windowSlot(windowItem: Pick<AppWindow, 'key' | 'path'>): 'notebook' | 'ask-ai' | null {
    if (windowItem.key === ASK_AI_KEY || isAskAiPath(windowItem.path)) return WINDOW_SLOTS.askAi
    if (typeof windowItem.path === 'string' && /^\/notebooks/.test(windowItem.path)) return WINDOW_SLOTS.notebook
    return null
}

export function isAskAiPath(path?: string): boolean {
    return typeof path === 'string' && (path === ASK_AI_PATH || path.startsWith(`${ASK_AI_PATH}/`))
}

export function findAskAiWindow(windows: AppWindow[]): AppWindow | undefined {
    return windows.find((windowItem) => windowItem.key === ASK_AI_KEY || isAskAiPath(windowItem.path))
}

export function findNotebookWindow(windows: AppWindow[]): AppWindow | undefined {
    const notebooks = windows.filter((windowItem) => typeof windowItem.path === 'string' && /^\/notebooks/.test(windowItem.path))
    return notebooks.find((windowItem) => !windowItem.minimized) || notebooks[0]
}

type OpenAskAiArgs = {
    notebookId?: string
    notebookTitle?: string
    windows: AppWindow[]
    isMobile?: boolean
    addWindow: (item: Record<string, unknown>) => void
    updateWindow: (windowItem: AppWindow, updates: Partial<AppWindow>) => void
    snapWindow: (side: 'left' | 'right', windowItem: AppWindow) => void
}

/** Open Ask AI as a real window. On desktop, snap it right and the notebook left. */
export function openAskAiWindow({
    notebookId,
    notebookTitle,
    windows,
    isMobile,
    addWindow,
    updateWindow,
    snapWindow,
}: OpenAskAiArgs): void {
    const title = notebookTitle ? `Ask AI · ${notebookTitle}` : 'Ask AI'
    const notebookWindow = findNotebookWindow(windows)
    const existing = findAskAiWindow(windows)

    if (!isMobile && notebookWindow) {
        snapWindow('left', notebookWindow)
    }

    if (existing) {
        updateWindow(existing, {
            minimized: false,
            meta: { ...(existing.meta || {}), title },
            title,
        })
        if (!isMobile) snapWindow('right', existing)
        return
    }

    addWindow({
        key: ASK_AI_KEY,
        path: ASK_AI_PATH,
        title,
        size: { width: 420, height: 720 },
        snapped: isMobile ? false : 'right',
        expanded: Boolean(isMobile),
    })
}
