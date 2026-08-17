import { readFileSync } from 'fs'
import { test, expect } from '@playwright/test'
import {
    WIMAI_BOT_NAME,
    WIMAI_SYSTEM_PROMPT,
    buildWimaiEditorUserPrompt,
    cleanWimaiEditorOutput,
    notebookExcerptForEditor,
} from '../src/lib/bots/wimai-editor'

test.describe('WIM AI inline editor', () => {
    test('system prompt is an editor, not a philosopher or chatbot', () => {
        expect(WIMAI_BOT_NAME).toBe('wimai')
        expect(WIMAI_SYSTEM_PROMPT).toContain('inline notebook editor')
        expect(WIMAI_SYSTEM_PROMPT).toContain('Follow the user instruction exactly')
        expect(WIMAI_SYSTEM_PROMPT.toLowerCase()).not.toContain('socrates')
        expect(WIMAI_SYSTEM_PROMPT.toLowerCase()).not.toContain('nietzsche')
        expect(WIMAI_SYSTEM_PROMPT).toContain('You are not a chatbot')
        expect(WIMAI_SYSTEM_PROMPT).not.toContain('<thinking>')
    })

    test('user prompt puts the instruction first and marks context as untrusted', () => {
        const prompt = buildWimaiEditorUserPrompt({
            instruction: 'Shorten this',
            selection: 'A long paragraph about wages.',
            notebook: '# Notes\nA long paragraph about wages.',
        })
        expect(prompt.startsWith('Instruction:\nShorten this')).toBe(true)
        expect(prompt).toContain('Target text (untrusted')
        expect(prompt).toContain('A long paragraph about wages.')
        expect(prompt).toContain('Surrounding notebook (untrusted')
    })

    test('omits empty target and notebook sections', () => {
        const prompt = buildWimaiEditorUserPrompt({ instruction: 'Write a heading about labor' })
        expect(prompt).toBe('Instruction:\nWrite a heading about labor')
        expect(prompt).not.toContain('Target text')
        expect(prompt).not.toContain('Surrounding notebook')
    })

    test('clean output strips fences, preambles, and thinking tags', () => {
        expect(cleanWimaiEditorOutput('```markdown\n## Labor\n```')).toBe('## Labor')
        expect(cleanWimaiEditorOutput('Here is the rewritten text:\n\nThe wage is the price.')).toBe(
            'The wage is the price.'
        )
        expect(cleanWimaiEditorOutput('<thinking>plan</thinking>\nKeep the claim.')).toBe('Keep the claim.')
    })

    test('notebook excerpt drops the writing marker and trims from the end', () => {
        const excerpt = notebookExcerptForEditor('# Title\n\nWriting…\n\nBody', 'Writing…')
        expect(excerpt).not.toContain('Writing…')
        expect(excerpt).toContain('# Title')
    })
})

test.describe('WIM AI typewriter apply', () => {
    test('replaces the writing placeholder with the finished markdown', async () => {
        const { replaceNotebookAIResponseMarkdown, NOTEBOOK_AI_WRITING_PLACEHOLDER } = await import(
            '../src/notebook-app/lib/components/MarkdownNotebook/notebookAI'
        )
        const { playInlineEditorMarkdown } = await import('../src/notebook-app/lib/wimai-typewriter')

        const base = `Before\n\n${NOTEBOOK_AI_WRITING_PLACEHOLDER}\n\nAfter`
        const frames: string[] = []
        const latest = await playInlineEditorMarkdown({
            baseMarkdown: base,
            responseNodeIndex: 1,
            fullText: 'The wage is the price of labor.',
            isCancelled: () => false,
            onFrame: (markdown) => frames.push(markdown),
        })

        expect(frames.length).toBeGreaterThan(0)
        expect(latest).toContain('The wage is the price of labor.')
        expect(latest).not.toContain(NOTEBOOK_AI_WRITING_PLACEHOLDER)
        expect(replaceNotebookAIResponseMarkdown(base, 1, 'done', 1).markdown).toContain('done')
    })
})

test.describe('selection rewrite replaces only the highlighted range', () => {
    test('keeps the rest of the paragraph and the prompt node', async () => {
        const { replaceInlineRangeInMarkdown } = await import(
            '../src/notebook-app/lib/components/MarkdownNotebook/notebookAI'
        )
        const markdown = 'Hello world today.\n\n<Prompt question="fix this" selectedMarkdown="world" />'
        const next = replaceInlineRangeInMarkdown(markdown, 0, 6, 11, 'Earth')
        expect(next).toContain('Hello Earth today.')
        expect(next).toContain('<Prompt')
        expect(next).toContain('world')
    })
})

test.describe('inline editor stays off the chatbot', () => {
    test('selection rewrite does not dispatch the global chat event', () => {
        const src = readFileSync('src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx', 'utf8')
        expect(src).not.toContain('wimOpenGlobalChat')
        expect(src).toContain("source: 'selection'")
    })

    test('notebook app calls the isolated editor endpoint, not philosopher act', () => {
        const src = readFileSync('src/notebook-app/App.tsx', 'utf8')
        expect(src).toContain('/api/notebook/inline-edit')
        expect(src).not.toContain("taskType: 'community_reply'")
        expect(src).not.toContain("bot: defaultBot")
    })
})
