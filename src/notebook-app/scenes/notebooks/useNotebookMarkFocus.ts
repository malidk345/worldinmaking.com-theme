import { useEffect } from 'react'
import { useUser } from '../../../hooks/useUser'

function markParamFromLocation(): 'mention' | 'comment' | null {
    if (typeof window === 'undefined') return null
    const search = `${window.location.search || ''}${window.location.hash || ''}`
    const params = new URLSearchParams(window.location.search)
    const fromQuery = (params.get('mark') || params.get('focus') || '').toLowerCase()
    if (fromQuery === 'mention' || fromQuery === 'comment') return fromQuery
    if (/[#?&]mark=comment|#comment/i.test(search)) return 'comment'
    if (/[#?&]mark=mention|#mention/i.test(search)) return 'mention'
    return null
}

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

export function useNotebookMarkFocus(notebookId?: string): void {
    const { user } = useUser()
    const userId = user?.id || (user as { profile?: { id?: string } } | null)?.profile?.id
    const username = (user as { username?: string; profile?: { username?: string } } | null)?.username || user?.profile?.username

    useEffect(() => {
        if (!notebookId || typeof window === 'undefined') return
        const mark = markParamFromLocation()
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
            if (tick() || tries > 25) window.clearInterval(timer)
        }, 120)
        return () => window.clearInterval(timer)
    }, [notebookId, userId, username])
}
