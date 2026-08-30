import { test, expect } from '@playwright/test'
import { getAskAiSystemPrompt } from '../src/lib/bots/ask-ai'
import { needsLiveWeb } from '../src/lib/bots/search-intent'
import { ALLOWED_TOOL_NAMES, TOOL_PROTOCOL } from '../src/lib/bots/tools/spec'
import { publicTextFromRound, resolveGroqToolModels } from '../src/lib/bots/tools/loop'
import { describeWorkspace, parseHostSnapshot, resolveOpenPath } from '../src/lib/bots/tools/host'
import { toolResultSummary, toolStatusLabel } from '../src/lib/bots/tools/labels'
import { finalizeArtifactTurn } from '../src/lib/artifacts'
import { executeToolCall } from '../src/lib/bots/tools/execute'
import { packMessageThinking, unpackMessageThinking } from '../src/lib/chat-thinking'

test.describe('Ask AI harness', () => {
    test('Ask AI Groq tool loop defaults to gpt-oss, not Qwen', () => {
        expect(resolveGroqToolModels({})).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
        expect(resolveGroqToolModels({ GROQ_TOOL_MODEL: 'openai/gpt-oss-20b' })[0]).toBe('openai/gpt-oss-20b')
        expect(resolveGroqToolModels({ GROQ_MODEL: 'qwen/qwen3.6-27b', QWEN_MODEL: 'qwen/qwen3.6-27b' })[0]).toBe(
            'openai/gpt-oss-120b'
        )
    })

    test('tool catalog is the capability surface', () => {
        expect([...ALLOWED_TOOL_NAMES]).toEqual(
            expect.arrayContaining([
                'create_artifact',
                'web_search',
                'fetch_url',
                'get_workspace',
                'search_site',
                'open_path',
                'read_post',
                'list_notebooks',
                'create_notebook',
                'insert_notebook_block',
            ])
        )
        expect(TOOL_PROTOCOL).toContain('You decide which tools to call')
    })

    test('operator prompt is Ask AI, not a philosopher identity', () => {
        const prompt = getAskAiSystemPrompt({ voiceName: 'Nietzsche' })
        expect(prompt).toContain('WorldInMaking Ask AI')
        expect(prompt).not.toContain('You ARE the assigned philosopher')
        expect(prompt).not.toContain('living, self-aware contemporary mind')
    })

    test('tool rounds are silent; public text is the no-tool completion', () => {
        expect(publicTextFromRound('Let me search.', 1)).toBe('')
        expect(publicTextFromRound('Here is the sourced answer.', 0)).toContain('sourced')
    })

    test('live-web questions are detected without being a tool router', () => {
        expect(needsLiveWeb('Bugün yapay zeka haberlerinde öne çıkan 3 gelişme')).toBe(true)
        expect(needsLiveWeb('Sen kimsin?')).toBe(false)
    })

    test('operator prompt includes user identity when logged in', () => {
        const guestPrompt = getAskAiSystemPrompt({ voiceName: 'Nietzsche' })
        expect(guestPrompt).toContain('Guest / Anonymous')
        expect(guestPrompt).toContain('Explorer (Free) tier')

        const authPrompt = getAskAiSystemPrompt({
            voiceName: 'Nietzsche',
            hostUser: {
                name: 'Mustafa Ali',
                username: 'mali',
                bio: 'Architect of WIM',
                location: 'Istanbul',
                role: 'pro',
            },
        })
        expect(authPrompt).toContain('Mustafa Ali')
        expect(authPrompt).toContain('@mali')
        expect(authPrompt).toContain('Architect of WIM')
        expect(authPrompt).toContain('Address them warmly, respectfully, and naturally by their name ("Mustafa Ali")')
        expect(authPrompt).toContain('Pro Thinker')
    })

    test('open_path and workspace observation are host facts', () => {
        expect(resolveOpenPath('posts')).toBe('/posts')
        expect(resolveOpenPath('/etc/passwd')).toBeNull()
        const snapshot = describeWorkspace({
            path: '/home',
            user: { name: 'Mustafa Ali', username: 'mali', bio: 'Philosophy explorer' },
            windows: [{ path: '/posts', title: 'Posts' }],
            notebooks: [{ id: 'n1', title: 'Draft' }],
        })
        expect(snapshot).toContain('Logged-in User: Mustafa Ali')
        expect(snapshot).toContain('@mali')
        expect(snapshot).toContain('/home')
        expect(snapshot).toContain('Posts')
        expect(snapshot).toContain('Draft')
    })

    test('Ask AI does not mint artifacts from dumped fences', () => {
        const turn = finalizeArtifactTurn(
            'Draw a mermaid diagram',
            '```mermaid\nflowchart TD\n A-->B\n```',
            undefined,
            { scrape: false }
        )
        expect(turn.artifacts).toHaveLength(0)
    })

    test('create_notebook and open_path emit OS actions', async () => {
        const notebook = await executeToolCall({
            id: 'c1',
            name: 'create_notebook',
            argumentsJson: JSON.stringify({ title: 'Field notes', content: '# Hi' }),
        })
        expect(notebook.ok).toBe(true)
        expect(notebook.action?.type).toBe('create_notebook')
        expect(notebook.action?.payload.title).toBe('Field notes')

        const opened = await executeToolCall({
            id: 'c2',
            name: 'open_path',
            argumentsJson: JSON.stringify({ path: 'community' }),
        })
        expect(opened.action?.payload.path).toBe('/community')
    })

    test('insert_notebook_block writes the bound notebook and refuses an empty workspace', async () => {
        const missing = await executeToolCall({
            id: 'i0',
            name: 'insert_notebook_block',
            argumentsJson: JSON.stringify({ content: '# Notes' }),
        })
        expect(missing.ok).toBe(false)

        const inserted = await executeToolCall(
            {
                id: 'i1',
                name: 'insert_notebook_block',
                argumentsJson: JSON.stringify({ content: '## Field notes\n- one' }),
            },
            undefined,
            { notebookId: 'nb-1', notebookTitle: 'Draft', notebooks: [{ id: 'nb-1', title: 'Draft' }] }
        )
        expect(inserted.ok).toBe(true)
        expect(inserted.action?.type).toBe('insert_notebook_block')
        expect(inserted.action?.payload.notebookId).toBe('nb-1')
        expect(inserted.action?.payload.content).toContain('Field notes')
    })

    test('tool workbench labels are status verbs, not Thought', () => {
        expect(toolStatusLabel('web_search', 'running')).toBe('Searching the web')
        expect(toolStatusLabel('insert_notebook_block', 'done')).toBe('Wrote to notebook')
        expect(toolStatusLabel('open_path', 'error')).toBe('Could not open window')
        expect(toolResultSummary('create_notebook', true, JSON.stringify({ ok: true, title: 'Field notes' }))).toBe(
            'Field notes'
        )
        expect(toolResultSummary('web_search', false, JSON.stringify({ error: 'query required' }))).toBe('query required')
    })

    test('chat-store packs toolTrace inside thinking_process json', () => {
        const packed = packMessageThinking({
            thinkingProcess: { durationSeconds: 2, tokenCount: 0, steps: [] },
            toolTrace: [
                { id: 't1', name: 'web_search', status: 'done', result: 'hits', detail: '3 results' },
            ],
        })
        expect(packed?.toolTrace?.[0].name).toBe('web_search')
        const unpacked = unpackMessageThinking(packed)
        expect(unpacked.toolTrace?.[0].id).toBe('t1')
        expect(unpacked.thinkingProcess?.durationSeconds).toBe(2)
        expect((unpacked.thinkingProcess as { toolTrace?: unknown } | undefined)?.toolTrace).toBeUndefined()
    })

    test('chat-store keeps thought signatures intact', () => {
        const packed = packMessageThinking({
            toolTrace: [{ id: 't1', name: 'web_search', status: 'done', thoughtSignature: 'sig-exact' }],
        })
        expect(packed?.toolTrace?.[0].thoughtSignature).toBe('sig-exact')
        expect(unpackMessageThinking(packed).toolTrace?.[0].thoughtSignature).toBe('sig-exact')
    })

    test('workspace snapshot parse is shared by chat and co-author', () => {
        const host = parseHostSnapshot({
            path: '/notebooks',
            notebookId: 'nb-1',
            notebookTitle: 'Draft',
            notebooks: [{ id: 'nb-1', title: 'Draft' }],
        })
        expect(host?.notebookId).toBe('nb-1')
        expect(parseHostSnapshot(null)).toBeUndefined()
    })
})
