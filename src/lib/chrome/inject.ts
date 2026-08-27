import { chromeStylesheet } from './css'
import { readHostChrome } from './host'
import { rewriteArtifactChrome } from './rewrite'
import { FALLBACK_CHROME, type ChromeSnapshot } from './tokens'

export function wrapChromeDocument(html: string, snap?: ChromeSnapshot): string {
    const rewritten = rewriteArtifactChrome(html)
    const css = chromeStylesheet(snap || (typeof document === 'undefined' ? FALLBACK_CHROME : readHostChrome()))
    const style = `<style data-wim-chrome="true">${css}</style>`
    const tailwind = /tailwind/i.test(rewritten) ? '' : '<script src="https://cdn.tailwindcss.com"></script>'
    const inject = `${tailwind}${style}`
    if (/<\/head>/i.test(rewritten)) return rewritten.replace(/<\/head>/i, `${inject}</head>`)
    if (/<html[\s>]/i.test(rewritten)) {
        return rewritten.replace(/<html[^>]*>/i, (open) => `${open}<head><meta charset="utf-8"/>${inject}</head>`)
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${inject}</head><body>${rewritten}</body></html>`
}

export const WIM_UI_CHROME_PROMPT = `
VISUAL CHROME — WorldInMaking host tokens only (same names as the OS):
- Surface: bg-primary. Ink: text-primary. Muted: text-muted / text-secondary. Actions: bg-navy text-white (#1D4ED8). Strokes: border-primary. Radius: rounded (6px).
- Import Card, Button, Badge, Tabs, Input, Table from @wim/ui. Borders, not drop shadows.
- Do not use shadcn names (bg-background, text-foreground, bg-primary as a brand fill, text-primary-foreground). Do not use slate-*, zinc-*, violet-*, indigo-*, Inter, or gradient mesh kits.
`.trim()
