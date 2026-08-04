import { uuid } from '../../lib/utils/dom'

export interface StoredNotebook {
    id: string
    short_id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
    pinned?: boolean
    isTemplate?: boolean
    version: number
    created_by?: { first_name: string; email: string }
    last_modified_by?: { first_name: string; email: string }
}

export interface NotebookVersion {
    version: number
    content: string
    timestamp: string
}

const STORAGE_KEY = 'ph_standalone_notebooks'
const HISTORY_KEY_PREFIX = 'ph_notebook_history_'

export const DEFAULT_NOTEBOOKS: StoredNotebook[] = [
    {
        id: 'welcome-notebook',
        short_id: 'welcome',
        title: 'Welcome to PostHog Notebooks! 🎉',
        content: `# Welcome to Notebooks\n\nPostHog Notebooks combine markdown with your actual analytics data. You can add queries, recordings, feature flags, and more right into your documents.\n\nTry typing \`/\` to see the available elements you can insert, or drag and drop elements from the sidebar.\n\n<ph-query />`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: true,
        version: 1,
    },
    {
        id: 'template-introducing',
        short_id: 'tmpl-intro',
        title: 'Introducing Notebooks! 🥳',
        content: '# Introducing Notebooks! 🥳\n\nShare context with your team.\n\n<ph-query />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    },
    {
        id: 'template-release-plan',
        short_id: 'tmpl-release',
        title: 'Feature Release Plan 🚀',
        content: '# Feature Release Plan 🚀\n\n## Overview\n\n## Feature Flags\n<ph-feature-flag />\n\n## Experiments\n<ph-experiment />\n\n## Rollout Metrics\n<ph-query />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    },
    {
        id: 'template-rca',
        short_id: 'tmpl-rca',
        title: 'Root Cause Analysis (RCA) 🔍',
        content: '# Root Cause Analysis (RCA) 🔍\n\n## Incident Summary\n\n## Timeline\n\n## Impact\n<ph-query />\n\n## Example Session\n<ph-recording />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    },
    {
        id: 'template-sql-report',
        short_id: 'tmpl-sql',
        title: 'HogQL & SQL Analytics Report 📊',
        content: '# HogQL & SQL Analytics Report 📊\n\nWrite advanced queries to investigate metrics.\n\n<ph-query />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    },
    {
        id: 'template-session-replay',
        short_id: 'tmpl-session',
        title: 'Session Replay Investigation 🎬',
        content: '# Session Replay Investigation 🎬\n\nReviewing strange user behavior.\n\n## Anomalous Sessions\n<ph-recording />\n<ph-recording />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    },
    {
        id: 'template-ab-test',
        short_id: 'tmpl-ab',
        title: 'A/B Test Analysis 🧪',
        content: '# A/B Test Analysis 🧪\n\n## Hypothesis\n\n## Experiment Setup\n<ph-experiment />\n\n## Results\n<ph-query />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    },
    {
        id: 'template-retention',
        short_id: 'tmpl-retention',
        title: 'User Retention Deep Dive 📈',
        content: '# User Retention Deep Dive 📈\n\n## Target Cohort\n<ph-cohort />\n\n## Retention Matrix\n<ph-query />',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        version: 1,
    }
]

export function getNotebooks(): StoredNotebook[] {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTEBOOKS))
        return DEFAULT_NOTEBOOKS
    }
    try {
        return JSON.parse(data)
    } catch {
        return DEFAULT_NOTEBOOKS
    }
}

export function getNotebook(id: string): StoredNotebook | undefined {
    return getNotebooks().find((n) => n.id === id || n.short_id === id)
}

export function saveNotebook(notebook: StoredNotebook): void {
    const notebooks = getNotebooks()
    const index = notebooks.findIndex((n) => n.id === notebook.id)
    
    notebook.updatedAt = new Date().toISOString()
    
    // Save version history before incrementing version
    const historyKey = `${HISTORY_KEY_PREFIX}${notebook.id}`
    const history = getNotebookHistory(notebook.id)
    history.push({
        version: notebook.version,
        content: notebook.content,
        timestamp: notebook.updatedAt
    })
    // Keep last 50 versions to avoid localstorage bloat
    if (history.length > 50) {
        history.shift()
    }
    localStorage.setItem(historyKey, JSON.stringify(history))
    
    notebook.version += 1
    
    if (index >= 0) {
        notebooks[index] = notebook
    } else {
        notebooks.push(notebook)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
}

export function deleteNotebook(id: string): void {
    const notebooks = getNotebooks().filter((n) => n.id !== id && n.short_id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
    localStorage.removeItem(`${HISTORY_KEY_PREFIX}${id}`)
}

export function createNotebook(title?: string, content?: string): StoredNotebook {
    const id = uuid()
    const now = new Date().toISOString()
    const notebook: StoredNotebook = {
        id,
        short_id: id.substring(0, 8),
        title: title || 'Untitled Notebook',
        content: content || '',
        createdAt: now,
        updatedAt: now,
        version: 1,
    }
    
    const notebooks = getNotebooks()
    notebooks.push(notebook)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
    
    return notebook
}

export function duplicateNotebook(id: string): StoredNotebook | undefined {
    const source = getNotebook(id)
    if (!source) return undefined
    
    return createNotebook(`${source.title} (Copy)`, source.content)
}

export function getNotebookHistory(id: string): NotebookVersion[] {
    const data = localStorage.getItem(`${HISTORY_KEY_PREFIX}${id}`)
    if (!data) return []
    try {
        return JSON.parse(data)
    } catch {
        return []
    }
}

export function restoreNotebookVersion(id: string, version: number): StoredNotebook | undefined {
    const notebook = getNotebook(id)
    if (!notebook) return undefined
    
    const history = getNotebookHistory(id)
    const targetVersion = history.find(h => h.version === version)
    
    if (!targetVersion) return undefined
    
    notebook.content = targetVersion.content
    saveNotebook(notebook)
    
    return notebook
}

export function importNotebookFromJSON(jsonStr: string): StoredNotebook {
    const parsed = JSON.parse(jsonStr)
    const notebook = createNotebook(parsed.title, parsed.content)
    if (parsed.pinned !== undefined) notebook.pinned = parsed.pinned
    saveNotebook(notebook)
    return notebook
}

export function exportNotebookAsJSON(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')
    return JSON.stringify(notebook, null, 2)
}

export function exportNotebookAsMarkdown(id: string): string {
    const notebook = getNotebook(id)
    if (!notebook) throw new Error('Notebook not found')
    return notebook.content
}
