export function notebookNotificationUrl(
    notebookId: string,
    mark?: 'mention' | 'comment' | null
): string {
    const id = String(notebookId || '').trim()
    if (!id) return '/notebooks'
    if (mark === 'mention' || mark === 'comment') return `/notebooks/${id}?mark=${mark}`
    return `/notebooks/${id}`
}
