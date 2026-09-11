import { useEffect } from 'react'
import { useUser } from '../../../hooks/useUser'
import { useWindow } from '../../../context/Window'
import { parseNotebookNotificationMark } from '../../../lib/notebook-notification-url'

function flash(el: Element): void {
    el.classList.add('notebook-outline-flash')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => el.classList.remove('notebook-outline-flash'), 1600)
}

function findMentionTarget(userId?: string | null, username?: string | null): Element | null {
    const keys = [userId, username].map((value) => String(value || '').trim()).filter(Boolean)
    for (const key of keys) {
        const safe = CSS.escape(key)
        const hit =
            document.querySelector(`[data-notebook-mention="${safe}"]`) ||
            document.querySelector(`mention[id="${safe}"]`)
        if (hit) return hit.closest('[data-markdown-notebook-node-id]') || hit
    }
    return document.querySelector('[data-notebook-mention]')
}

function findCommentTarget(): Element | null {
    return (
        document.querySelector('[data-notebook-comment]') ||
        document.querySelector('[data-markdown-notebook-node-type="comment"]') ||
        document.querySelector('.MarkdownNotebook__comment, .DiscussionCommentBlock')
    )
}

export function useNotebookMarkFocus(notebookId?: string, readyHint?: string): void {
    const { user } = useUser()
    const { appWindow } = useWindow()
    const userId = user?.id
    const username = user?.username

    useEffect(() => {
        if (!notebookId || typeof window === 'undefined') return
        const mark =
            parseNotebookNotificationMark(appWindow?.path) ||
            parseNotebookNotificationMark(`${window.location.pathname}${window.location.search}${window.location.hash}`)
        if (!mark) return

        let tries = 0
        const tick = (): boolean => {
            const el = mark === 'comment' ? findCommentTarget() : findMentionTarget(userId, username)
            if (!el) return false
            flash(el)
            return true
        }

        if (tick()) return
        const timer = window.setInterval(() => {
            tries += 1
            if (tick() || tries > 50) window.clearInterval(timer)
        }, 160)
        return () => window.clearInterval(timer)
    }, [notebookId, readyHint, userId, username, appWindow?.path])
}
