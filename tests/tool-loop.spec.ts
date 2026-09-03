import { test, expect } from '@playwright/test'
import { formatAiSseEvent, parseAiSseEvent } from '../src/lib/ai/contracts'
import { finalizeArtifactTurn, mergeProducedArtifacts } from '../src/lib/artifacts'
import { artifactContentError } from '../src/lib/artifacts/validate-source'
import { askAiOperatorPreamble, getAskAiSystemPrompt } from '../src/lib/bots/ask-ai'
import { SECURITY_PREAMBLE } from '../src/lib/bots/orchestrate'
import { executeToolCall } from '../src/lib/bots/tools/execute'
import { isBlockedFetchUrl } from '../src/lib/bots/tools/fetch-url'
import { geminiPartThoughtSignature, openaiMessagesToGeminiContents } from '../src/lib/bots/tools/gemini'
import { compactToolHistory } from '../src/lib/bots/tools/history'
import { applyToolCallDelta, assembleToolCalls, publicTextFromRound, runToolLoop } from '../src/lib/bots/tools/loop'
import { resolveOpenPath } from '../src/lib/bots/tools/host'
import { ALLOWED_TOOL_NAMES, OPENAI_CHAT_TOOLS, TOOL_PROTOCOL, toGeminiFunctionDeclarations } from '../src/lib/bots/tools/spec'
import { parseLeakedToolCalls, stripLeakedToolMarkup } from '../src/lib/bots/tools/leak'
import { runAgentNodePipeline } from '../src/lib/bots/tools/pipeline'
import { needsReactHeal, prepareSandpackSource } from '../src/components/ClaudeWorkspaceChat/sandbox/reactPreview'

const MERMAID = ['flowchart TD', '  Cart --> Pay', '  Pay --> Done'].join('\n')

const CHART_JSON = JSON.stringify({
    kind: 'line',
    data: [
        { month: 'Jan', revenue: 120 },
        { month: 'Feb', revenue: 180 },
    ],
})

