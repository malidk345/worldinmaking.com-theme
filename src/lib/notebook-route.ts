import { extractNotebookId, notebookWindowPath, stripPathNoise } from './window-path'

export type NotebookRoute =
    | { page: 'list' }
    | { page: 'templates' }
    | { page: 'canvas' }
    | { page: 'editor'; notebookId: string }
    | { page: 'public'; notebookId: string }
    | { page: 'invite'; token: string }

export function parseNotebookRoute(path: string, hash = '', search = ''): NotebookRoute {
    const hashFromPath = path.includes('#') ? path.slice(path.indexOf('#')) : ''
    const hashToUse = hashFromPath || hash
    const clean = stripPathNoise(path)
    const parts = clean.split('/').filter(Boolean)
    const query = search ? (search.startsWith('?') ? search : `?${search}`) : ''

    if (parts[0] === 'notebooks') {
        if (parts[1] === 'templates') return { page: 'templates' }
        if (parts[1] === 'canvas') return { page: 'canvas' }
        if (parts[1] === 'n' && parts[2]) return { page: 'public', notebookId: parts[2] }
        if (parts[1] === 'invite' && parts[2]) return { page: 'invite', token: parts[2] }
    }

    const id = extractNotebookId(path) || extractNotebookId(`${clean}${query}`)
    if (id) return { page: 'editor', notebookId: id }

    const h = String(hashToUse || '').replace(/^#\/?/, '')
    if (h.startsWith('notebook/')) return { page: 'editor', notebookId: h.replace('notebook/', '') }
    if (h.startsWith('n/')) return { page: 'public', notebookId: h.replace(/^n\//, '') }
    if (h === 'canvas') return { page: 'canvas' }
    if (h === 'templates') return { page: 'templates' }
    return { page: 'list' }
}

export function notebookPathForRoute(route: NotebookRoute): string {
    if (route.page === 'editor') return notebookWindowPath(route.notebookId)
    if (route.page === 'public') return `/notebooks/n/${route.notebookId}`
    if (route.page === 'invite') return `/notebooks/invite/${route.token}`
    if (route.page === 'canvas') return '/notebooks/canvas'
    if (route.page === 'templates') return '/notebooks/templates'
    return '/notebooks'
}

export type NotebookHistoryState = { stack: string[]; index: number }

/** Editor/templates/etc. start with the list behind them so Back always has a destination. */
export function seedNotebookHistory(path: string): NotebookHistoryState {
    const current = stripPathNoise(path) || '/notebooks'
    if (current !== '/notebooks' && current.startsWith('/notebooks/')) {
        return { stack: ['/notebooks', current], index: 1 }
    }
    return { stack: [current], index: 0 }
}

export function planNotebookHistoryPush(state: NotebookHistoryState, nextPath: string): NotebookHistoryState {
    const current = stripPathNoise(nextPath) || '/notebooks'
    if (state.stack[state.index] === current) return state
    if (state.stack[state.index + 1] === current) {
        return { stack: state.stack, index: state.index + 1 }
    }
    const stack = state.stack.slice(0, state.index + 1)
    stack.push(current)
    return { stack, index: stack.length - 1 }
}

export function notebookHistoryFlags(state: NotebookHistoryState): { canGoBack: boolean; canGoForward: boolean } {
    return {
        canGoBack: state.index > 0,
        canGoForward: state.index < state.stack.length - 1,
    }
}
