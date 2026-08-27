import { classifyIntent, isAdminNavigationRequest } from '../artifacts/intent'
import { WIM_UI_CHROME_PROMPT } from '../wim-artifact-theme'

export { isAdminNavigationRequest }

/** Any "make this on screen" ask — exclusive of mermaid / chart / table / document intents. */
export function isUiDesignRequest(prompt: string): boolean {
    return classifyIntent(prompt) === 'react_ui'
}

const UI_LANG = /^(tsx|jsx|react|javascript|js|typescript|ts)?$/i

export function looksLikeReactSource(text: string): boolean {
    const source = String(text || '')
    if (source.length < 40) return false
    return (
        /export\s+default\s+(?:function|[A-Z])/.test(source) ||
        /from\s+['"]react['"]/.test(source) ||
        /from\s+['"]@wim\/ui['"]/.test(source) ||
        /from\s+['"]@\/components\/ui/.test(source) ||
        (/className=/.test(source) &&
            (/function\s+[A-Z]/.test(source) || /const\s+[A-Z][A-Za-z0-9]*\s*=/.test(source))) ||
        (/return\s*\(/.test(source) && /<[A-Za-z][\w.-]*[\s/>]/.test(source)) ||
        (source.includes('className=') && /<[a-z]+[\s>]/.test(source) && source.length > 80)
    )
}

function stripFence(source: string): string {
    return source
        .replace(/^```[a-z0-9_-]*[ \t]*\r?\n?/i, '')
        .replace(/\r?\n?```\s*$/i, '')
        .trim()
}

function pickBestReactFence(text: string): string | null {
    const fence = /```([a-z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/gi
    let best: string | null = null
    let match: RegExpExecArray | null
    while ((match = fence.exec(text)) !== null) {
        const lang = match[1] || ''
        const body = stripFence(match[2] || '')
        if (!UI_LANG.test(lang) && !looksLikeReactSource(body)) continue
        if (!looksLikeReactSource(body)) continue
        if (!best || body.length > best.length) best = body
    }
    return best
}

function takeUnclosedTaggedReact(text: string): string {
    const open = [...text.matchAll(/<(?:antArtifact|artifact)\s+([^>]*?)>/gi)]
    const last = open[open.length - 1]
    if (!last || last.index === undefined) return ''
    const body = text.slice(last.index + last[0].length)
    if (/<\/(?:antArtifact|artifact)>/i.test(body)) return ''
    return stripFence(body)
}

function takeUnclosedReactFence(text: string): string {
    const match = text.match(/```(tsx|jsx|react|javascript|js|typescript|ts)?[ \t]*\r?\n([\s\S]*)$/i)
    if (!match?.[2] || match[2].includes('```')) return ''
    const body = match[2].trim()
    return looksLikeReactSource(body) ? body : ''
}

/** Pull a React screen out of a model reply even if the artifact envelope is missing. */
export function extractUiScreenSource(reply: string): { title: string; content: string } | null {
    const text = String(reply || '')
    const tagged = text.match(
        /<(?:antArtifact|artifact)[^>]*type=["'](?:react|html|jsx|tsx)["'][^>]*>([\s\S]*?)<\/(?:antArtifact|artifact)>/i
    )
    const taggedBody = tagged?.[1] ? stripFence(tagged[1]) : ''
    const unclosedTagged = takeUnclosedTaggedReact(text)
    const fenced = pickBestReactFence(text)
    const unclosedFence = takeUnclosedReactFence(text)
    const candidate = stripFence(
        (taggedBody || unclosedTagged || fenced || unclosedFence || text).trim()
    )
    if (candidate.length < 40 || !looksLikeReactSource(candidate)) return null
    const titleMatch =
        text.match(/<(?:antArtifact|artifact)[^>]*title=["']([^"']+)["']/i) ||
        candidate.match(/(?:function|const)\s+([A-Z][A-Za-z0-9]*)/)
    return {
        title: (titleMatch?.[1] || 'Designed screen').slice(0, 80),
        content: candidate,
    }
}

export const UI_DESIGN_INSTRUCTION = `
BUILD TASK — OVERRIDES persona, tone, and chat style for this turn.
They asked for something on screen (anything: game, form, map, widget, page — not only dashboards).
Reply with NOTHING except one complete <antArtifact identifier="ui-1" type="react" title="Specific 2-8 word title">...</antArtifact>.
No greeting, no philosophy, no explanation, no markdown outside the tag. Code only. Build what they asked for.
- Do not send them to Admin or /admin.
- export default function ScreenName() { ... }. ${WIM_UI_CHROME_PROMPT}
- Import Card, Button, Badge, Tabs, Input, Table, Alert, Dialog, Sheet, Avatar, Switch, Checkbox, DropdownMenu from @wim/ui or @/components/ui/*. lucide-react and recharts are allowed.
- Invent labeled sample data if none was given.
- Declare every const/let ABOVE return. Never put JS statements inside JSX.
- Keep each className="..." on one line. Close every tag with > or /> on that same opening tag.
- Finish the file. Close every string, brace, paren, and </antArtifact>.
`.trim()
