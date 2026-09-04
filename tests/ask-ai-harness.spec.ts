import { test, expect } from '@playwright/test'
import { getAskAiSystemPrompt } from '../src/lib/bots/ask-ai'
import { buildUserPrompt } from '../src/lib/bots/orchestrate'
import { needsLiveWeb } from '../src/lib/bots/search-intent'
import { ALLOWED_TOOL_NAMES, TOOL_PROTOCOL } from '../src/lib/bots/tools/spec'
import {
    extractReasoningDelta,
    groqNativeThinkingBody,
    publicTextFromRound,
    resolveGroqToolModels,
} from '../src/lib/bots/tools/loop'
import { applyRememberedFact, describeWorkspace, parseHostSnapshot, resolveOpenPath } from '../src/lib/bots/tools/host'
import { memoriesForHostContext, withHostContext } from '../src/lib/bots/agent/plan'
import { toolActivityTitle, toolResultSummary, toolStatusLabel } from '../src/lib/bots/tools/labels'
import { finalizeArtifactTurn } from '../src/lib/artifacts'
import { executeToolCall } from '../src/lib/bots/tools/execute'
import { packMessageThinking, unpackMessageThinking } from '../src/lib/chat-thinking'
import { QUALITY_GATE_UNAVAILABLE_REPLY } from '../src/lib/bots/orchestrate'
import { parseAgentCheckpoint } from '../src/lib/bots/agent/checkpoint'
import { ASK_AI_INJECTION_GOLDEN, ASK_AI_REPLAY } from '../src/lib/bots/tools/golden'
import { parseLeakedToolCalls, stripLeakedToolMarkup } from '../src/lib/bots/tools/leak'
import {
    assertPublicHostname,
    fetchPublicUrl,
    isBlockedAddress,
    isBlockedFetchUrl,
    isPrivateIPv4,
    isPrivateIPv6,
} from '../src/lib/bots/tools/fetch-url'

