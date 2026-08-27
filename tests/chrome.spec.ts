import { test, expect } from '@playwright/test'
import { chromeStylesheet, rewriteArtifactChrome, wrapChromeDocument } from '../src/lib/chrome'
import { WIM_UI_SOURCE } from '../src/components/ClaudeWorkspaceChat/sandbox/wimUiSource'
import { UI_DESIGN_INSTRUCTION } from '../src/lib/ai/design-request'
import { normalizeSandboxReactSource } from '../src/components/ClaudeWorkspaceChat/sandbox/wimUiSource'

test.describe('artifact chrome architecture', () => {
    test('shadcn brand primary becomes host navy before surfaces become paper', () => {
        expect(rewriteArtifactChrome('min-h-screen bg-slate-50')).toContain('min-h-full')
        expect(rewriteArtifactChrome('min-h-screen bg-slate-50')).not.toContain('min-h-screen')
        expect(rewriteArtifactChrome('className="bg-background text-foreground"')).toContain('bg-primary')
        expect(rewriteArtifactChrome('className="bg-background text-foreground"')).toContain('text-primary')
        expect(rewriteArtifactChrome('className="bg-background"')).not.toContain('bg-navy')
        expect(rewriteArtifactChrome('className="bg-primary text-primary-foreground"')).toBe(
            'className="bg-navy text-white"'
        )
    })

    test('slate / violet kits collapse onto host tokens', () => {
        const next = rewriteArtifactChrome(
            'className="min-h-screen bg-slate-900 text-slate-50 border-slate-200 rounded-2xl shadow-lg bg-violet-600"'
        )
        expect(next).toContain('bg-primary')
        expect(next).toContain('text-primary')
        expect(next).toContain('border-primary')
        expect(next).toContain('rounded')
        expect(next).not.toMatch(/\bshadow\b/)
        expect(next).toContain('bg-navy')
        expect(next).not.toContain('slate-')
        expect(next).not.toContain('violet-')
    })

    test('stylesheet speaks host --bg, not shadcn --background', () => {
        const css = chromeStylesheet()
        expect(css).toContain('--bg:')
        expect(css).toContain('.bg-navy')
        expect(css).toContain('.bg-primary { background-color: rgb(var(--bg)); }')
        expect(css).not.toContain('--background:')
        expect(css).not.toContain('240 5.9% 10%')
    })

    test('@wim/ui registry is rewritten to host classes', () => {
        expect(WIM_UI_SOURCE).toContain('bg-navy')
        expect(WIM_UI_SOURCE).toContain('border-primary')
        expect(WIM_UI_SOURCE).toContain('text-primary')
        expect(WIM_UI_SOURCE).not.toContain('text-primary-foreground')
        expect(WIM_UI_SOURCE).not.toContain('bg-background')
    })

    test('sandbox normalize rewrites LLM classes', () => {
        const source = normalizeSandboxReactSource(
            'export default function Screen() { return <div className="bg-slate-50 text-foreground">Hi</div> }'
        )
        expect(source).toContain('bg-primary')
        expect(source).toContain('text-primary')
        expect(source).not.toContain('bg-slate-50')
    })

    test('HTML wrap injects host chrome and rewrites classes', () => {
        const doc = wrapChromeDocument('<div class="bg-background text-slate-900">Hi</div>')
        expect(doc).toContain('data-wim-chrome')
        expect(doc).toContain('--bg:')
        expect(doc).toContain('class="bg-primary text-primary"')
        expect(doc).toContain('cdn.tailwindcss.com')
    })

    test('model prompt uses host token names', () => {
        expect(UI_DESIGN_INSTRUCTION).toContain('bg-navy')
        expect(UI_DESIGN_INSTRUCTION).toContain('bg-primary')
        expect(UI_DESIGN_INSTRUCTION).toContain('bg-background')
    })
})
