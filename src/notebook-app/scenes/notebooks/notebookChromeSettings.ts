export type NotebookFontSize = 'sm' | 'md' | 'lg'
export type NotebookAutosaveMs = 800 | 1100 | 2500

export type NotebookChromeSettings = {
    wide: boolean
    fontSize: NotebookFontSize
    autosaveMs: NotebookAutosaveMs
    spellcheck: boolean
}

const STORAGE_KEY = 'wim_notebook_chrome_v1'

const DEFAULTS: NotebookChromeSettings = {
    wide: false,
    fontSize: 'md',
    autosaveMs: 1100,
    spellcheck: true,
}

function parseAutosave(value: unknown): NotebookAutosaveMs {
    if (value === 800 || value === 1100 || value === 2500) return value
    return DEFAULTS.autosaveMs
}

function parseFont(value: unknown): NotebookFontSize {
    if (value === 'sm' || value === 'md' || value === 'lg') return value
    return DEFAULTS.fontSize
}

export function readNotebookChromeSettings(): NotebookChromeSettings {
    if (typeof window === 'undefined') return DEFAULTS
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULTS
        const parsed = JSON.parse(raw) as Partial<NotebookChromeSettings>
        return {
            wide: parsed.wide === true,
            fontSize: parseFont(parsed.fontSize),
            autosaveMs: parseAutosave(parsed.autosaveMs),
            spellcheck: parsed.spellcheck !== false,
        }
    } catch {
        return DEFAULTS
    }
}

export function writeNotebookChromeSettings(next: NotebookChromeSettings): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
        /* ignore */
    }
}