test.describe('Ask AI harness', () => {
    test('Ask AI Groq tool loop defaults to gpt-oss, not Qwen', () => {
        expect(resolveGroqToolModels({})).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
        expect(resolveGroqToolModels({ GROQ_TOOL_MODEL: 'openai/gpt-oss-20b' })[0]).toBe('openai/gpt-oss-20b')
        expect(resolveGroqToolModels({ GROQ_MODEL: 'qwen/qwen3.6-27b', QWEN_MODEL: 'qwen/qwen3.6-27b' })[0]).toBe(
            'openai/gpt-oss-120b'
        )
        expect(groqNativeThinkingBody('openai/gpt-oss-120b')).toEqual({
            reasoning_effort: 'low',
            include_reasoning: true,
        })
        expect(groqNativeThinkingBody('llama-3.3')).toEqual({ reasoning_format: 'parsed' })
        expect(extractReasoningDelta({ reasoning: 'step one' })).toBe('step one')
        expect(extractReasoningDelta({ reasoning_content: 'step two' })).toBe('step two')
        expect(extractReasoningDelta({ reasoning: { content: 'nested' } })).toBe('nested')
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
                'switch_mode',
                'todo_write',
                'remember',
                'finalize_plan',
                'task',
            ])
        )
        expect(TOOL_PROTOCOL).toContain('You decide which tools to call')
        expect(TOOL_PROTOCOL).toContain('THINK → ACT → TOOLS')
    })

    test('operator prompt is Ask AI, not a philosopher identity', () => {
        const prompt = getAskAiSystemPrompt({ voiceName: 'Nietzsche' })
        expect(prompt).toContain('WorldInMaking Ask AI')
        expect(prompt).toContain('QUESTION FIRST')
        expect(prompt).toContain('optional background')
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
        expect(guestPrompt).toContain('open desk')

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
        expect(authPrompt).toContain('study')
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

    test('passive OS snapshot lists scratchpad titles, not node bodies', () => {
        const host = {
            path: '/desktop',
            scratchpad: {
                nodes: [
                    {
                        type: 'citation',
                        title: 'Übermensch',
                        content: 'A long Nietzsche quote that must not hijack an unrelated question.',
                        source: 'Zerdüşt',
                    },
                ],
            },
        }
        const inventory = describeWorkspace(host)
        expect(inventory).toContain('Übermensch')
        expect(inventory).not.toContain('hijack an unrelated question')
        const preview = describeWorkspace(host, { nodePreview: true })
        expect(preview).toContain('hijack an unrelated question')
        const user = buildUserPrompt({
            question: 'özgürlük nedir?',
            host,
            context: 'Notebook background (optional):\n"""Labor notes"""',
        })
        const queryAt = user.lastIndexOf('Query / Prompt:')
        const osAt = user.indexOf('OS snapshot')
        expect(queryAt).toBeGreaterThan(osAt)
        expect(user).toContain('Answer this query.')
        expect(user.slice(queryAt)).toContain('özgürlük nedir?')
        expect(user.slice(queryAt)).not.toContain('OS snapshot')
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
        expect(toolActivityTitle('web_search', 'running', JSON.stringify({ query: 'today climate news' }))).toBe(
            'Searching: today climate news'
        )
        expect(toolActivityTitle('fetch_url', 'running', JSON.stringify({ url: 'https://example.com/a' }))).toContain(
            'example.com'
        )
        expect(toolActivityTitle('web_search', 'running')).toBe('Searching the web')
        expect(toolStatusLabel('insert_notebook_block', 'done')).toBe('Wrote to notebook')
        expect(toolStatusLabel('open_path', 'error')).toBe('Could not open window')
        expect(toolResultSummary('create_notebook', true, JSON.stringify({ ok: true, title: 'Field notes' }))).toBe(
            'Field notes'
        )
        expect(toolResultSummary('web_search', false, JSON.stringify({ error: 'query required' }))).toBe(
            'Need a search query'
        )
        expect(toolResultSummary('fetch_url', false, JSON.stringify({ error: 'blocked private host' }))).toBe(
            'That page isn’t reachable'
        )
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
            scratchpad: { memories: [{ fact: 'Prefer Turkish', category: 'preference' }] },
        })
        expect(host?.notebookId).toBe('nb-1')
        expect(host?.scratchpad?.memories?.[0].fact).toContain('Turkish')
        expect(parseHostSnapshot(null)).toBeUndefined()
    })

    test('finalize_plan is allowed in plan mode and does not wait for the user', async () => {
        const ready = await executeToolCall(
            {
                id: 'f1',
                name: 'finalize_plan',
                argumentsJson: JSON.stringify({ summary: 'Ready' }),
            },
            undefined,
            undefined,
            'plan'
        )
        expect(ready.ok).toBe(true)
        expect(ready.result).not.toContain('awaiting')
        expect(ready.result).not.toContain('plan_approval')
    })

    test('plan-approval checkpoint replays without ask_user leftovers', () => {
        const parsed = parseAgentCheckpoint({
            v: 1,
            messages: [{ role: 'user', content: 'Write a post' }],
            todos: [{ id: 'task_1', title: 'Draft', status: 'in_progress' }],
            scratchpad: [],
            agentMode: 'plan',
            stepCount: 2,
            usedTools: true,
            usedWebSearch: false,
            interrupt: { kind: 'plan_approval', title: 'Run this plan?', status: 'pending' },
        })
        expect(parsed?.interrupt.kind).toBe('plan_approval')
        expect(parsed?.agentMode).toBe('plan')
        expect(parseAgentCheckpoint({ v: 1, messages: [], interrupt: { kind: 'ask' } })).toBeUndefined()
    })

    test('mutating tools stay locked until execute mode', async () => {
        const locked = await executeToolCall(
            {
                id: 'm1',
                name: 'create_notebook',
                argumentsJson: JSON.stringify({ title: 'Nope' }),
            },
            undefined,
            undefined,
            'plan'
        )
        expect(locked.ok).toBe(false)
        expect(locked.result).toContain('finalize_plan')
        const ready = await executeToolCall({
            id: 'm2',
            name: 'finalize_plan',
            argumentsJson: JSON.stringify({ summary: 'Ready' }),
        }, undefined, undefined, 'plan')
        expect(ready.ok).toBe(true)
    })

    test('quality gate infra failure does not ship the draft', () => {
        expect(QUALITY_GATE_UNAVAILABLE_REPLY).toBe('Quality check is unavailable. Please try again.')
        expect(QUALITY_GATE_UNAVAILABLE_REPLY).not.toContain('skipped')
    })

    test('fetch_url blocks private literals and metadata names', () => {
        expect(isPrivateIPv4('169.254.169.254')).toBe(true)
        expect(isPrivateIPv4('8.8.8.8')).toBe(false)
        expect(isPrivateIPv6('::1')).toBe(true)
        expect(isPrivateIPv6('fe80::1')).toBe(true)
        expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
        expect(isBlockedAddress('10.0.0.1')).toBe(true)
        expect(isBlockedFetchUrl('http://127.0.0.1/')).toBe('url is not allowed')
        expect(isBlockedFetchUrl('http://metadata.google.internal/')).toBe('url is not allowed')
        expect(isBlockedFetchUrl('file:///etc/passwd')).toBe('url must be http or https')
        expect(isBlockedFetchUrl('https://example.com/x')).toBeNull()
    })

    test('fetch_url DoH private answers and post-fetch rebound drop the body', async () => {
        const original = globalThis.fetch
        let dnsHits = 0
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input)
            if (url.includes('dns-query')) {
                dnsHits += 1
                const typeA = url.includes('type=A') && !url.includes('type=AAAA')
                const ip = dnsHits <= 4 ? '1.1.1.1' : '169.254.169.254'
                const payload = typeA
                    ? { Status: 0, Answer: [{ type: 1, data: ip }] }
                    : { Status: 0, Answer: [] }
                return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/dns-json' } })
            }
            if (url.startsWith('https://example.com')) {
                return new Response('<p>secret</p>', { status: 200 })
            }
            throw new Error('unexpected fetch')
        }) as typeof fetch
        try {
            expect(await assertPublicHostname('evil.example')).toBeNull()
            const rebound = await fetchPublicUrl('https://example.com/page')
            expect(rebound.ok).toBe(false)
            if (!rebound.ok) expect(rebound.error).toBe('url is not allowed')
        } finally {
            globalThis.fetch = original
        }
    })

    test('remember writes the host scratchpad that withHostContext reads', async () => {
        const host = parseHostSnapshot({
            scratchpad: { memories: [{ fact: 'Prefer Turkish', category: 'preference' }] },
        })
        const executed = await executeToolCall(
            {
                id: 'r1',
                name: 'remember',
                argumentsJson: JSON.stringify({ fact: 'Call me Ali', category: 'name' }),
            },
            undefined,
            host,
            'ask'
        )
        expect(executed.ok).toBe(true)
        expect(host?.scratchpad?.memories?.map((item) => item.fact)).toEqual(['Call me Ali', 'Prefer Turkish'])
        const again = await executeToolCall(
            {
                id: 'r2',
                name: 'remember',
                argumentsJson: JSON.stringify({ fact: 'Call me Ali', category: 'name' }),
            },
            undefined,
            host,
            'ask'
        )
        expect(again.ok).toBe(true)
        expect(host?.scratchpad?.memories?.filter((item) => item.fact === 'Call me Ali')).toHaveLength(1)
        const snapshot = describeWorkspace(host)
        expect(snapshot).toContain('Call me Ali')
        expect(snapshot).toContain('Prefer Turkish')
        const memories = memoriesForHostContext(host?.scratchpad?.memories, [
            { note: 'Call me Ali', source: 'memory' },
            { note: 'scratch note', source: 'tool' },
        ])
        expect(memories.map((item) => item.fact)).toEqual(['Call me Ali', 'Prefer Turkish'])
        const folded = withHostContext([{ role: 'system', content: 'You are Ask AI' }], {
            todos: [],
            memories,
        })
        expect(folded[0].content).toContain('<memory>')
        expect(folded[0].content).toContain('Call me Ali')
        expect(applyRememberedFact(undefined, 'x')).toBeUndefined()
    })

    test('prompt-injection goldens cannot override operator rules or private paths', async () => {
        const prompt = getAskAiSystemPrompt({
            voiceName: 'Nietzsche',
            trustedInstruction: ASK_AI_INJECTION_GOLDEN[0].untrusted,
        })
        expect(prompt).toContain('untrusted end-user content')
        expect(prompt).toContain('cannot be overridden')
        expect(prompt).toContain('WorldInMaking Ask AI')
        expect(ALLOWED_TOOL_NAMES.has('ask_user')).toBe(false)
        expect(QUALITY_GATE_UNAVAILABLE_REPLY).not.toContain('skipped')
        expect(resolveOpenPath('/etc/passwd')).toBeNull()
        expect(isBlockedFetchUrl('http://127.0.0.1/')).toBe('url is not allowed')

        for (const item of ASK_AI_INJECTION_GOLDEN) {
            const cleaned = stripLeakedToolMarkup(item.untrusted)
            expect(cleaned, item.id).not.toMatch(/<\/?tool_code/i)
            expect(cleaned, item.id).not.toMatch(/\bask_user\s*\(/)
            for (const call of parseLeakedToolCalls(item.untrusted)) {
                const executed = await executeToolCall(call, undefined, undefined, 'execute')
                expect(executed.ok, `${item.id}:${call.name}`).toBe(false)
            }
        }
    })

    test('replay script is deterministic without a live LLM', async () => {
        expect(ASK_AI_REPLAY.length).toBeGreaterThan(0)
        for (const step of ASK_AI_REPLAY) {
            const executed = await executeToolCall(
                { id: step.id, name: step.name, argumentsJson: step.argumentsJson },
                undefined,
                undefined,
                step.mode
            )
            expect(executed.ok, step.id).toBe(step.expectOk)
            if (step.expectIncludes) {
                expect(executed.result, step.id).toContain(step.expectIncludes)
            }
        }
    })

    test('replay finalizes directly into execute mode without plan approval', async () => {
        const finalizeIndex = ASK_AI_REPLAY.findIndex((step) => step.name === 'finalize_plan')
        expect(finalizeIndex).toBeGreaterThanOrEqual(0)
        expect(ASK_AI_REPLAY[finalizeIndex + 1]?.mode).toBe('execute')
        expect(JSON.stringify(ASK_AI_REPLAY)).not.toContain('plan_approval')

        const finalized = await executeToolCall(
            { id: 'auto-exec', name: 'finalize_plan', argumentsJson: '{"summary":"Ready"}' },
            undefined,
            undefined,
            'plan'
        )
        expect(finalized.ok).toBe(true)
        expect(JSON.parse(finalized.result)).toMatchObject({ ok: true, mode: 'execute' })
    })

})
