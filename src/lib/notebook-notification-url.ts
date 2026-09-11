export type NotebookNotificationMark = 'mention' | 'comment'

export function parseNotebookNotificationMark(input?: string | null): NotebookNotificationMark | null {
    const raw = String(input || '')
    if (!raw) return null
    if (raw === 'mention' || raw === 'comment') return raw
    try {
        if (/^[a-z]+:\/\//i.test(raw)) {
            const mark = new URL(raw).searchParams.get('mark')
            if (mark === 'mention' || mark === 'comment') return mark
        }
    } catch {
        /* fall through */
    }
    const query = raw.includes('?')
        ? raw.slice(raw.indexOf('?') + 1).split('#')[0]
        : raw.startsWith('mark=')
          ? raw
          : ''
    if (query) {
        const mark = new URLSearchParams(query).get('mark')
        if (mark === 'mention' || mark === 'comment') return mark
    }
    if (/#comment\b/i.test(raw)) return 'comment'
    if (/#mention\b/i.test(raw)) return 'mention'
    return null
}

export function notebookNotificationUrl(
    notebookId: string,
    mark?: NotebookNotificationMark | string | null
): string {
    const id = String(notebookId || '').trim()
    if (!id) return '/notebooks'
    const parsed = parseNotebookNotificationMark(mark)
    if (parsed) return `/notebooks/${id}?mark=${parsed}`
    return `/notebooks/${id}`
}