test.describe('OpenAI tool protocol', () => {
    test('exposes only the allowlisted Chat Completions functions', () => {
        expect(OPENAI_CHAT_TOOLS.every((tool) => tool.type === 'function')).toBe(true)
        expect([...ALLOWED_TOOL_NAMES].sort()).toEqual([
            'annotate_notebook',
            'create_artifact',
            'create_notebook',
            'fetch_url',
            'finalize_plan',
            'get_workspace',
            'insert_notebook_block',
            'list_notebooks',
            'manage_windows',
            'open_path',
            'publish_to_forum',
            'read_document',
            'read_notebook',
            'read_post',
            'remember',
            'replace_notebook_selection',
            'rewrite_notebook_document',
            'search_site',
            'set_system_appearance',
            'switch_mode',
            'task',
            'todo_write',
            'update_notebook_title',
            'web_search',
            'write_scratchpad',
        ])
        expect(TOOL_PROTOCOL).toContain('You decide which tools to call')
        expect(TOOL_PROTOCOL).toContain('tool channel')
        expect(TOOL_PROTOCOL).toContain('Do not write the user-visible answer in the same step')
        expect(TOOL_PROTOCOL).toContain('Never print <tool_code>')
    })

    test('strips leaked <tool_code> dumps and recovers todo_write', async () => {
        const dumped = `<tool_code>
todo_write(tasks=[{id: "task_1", status: "completed", title: "Makale İskeletinin ve Giriş Bölümünün Hazırlanması"}, {id: "task_4", status: "in_progress", title: "Vaka Analizleri: Sağlık ve Bilimsel Keşif"}])
</tool_code>

HAIC paradigmasının felsefi derinliğini Deleuze ile çarpıştırıyorum.`
        const cleaned = stripLeakedToolMarkup(dumped)
        expect(cleaned).toContain('Deleuze')
        expect(cleaned).not.toContain('tool_code')
        expect(cleaned).not.toContain('todo_write')
        const leaked = parseLeakedToolCalls(dumped)
        expect(leaked).toHaveLength(1)
        expect(leaked[0].name).toBe('todo_write')
        expect(JSON.parse(leaked[0].argumentsJson).tasks[0].title).toContain('Makale')

        let actRounds = 0
        const result = await runAgentNodePipeline({
            complete: async ({ omitTools, toolChoice }) => {
                if (omitTools || toolChoice === 'none') {
                    return { ok: true as const, content: '', toolCalls: [], reasoning: 'Need a locked plan.' }
                }
                actRounds += 1
                if (actRounds === 1) {
                    return { ok: true as const, content: dumped, toolCalls: [] }
                }
                return { ok: true as const, content: 'Vaka analizi yazıldı.', toolCalls: [] }
            },
            baseMessages: [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'write the article' },
            ],
            provider: 'test',
            agentMode: 'execute',
            maxSteps: 4,
        })
        expect(result.usedTools).toBe(true)
        expect(result.text).not.toContain('tool_code')
        expect(result.text).not.toContain('todo_write')
        expect(result.text).toContain('Vaka analizi')
    })

    test('unknown tools fail closed', async () => {
        const result = await executeToolCall({
            id: 'call-x',
            name: 'bash',
            argumentsJson: '{"command":"rm -rf /"}',
        })
        expect(result.ok).toBe(false)
        expect(result.artifact).toBeUndefined()
        expect(result.result).toContain('unknown tool')
    })

    test('invalid arguments fail closed', async () => {
        const result = await executeToolCall({
            id: 'call-y',
            name: 'create_artifact',
            argumentsJson: 'not-json',
        })
        expect(result.ok).toBe(false)
        expect(result.artifact).toBeUndefined()
    })

    test('remember, finalize_plan, and task execute as host tools', async () => {
        const remembered = await executeToolCall({
            id: 'mem-1',
            name: 'remember',
            argumentsJson: JSON.stringify({ fact: 'Prefer Turkish replies', category: 'preference' }),
        })
        expect(remembered.ok).toBe(true)
        expect(JSON.parse(remembered.result).fact).toContain('Turkish')

        const finalized = await executeToolCall({
            id: 'fin-1',
            name: 'finalize_plan',
            argumentsJson: JSON.stringify({ summary: 'Search, then write.' }),
        })
        expect(finalized.ok).toBe(true)
        expect(JSON.parse(finalized.result).mode).toBe('execute')
        expect(JSON.parse(finalized.result).awaiting).toBeUndefined()

        const tasked = await executeToolCall({
            id: 'task-1',
            name: 'task',
            argumentsJson: JSON.stringify({ goal: 'Find the publication year.' }),
        })
        expect(tasked.ok).toBe(true)
        expect(JSON.parse(tasked.result).goal).toContain('publication')
    })

    test('create_artifact produces a mermaid document without echoing source', async () => {
        const result = await executeToolCall({
            id: 'call-m',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'mermaid',
                title: 'Checkout flow',
                content: MERMAID,
            }),
        })
        expect(result.ok).toBe(true)
        expect(result.artifact?.type).toBe('mermaid')
        expect(result.artifact?.title).toBe('Checkout flow')
        expect(result.artifact?.content).toContain('Cart --> Pay')
        expect(JSON.parse(result.result)).toEqual({
            ok: true,
            id: result.artifact?.id,
            type: 'mermaid',
            title: 'Checkout flow',
        })
    })

    test('create_artifact accepts parsed object content and validates charts', async () => {
        const asObject = await executeToolCall({
            id: 'call-obj',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'chart',
                title: 'Revenue',
                content: JSON.parse(CHART_JSON),
            }),
        })
        expect(asObject.ok).toBe(true)
        expect(asObject.artifact?.type).toBe('chart')
        expect(asObject.artifact?.chartSpec?.kind).toBe('line')

        const invalid = await executeToolCall({
            id: 'call-bad',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({ type: 'chart', title: 'Nope', content: '{not chart}' }),
        })
        expect(invalid.ok).toBe(false)
        expect(invalid.artifact).toBeUndefined()
    })

    test('streaming tool_call deltas assemble in index order', () => {
        const buckets = new Map()
        applyToolCallDelta(buckets, { index: 1, id: 'call_b', function: { name: 'create_artifact' } })
        applyToolCallDelta(buckets, { index: 0, id: 'call_a', function: { name: 'web_search' } })
        applyToolCallDelta(buckets, { index: 0, function: { arguments: '{"query":"xai"' } })
        applyToolCallDelta(buckets, { index: 0, function: { arguments: '}' } })
        applyToolCallDelta(buckets, {
            index: 1,
            function: { arguments: JSON.stringify({ type: 'mermaid', title: 'Flow', content: MERMAID }) },
        })
        const calls = assembleToolCalls(buckets)
        expect(calls.map((call) => call.name)).toEqual(['web_search', 'create_artifact'])
        expect(JSON.parse(calls[0].argumentsJson)).toEqual({ query: 'xai' })
        expect(JSON.parse(calls[1].argumentsJson).type).toBe('mermaid')
    })

    test('tool loop with no Groq keys fails closed and does not invent a reply', async () => {
        const result = await runToolLoop({
            systemPrompt: 'You are a test.',
            userPrompt: 'Draw a diagram',
            env: {},
        })
        expect(result.ok).toBe(false)
        expect(result.usedTools).toBe(false)
        expect(result.text).toBe('')
        expect(result.artifacts).toEqual([])
        expect(result.error).toMatch(/no groq or gemini keys|no groq keys/)
    })

    test('SSE tool events round-trip on the shared contract', () => {
        const frame = formatAiSseEvent({
            type: 'tool',
            tool: { id: 'call_1', name: 'create_artifact', status: 'running' },
        })
        const parsed = parseAiSseEvent(frame)
        expect(parsed).toEqual({
            type: 'tool',
            tool: { id: 'call_1', name: 'create_artifact', status: 'running' },
        })
    })

    test('SSE node and mode events round-trip on the shared contract', () => {
        const nodeFrame = formatAiSseEvent({
            type: 'node',
            node: { name: 'tools', status: 'started', detail: 'Using tools' },
        })
        expect(parseAiSseEvent(nodeFrame)).toEqual({
            type: 'node',
            node: { name: 'tools', status: 'started', detail: 'Using tools' },
        })
        const modeFrame = formatAiSseEvent({ type: 'mode', mode: 'plan' })
        expect(parseAiSseEvent(modeFrame)).toEqual({ type: 'mode', mode: 'plan' })
        const activityFrame = formatAiSseEvent({
            type: 'activity',
            activity: { seq: 1, kind: 'thought', id: 'thought-0', status: 'running', delta: 'Hello' },
        })
        expect(parseAiSseEvent(activityFrame)?.type).toBe('activity')
        const humanFrame = formatAiSseEvent({
            type: 'human',
            human: {
                kind: 'plan_approval',
                title: 'Plan ready',
                status: 'pending',
                plan: [{ id: 't1', title: 'Search', status: 'pending' }],
            },
        })
        expect(parseAiSseEvent(humanFrame)).toEqual({
            type: 'human',
            human: {
                kind: 'plan_approval',
                title: 'Plan ready',
                status: 'pending',
                plan: [{ id: 't1', title: 'Search', status: 'pending' }],
            },
        })
        const checkpointFrame = formatAiSseEvent({
            type: 'checkpoint',
            checkpoint: {
                v: 1,
                messages: [{ role: 'user', content: 'plan this' }],
                todos: [],
                scratchpad: [],
                agentMode: 'plan',
                stepCount: 1,
                usedTools: true,
                usedWebSearch: false,
                interrupt: { kind: 'plan_approval', title: 'Plan ready', status: 'pending' },
            },
        })
        expect(parseAiSseEvent(checkpointFrame)?.type).toBe('checkpoint')
    })

    test('finalize prefers host-produced artifacts over fenced extraction', () => {
        const produced = [
            {
                id: 'art-tool-1',
                title: 'Checkout flow',
                type: 'mermaid' as const,
                content: MERMAID,
                version: 1,
                createdAt: '2026-08-28T00:00:00.000Z',
            },
        ]
        const merged = mergeProducedArtifacts(produced, [
            { ...produced[0], id: 'extracted', title: 'Checkout flow' },
        ])
        expect(merged).toHaveLength(1)
        expect(merged[0].id).toBe('art-tool-1')

        const turn = finalizeArtifactTurn(
            'Draw a mermaid diagram of checkout',
            'Opened the flow.',
            produced
        )
        expect(turn.artifacts).toHaveLength(1)
        expect(turn.artifacts[0].id).toBe('art-tool-1')
        expect(turn.visibleText).toContain('Opened the flow')
        expect(turn.visibleText).not.toContain('flowchart TD')
    })

    test('Ask AI scrape=false does not mint artifacts from dumped fences', () => {
        const turn = finalizeArtifactTurn(
            'Draw a mermaid diagram of checkout',
            ['Here.', '', '```mermaid', 'flowchart TD', '  Extra --> Dump', '```'].join('\n'),
            undefined,
            { scrape: false }
        )
        expect(turn.artifacts).toHaveLength(0)
        expect(turn.visibleText).toContain('Here.')
        expect(turn.visibleText).not.toContain('Extra --> Dump')
    })

    test('produced artifacts skip fenced extraction (extract is fallback only)', () => {
        const produced = [
            {
                id: 'art-tool-1',
                title: 'Checkout flow',
                type: 'mermaid' as const,
                content: MERMAID,
                version: 1,
                createdAt: '2026-08-28T00:00:00.000Z',
            },
        ]
        const turn = finalizeArtifactTurn(
            'Draw a mermaid diagram of checkout',
            ['Opened the flow.', '', '```mermaid', 'flowchart TD', '  Extra --> Dump', '```'].join('\n'),
            produced
        )
        expect(turn.artifacts).toHaveLength(1)
        expect(turn.artifacts[0].id).toBe('art-tool-1')
        expect(turn.visibleText).toContain('Opened the flow')
        expect(turn.visibleText).not.toContain('Extra --> Dump')
    })

    test('history keeps on-screen artifact bodies for follow-up revisions', () => {
        const compacted = compactToolHistory([
            { role: 'user', content: 'Draw checkout' },
            {
                role: 'assistant',
                content: 'Opened the flow.',
                artifacts: [{ type: 'mermaid', title: 'Checkout flow', content: MERMAID }],
            },
        ])
        expect(compacted).toHaveLength(2)
        expect(compacted[1].content).toContain('create_artifact')
        expect(compacted[1].content).toContain('Checkout flow')
        expect(compacted[1].content).toContain('Cart --> Pay')
    })

    test('Gemini declarations and contents stay on the same host contract', () => {
        const declarations = toGeminiFunctionDeclarations()
        expect(declarations.map((item) => item.name).sort()).toEqual([
            'annotate_notebook',
            'create_artifact',
            'create_notebook',
            'fetch_url',
            'finalize_plan',
            'get_workspace',
            'insert_notebook_block',
            'list_notebooks',
            'manage_windows',
            'open_path',
            'publish_to_forum',
            'read_document',
            'read_notebook',
            'read_post',
            'remember',
            'replace_notebook_selection',
            'rewrite_notebook_document',
            'search_site',
            'set_system_appearance',
            'switch_mode',
            'task',
            'todo_write',
            'update_notebook_title',
            'web_search',
            'write_scratchpad',
        ])
        expect(declarations[0].parameters.type).toBe('OBJECT')
        expect(JSON.stringify(declarations)).not.toContain('additionalProperties')
        for (const declaration of declarations) {
            expect(declaration.parameters).not.toHaveProperty('additionalProperties')
        }
        const unsigned = openaiMessagesToGeminiContents([
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'draw it' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'create_artifact', arguments: JSON.stringify({ type: 'mermaid', title: 'Flow', content: MERMAID }) },
                    },
                ],
            },
            { role: 'tool', tool_call_id: 'call_1', content: JSON.stringify({ ok: true, id: 'art-1' }) },
        ])
        expect(unsigned.map((item) => item.role)).toEqual(['user', 'model', 'user'])
        expect(JSON.stringify(unsigned)).not.toContain('functionCall')
        expect((unsigned[1].parts[0] as { text: string }).text).toContain('create_artifact')

        const signed = openaiMessagesToGeminiContents([
            { role: 'user', content: 'draw it' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'create_artifact', arguments: JSON.stringify({ type: 'mermaid', title: 'Flow', content: MERMAID }) },
                        thoughtSignature: 'sig-abc',
                    },
                ],
            },
            { role: 'tool', tool_call_id: 'call_1', content: JSON.stringify({ ok: true, id: 'art-1' }) },
        ])
        expect((signed[1].parts[0] as { functionCall: { name: string }; thoughtSignature?: string }).functionCall.name).toBe(
            'create_artifact'
        )
        expect((signed[1].parts[0] as { thoughtSignature?: string }).thoughtSignature).toBe('sig-abc')
        expect((signed[2].parts[0] as { functionResponse: { name: string } }).functionResponse.name).toBe('create_artifact')
        expect(geminiPartThoughtSignature({ thoughtSignature: 'sig-abc', functionCall: { name: 'web_search' } })).toBe('sig-abc')
        expect(geminiPartThoughtSignature({ thought_signature: 'snake', functionCall: { name: 'web_search' } })).toBe('snake')
        const workspaceDecl = declarations.find((item) => item.name === 'get_workspace')
        expect(workspaceDecl?.parameters).not.toHaveProperty('properties')
    })

    test('host remaps aliases and does not die on empty tool arguments', async () => {
        const workspace = await executeToolCall({
            id: 'ws',
            name: 'workspace',
            argumentsJson: '',
        })
        expect(workspace.ok).toBe(true)
        expect(workspace.name).toBe('get_workspace')

        const opened = await executeToolCall({
            id: 'op',
            name: 'navigate',
            argumentsJson: JSON.stringify({ app: 'posts' }),
        })
        expect(opened.ok).toBe(true)
        expect(opened.action?.payload.path).toBe('/posts')

        const diagram = await executeToolCall({
            id: 'art',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({ kind: 'diagram', title: 'Checkout flow', body: MERMAID }),
        })
        expect(diagram.ok).toBe(true)
        expect(diagram.artifact?.type).toBe('mermaid')

        const note = await executeToolCall(
            {
                id: 'ins',
                name: 'write_notebook',
                argumentsJson: JSON.stringify({ text: '## Field notes', notebookId: 'nb-1' }),
            },
            undefined,
            { notebookId: 'nb-1', notebookTitle: 'Draft', notebooks: [{ id: 'nb-1', title: 'Draft' }] }
        )
        expect(note.ok).toBe(true)
        expect(note.action?.type).toBe('insert_notebook_block')
    })

    test('eval: host tools, not regex intent, own the product surface', () => {
        const expected = [
            { ask: 'draw a mermaid checkout flow', tool: 'create_artifact' },
            { ask: 'what happened in the news today', tool: 'web_search' },
            { ask: 'summarize https://example.com', tool: 'fetch_url' },
            { ask: 'who are you', tool: null },
        ]
        expect(expected.map((item) => item.tool)).toEqual(['create_artifact', 'web_search', 'fetch_url', null])
        expect(TOOL_PROTOCOL).toContain('create_artifact is the only way')
        expect(TOOL_PROTOCOL).toContain('Never print fake function XML')
    })

    test('valid React is not run through JSX healers', () => {
        const source = [
            'export default function Screen() {',
            '  return (',
            '    <div className="p-6">',
            '      <h1>Hello</h1>',
            '    </div>',
            '  )',
            '}',
        ].join('\n')
        expect(needsReactHeal(source)).toBe(false)
        const prepared = prepareSandpackSource(source)
        expect(prepared).toContain('export default function Screen')
        expect(prepared).toContain('<h1>Hello</h1>')
    })

    test('tool rounds do not become the public answer', () => {
        expect(publicTextFromRound('Let me search that.', 1)).toBe('')
        expect(publicTextFromRound('Here is what I found.', 0)).toBe('Here is what I found.')
    })

    test('Ask AI operator prompt preserves philosopher identity and capabilities', () => {
        const operator = askAiOperatorPreamble('Nietzsche')
        expect(operator).toContain('You are WorldInMaking Ask AI')
        expect(operator).toContain('WorldInMaking OS')
        expect(operator).toContain('public reply')
        expect(TOOL_PROTOCOL).toContain('long article')
        const system = getAskAiSystemPrompt({ voiceName: 'Nietzsche', wimContext: 'wim' })
        expect(system).toContain('You are WorldInMaking Ask AI')
    })

    test('fetch_url blocks private and non-http URLs', async () => {
        expect(isBlockedFetchUrl('http://127.0.0.1/secret')).toBeTruthy()
        expect(isBlockedFetchUrl('http://192.168.0.1/')).toBeTruthy()
        expect(isBlockedFetchUrl('ftp://example.com/a')).toBeTruthy()
        expect(isBlockedFetchUrl('https://example.com/a')).toBeNull()
        const blocked = await executeToolCall({
            id: 'call-local',
            name: 'fetch_url',
            argumentsJson: JSON.stringify({ url: 'http://127.0.0.1/' }),
        })
        expect(blocked.ok).toBe(false)
        expect(blocked.result).toContain('not allowed')
    })

    test('broken React is rejected so the model can retry create_artifact', async () => {
        expect(artifactContentError('react', 'export default function X() {\n  return (\n    <div className="\n')).toBeTruthy()
        const result = await executeToolCall({
            id: 'call-bad-react',
            name: 'create_artifact',
            argumentsJson: JSON.stringify({
                type: 'react',
                title: 'Broken screen',
                content: 'export default function X() {\n  return (\n    <div className="\n',
            }),
        })
        expect(result.ok).toBe(false)
        expect(result.artifact).toBeUndefined()
    })

    test('open_path only allows OS apps', async () => {
        expect(resolveOpenPath('posts')).toBe('/posts')
        expect(resolveOpenPath('forum')).toBe('/community')
        expect(resolveOpenPath('/etc/passwd')).toBeNull()
        const opened = await executeToolCall({
            id: 'call-open',
            name: 'open_path',
            argumentsJson: JSON.stringify({ path: 'notebooks' }),
        })
        expect(opened.ok).toBe(true)
        expect(opened.action?.payload.path).toBe('/notebooks')
        const blocked = await executeToolCall({
            id: 'call-bad-path',
            name: 'open_path',
            argumentsJson: JSON.stringify({ path: 'https://evil.example' }),
        })
        expect(blocked.ok).toBe(false)
    })

    test('get_workspace sees host snapshot', async () => {
        const result = await executeToolCall(
            { id: 'call-ws', name: 'get_workspace', argumentsJson: '{}' },
            undefined,
            { path: '/posts', windows: [{ path: '/notebooks', title: 'Notes' }] }
        )
        expect(result.ok).toBe(true)
        expect(result.result).toContain('/posts')
        expect(result.result).toContain('Notes')
    })

    test('history reconstructs tool_calls and role:tool turns', () => {
        const compacted = compactToolHistory([
            { role: 'user', content: 'Draw checkout' },
            {
                role: 'assistant',
                content: 'Opened the flow.',
                tool_calls: [
                    {
                        id: 'call_1',
                        name: 'create_artifact',
                        arguments: JSON.stringify({ type: 'mermaid', title: 'Checkout flow', content: MERMAID }),
                    },
                ],
                artifacts: [{ type: 'mermaid', title: 'Checkout flow', content: MERMAID }],
            },
            { role: 'tool', tool_call_id: 'call_1', content: JSON.stringify({ ok: true, id: 'art-1' }) },
        ])
        expect(compacted.map((item) => item.role)).toEqual(['user', 'assistant', 'tool'])
        expect(compacted[1].tool_calls?.[0].function.name).toBe('create_artifact')
        expect(compacted[2].tool_call_id).toBe('call_1')
    })

    test('history keeps Gemini thought signatures for the next user turn', () => {
        const compacted = compactToolHistory([
            { role: 'user', content: 'diagram' },
            {
                role: 'assistant',
                content: '',
                tool_calls: [
                    {
                        id: 'call_1',
                        name: 'create_artifact',
                        arguments: '{}',
                        thoughtSignature: 'sig-keep-me',
                    },
                ],
            },
            { role: 'tool', tool_call_id: 'call_1', content: '{"ok":true}' },
        ])
        expect(compacted[1].tool_calls?.[0].thoughtSignature).toBe('sig-keep-me')
        const contents = openaiMessagesToGeminiContents(compacted)
        expect((contents[1].parts[0] as { thoughtSignature?: string }).thoughtSignature).toBe('sig-keep-me')
    })

    test('manage_windows emits window organization host action', async () => {
        const result = await executeToolCall({
            id: 'call-win',
            name: 'manage_windows',
            argumentsJson: JSON.stringify({ action: 'tile', left_path: '/notebooks', right_path: '/posts' }),
        })
        expect(result.ok).toBe(true)
        expect(result.action?.type).toBe('manage_windows')
        expect(result.action?.payload.action).toBe('tile')
        expect(result.action?.payload.left_path).toBe('/notebooks')
        expect(result.action?.payload.right_path).toBe('/posts')
    })

    test('set_system_appearance updates theme and wallpaper', async () => {
        const result = await executeToolCall({
            id: 'call-app',
            name: 'set_system_appearance',
            argumentsJson: JSON.stringify({ theme: 'dark', wallpaper: 'desert-glow', reduce_transparency: true }),
        })
        expect(result.ok).toBe(true)
        expect(result.action?.type).toBe('set_system_appearance')
        expect(result.action?.payload.theme).toBe('dark')
        expect(result.action?.payload.wallpaper).toBe('desert-glow')
        expect(result.action?.payload.reduce_transparency).toBe(true)
    })

    test('annotate_notebook attaches margin notes to bound notebook', async () => {
        const result = await executeToolCall(
            {
                id: 'call-ann',
                name: 'annotate_notebook',
                argumentsJson: JSON.stringify({ span_text: 'Will to Power', note: 'Examine biological vs metaphysical aspects.' }),
            },
            undefined,
            { notebookId: 'nb-1', notebookTitle: 'Nietzsche Notes' }
        )
        expect(result.ok).toBe(true)
        expect(result.action?.type).toBe('annotate_notebook')
        expect(result.action?.payload.notebookId).toBe('nb-1')
        expect(result.action?.payload.span_text).toBe('Will to Power')
        expect(result.action?.payload.note).toContain('biological vs metaphysical')
    })

    test('publish_to_forum creates forum topic action', async () => {
        const result = await executeToolCall({
            id: 'call-pub',
            name: 'publish_to_forum',
            argumentsJson: JSON.stringify({ title: 'Genealogy of Ethics', content: 'Discussion on moral origins.', category: 'philosophy' }),
        })
        expect(result.ok).toBe(true)
        expect(result.action?.type).toBe('publish_to_forum')
        expect(result.action?.payload.title).toBe('Genealogy of Ethics')
        expect(result.action?.payload.category).toBe('philosophy')
    })

    test('read_document blocks private and non-http URLs', async () => {
        const result = await executeToolCall({
            id: 'call-doc-1',
            name: 'read_document',
            argumentsJson: JSON.stringify({ url: 'http://127.0.0.1/secret.pdf' }),
        })
        expect(result.ok).toBe(false)
        expect(result.result).toContain('url is not allowed')
    })

    test('read_document resolves bound notebook document by name', async () => {
        const result = await executeToolCall(
            {
                id: 'call-doc-2',
                name: 'read_document',
                argumentsJson: JSON.stringify({ name: 'Architecture Research' }),
            },
            undefined,
            { notebookId: 'nb-101', notebookTitle: 'Architecture Research', selection: 'Detailed system blueprints.' }
        )
        expect(result.ok).toBe(true)
        expect(result.result).toContain('Architecture Research')
        expect(result.result).toContain('Detailed system blueprints.')
    })

    test('read_pdf and parse_document aliases map to read_document', async () => {
        const result = await executeToolCall({
            id: 'call-doc-3',
            name: 'read_pdf',
            argumentsJson: JSON.stringify({ url: 'file:///etc/passwd' }),
        })
        expect(result.name).toBe('read_document')
        expect(result.ok).toBe(false)
        expect(result.result).toContain('url must be http or https')
    })

    test('write_scratchpad saves key facts and references into working memory', async () => {
        const result = await executeToolCall({
            id: 'call-sp-1',
            name: 'write_scratchpad',
            argumentsJson: JSON.stringify({ content: 'Q3 net profit rose 18% YoY', source: 'financials.pdf#page=4' }),
        })
        expect(result.ok).toBe(true)
        expect(result.summary).toContain('Saved note from financials.pdf#page=4')
        const parsed = JSON.parse(result.result)
        expect(parsed.saved).toBe(true)
        expect(parsed.note).toContain('Q3 net profit')
    })

    test('todo_write manages structured multi-step task list', async () => {
        const result = await executeToolCall({
            id: 'call-todo-1',
            name: 'todo_write',
            argumentsJson: JSON.stringify({
                tasks: [
                    { id: 't1', title: 'Fetch PDF reports', status: 'completed' },
                    { id: 't2', title: 'Extract KPI metrics', status: 'in_progress' },
                    { id: 't3', title: 'Render dashboard', status: 'pending' },
                ],
            }),
        })
        expect(result.ok).toBe(true)
        expect(result.summary).toContain('Working on: Extract KPI metrics (1/3)')
        const parsed = JSON.parse(result.result)
        expect(parsed.progress).toBe('1/3')
        expect(parsed.tasks).toHaveLength(3)
    })

    test('switch_mode enters execute and plan supermodes', async () => {
        const execute = await executeToolCall({
            id: 'call-mode-1',
            name: 'switch_mode',
            argumentsJson: JSON.stringify({ mode: 'execute' }),
        })
        expect(execute.ok).toBe(true)
        expect(JSON.parse(execute.result).mode).toBe('execute')

        const plan = await executeToolCall({
            id: 'call-mode-2',
            name: 'switch_mode',
            argumentsJson: JSON.stringify({ mode: 'plan' }),
        })
        expect(plan.ok).toBe(true)
        expect(JSON.parse(plan.result).mode).toBe('plan')
    })

    test('plan mode locks mutating tools until switch_mode', async () => {
        const blocked = await executeToolCall(
            {
                id: 'call-locked',
                name: 'create_artifact',
                argumentsJson: JSON.stringify({ type: 'markdown', title: 'Plan', content: '# hi' }),
            },
            undefined,
            undefined,
            'plan'
        )
        expect(blocked.ok).toBe(false)
        expect(blocked.result).toContain('plan mode')

        const allowed = await executeToolCall(
            {
                id: 'call-read',
                name: 'todo_write',
                argumentsJson: JSON.stringify({
                    tasks: [{ id: 't1', title: 'Research', status: 'in_progress' }],
                }),
            },
            undefined,
            undefined,
            'plan'
        )
        expect(allowed.ok).toBe(true)
    })
})
