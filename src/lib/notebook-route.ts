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
