import { test, expect } from '@playwright/test'
import {
    mergeNotebookLists,
    planOpenNotebookRemoteApply,
    shouldAdoptRemoteNotebook,
} from '../src/notebook-app/scenes/notebooks/notebookRemote'
import {
    appendDiscussionReply,
    parseDiscussionReplies,
    removeDiscussionReply,
    upsertDiscussionReply,
} from '../src/notebook-app/lib/components/MarkdownNotebook/discussionComments'
import {
    buildInviteCommentSystemPrompt,
    cleanInviteCommentOutput,
    isNotebookInviteBotId,
    parseInviteNotePayload,
    resolveInviteBot,
} from '../src/lib/bots/notebook-invite'
import { caretColorForClient, presenceStateToCarets } from '../src/notebook-app/scenes/notebooks/notebookPresence'
import {
    makeDefaultDatabaseContent,
    openNotebookHash,
    parseCalloutTone,
    parseDatabaseContent,
} from '../src/notebook-app/lib/components/MarkdownNotebook/writingBlockModel'
import { formatNoteTime, parseInlineNotes } from '../src/notebook-app/lib/components/MarkdownNotebook/inlineNotes'
import {
    mergeAnnotationMaps,
    upsertAnnotation,
} from '../src/notebook-app/lib/components/MarkdownNotebook/annotations'
import { parseMarkdownNotebook, serializeMarkdownNotebook } from '../src/notebook-app/lib/components/MarkdownNotebook/markdown'
import { applyPhilosopherInviteNotes } from '../src/notebook-app/lib/components/MarkdownNotebook/inviteApply'
import { planOpenAIPromptInsert } from '../src/notebook-app/lib/components/MarkdownNotebook/planAIPromptInsert'
import {
    applyRefOnNotebookSpan,
    collectExistingRefSpans,
    deleteNotebookAnnotation,
    getRefQuote,
    notebookReadableText,
    resolveAutonomousPlacement,
    wordSpanAt,
} from '../src/notebook-app/lib/components/MarkdownNotebook/annotationPlacement'
import { getNodeFingerprint } from '../src/notebook-app/lib/components/MarkdownNotebook/utils'
import { mergeNotebookMarkdownChanges } from '../src/notebook-app/lib/components/MarkdownNotebook/collaboration'
import { isNotebookImageFile, notebookImageExtension } from '../src/lib/notebook-upload-shared'
import type { StoredNotebook } from '../src/notebook-app/scenes/notebooks/notebookStorage'
import {
    notebookMatchesQuery,
    notebookPreviewExcerpt,
} from '../src/notebook-app/scenes/notebooks/notebookPreview'
import {
    collectSlashSplitNodes,
    getInsertMenuFilterQuery,
    getSlashCommandQuery,
    getSlashTokenAt,
    mergeDetachedSlashMenuBack,
    slashMenuRestoreText,
    splitTextBlockAtSlashToken,
} from '../src/notebook-app/lib/components/MarkdownNotebook/documentModel'
import { splitInlineNodesAt } from '../src/notebook-app/lib/components/MarkdownNotebook/inlineContent'
import { getInlineText } from '../src/notebook-app/lib/components/MarkdownNotebook/utils'
import type { NotebookTextBlockNode } from '../src/notebook-app/lib/components/MarkdownNotebook/types'

test.describe('notebook frontend helpers', () => {
    test('list timeAgo uses hours between 1h and 24h', () => {
        const seconds = Math.floor((2 * 60 * 60 * 1000) / 1000)
        expect(seconds < 86400).toBe(true)
        expect(Math.floor(seconds / 3600)).toBe(2)
        expect(Math.floor(seconds / 86400)).toBe(0)
    })

    test('publish is explicit — false does not stay live', () => {
        const isPublished = (flag: boolean | undefined) => flag === true
        expect(isPublished(undefined)).toBe(false)
        expect(isPublished(false)).toBe(false)
        expect(isPublished(true)).toBe(true)
    })

    test('preview excerpt strips markdown noise and truncates', () => {
        expect(notebookPreviewExcerpt('')).toBe('')
        expect(notebookPreviewExcerpt('# Hello\n\nThis is **bold** and a [link](https://wim.dev).')).toBe(
            'Hello This is bold and a link.'
        )
        expect(notebookPreviewExcerpt('```js\nconst x = 1\n```\nVisible')).toBe('Visible')
        expect(notebookPreviewExcerpt('a'.repeat(120)).endsWith('…')).toBe(true)
        expect(notebookPreviewExcerpt('a'.repeat(120)).length).toBe(92)
    })

    test('slash token is found anywhere except URLs', () => {
        expect(getSlashCommandQuery('/table')).toBe('table')
        expect(getSlashCommandQuery('hello /table')).toBe(null)
        expect(getSlashTokenAt('/table', 6)).toEqual({ start: 0, query: 'table' })
        expect(getSlashTokenAt('hello /tab', 10)).toEqual({ start: 6, query: 'tab' })
        expect(getSlashTokenAt('hello /tab world', 10)).toEqual({ start: 6, query: 'tab' })
        expect(getSlashTokenAt('hello /tab world', 16)).toBe(null)
        expect(getSlashTokenAt('see https://wim.dev', 19)).toBe(null)
        expect(getSlashTokenAt('path/to', 7)).toBe(null)
        expect(getSlashTokenAt('hello/', 6)).toBe(null)
        expect(getSlashTokenAt('hello /', 7)).toEqual({ start: 6, query: '' })
        expect(getInsertMenuFilterQuery('/table')).toBe('table')
        expect(getInsertMenuFilterQuery('table')).toBe('table')
        expect(slashMenuRestoreText('tab')).toBe('/tab')
        expect(slashMenuRestoreText('')).toBe('/')
        const slashLine = getSlashTokenAt('hello /wim', 10)
        expect(slashLine).toEqual({ start: 6, query: 'wim' })
        const remainder = splitInlineNodesAt([{ type: 'text', text: 'hello /wim' }], slashLine!.start)[0]
        expect(getInlineText(remainder).trim()).toBe('hello')
    })

    test('slash token splits a paragraph and restores /query on cancel', () => {
        const node: NotebookTextBlockNode = {
            id: 'p1',
            type: 'paragraph',
            children: [{ type: 'text', text: 'hello /tab more' }],
        }
        const token = getSlashTokenAt('hello /tab more', 10)
        expect(token).toEqual({ start: 6, query: 'tab' })
        const parts = splitTextBlockAtSlashToken(node, node.children, token!)
        expect(getInlineText(parts.before?.children ?? [])).toBe('hello ')
        expect(getInlineText(parts.command.children)).toBe('tab')
        expect(getInlineText(parts.after?.children ?? [])).toBe(' more')

        const splitNodes = collectSlashSplitNodes(parts)
        const restored = mergeDetachedSlashMenuBack(splitNodes, parts.command.id, 'tab')
        expect(restored).not.toBeNull()
        expect(restored?.nodes).toHaveLength(1)
        expect(getInlineText((restored?.nodes[0] as NotebookTextBlockNode).children)).toBe('hello /tab more')
        expect(restored?.focus.offset).toBe('hello /tab'.length)
    })

    test('list search matches title or body', () => {
        const notebook = { title: 'Market notes', content: '# Draft\n\nLook at **ARR** next week.' }
        expect(notebookMatchesQuery(notebook, '')).toBe(true)
        expect(notebookMatchesQuery(notebook, 'market')).toBe(true)
        expect(notebookMatchesQuery(notebook, 'arr')).toBe(true)
        expect(notebookMatchesQuery(notebook, 'missing')).toBe(false)
    })

    test('remote notebooks win only when they are newer', () => {
        const local: StoredNotebook = {
            id: 'n1',
            short_id: 'n1',
            title: 'Local',
            content: 'local',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-08-16T12:00:00.000Z',
            version: 2,
        }
        const olderRemote: StoredNotebook = {
            ...local,
            title: 'Remote older',
            content: 'remote',
            updatedAt: '2026-08-16T11:00:00.000Z',
            version: 1,
        }
        const newerRemote: StoredNotebook = {
            ...local,
            title: 'Remote newer',
            content: 'remote-new',
            updatedAt: '2026-08-16T13:00:00.000Z',
            version: 3,
        }

        expect(mergeNotebookLists([local], [olderRemote])[0].title).toBe('Local')
        expect(mergeNotebookLists([local], [newerRemote])[0].title).toBe('Remote newer')
    })

    test('higher version wins even if its timestamp is older', () => {
        const local: StoredNotebook = {
            id: 'n1',
            short_id: 'n1',
            title: 'Stale local save',
            content: 'local',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-08-18T15:00:00.000Z',
            version: 2,
        }
        const remote: StoredNotebook = {
            ...local,
            title: 'Other device',
            content: 'remote',
            updatedAt: '2026-08-18T14:00:00.000Z',
            version: 4,
        }
        expect(mergeNotebookLists([local], [remote])[0].title).toBe('Other device')
    })

    test('open editor keeps local typing when a newer remote copy arrives', () => {
        const current = {
            title: 'Local',
            content: 'saved',
            updatedAt: '2026-08-18T12:00:00.000Z',
            version: 2,
        }
        const latest = {
            title: 'Remote newer',
            content: 'from other device',
            updatedAt: '2026-08-18T12:01:00.000Z',
            version: 3,
        }
        const dirty = planOpenNotebookRemoteApply({
            current,
            latest,
            draftContent: 'saved plus local typing',
            draftTitle: 'Local',
        })
        expect(shouldAdoptRemoteNotebook(current, latest)).toBe(true)
        expect(dirty).toEqual({ adopt: true, applyContent: false, applyTitle: true })

        const clean = planOpenNotebookRemoteApply({
            current,
            latest,
            draftContent: 'saved',
            draftTitle: 'Local',
        })
        expect(clean).toEqual({ adopt: true, applyContent: true, applyTitle: true })
    })

    test('discussion replies parse, append, and delete by id', () => {
        const replies = parseDiscussionReplies([
            { id: 'r1', text: 'first', author: 'Ada', createdAt: '2026-08-18T12:00:00.000Z' },
            { id: '', text: 'drop me' },
            { text: 'also drop' },
        ])
        expect(replies).toHaveLength(1)
        const next = appendDiscussionReply(replies, {
            id: 'r2',
            text: 'second',
            author: 'You',
            createdAt: '2026-08-18T12:01:00.000Z',
        })
        expect(next.map((reply) => reply.id)).toEqual(['r1', 'r2'])
        expect(removeDiscussionReply(next, 'r1').map((reply) => reply.id)).toEqual(['r2'])
        const withBot = upsertDiscussionReply(next, {
            id: 'r2',
            text: 'updated',
            author: 'Karl Marx',
            createdAt: '2026-08-18T12:02:00.000Z',
            botId: 'marx',
        })
        expect(withBot[1]).toMatchObject({ id: 'r2', text: 'updated', botId: 'marx' })
    })

    test('invite resolves known philosophers and rejects unknown names', () => {
        expect(isNotebookInviteBotId('nietzsche')).toBe(true)
        expect(isNotebookInviteBotId('hegel')).toBe(false)
        expect(resolveInviteBot('arendt')?.name).toBe('Arendt')
        expect(resolveInviteBot('hegel')?.name).toBe('Hegel')
        expect(resolveInviteBot('nobody')).toBeNull()
        expect(cleanInviteCommentOutput('```\nA short comment.\n```')).toBe('A short comment.')
        expect(buildInviteCommentSystemPrompt('marx')).toMatch(/same language as the notebook body/)
        expect(buildInviteCommentSystemPrompt('marx')).toMatch(/critique/)
        expect(parseInviteNotePayload('{"phrase":"erdem bir his değildir","intent":"edit","text":"Daha sıkı yaz.","suggestion":"Erdem bir his değil."}')).toMatchObject({
            intent: 'edit',
            scope: 'span',
            suggestion: 'Erdem bir his değil.',
        })
        expect(
            parseInviteNotePayload('{"scope":"piece","phrase":"","intent":"aside","text":"Çerçeve eylemin kendisi."}')
        ).toMatchObject({ scope: 'piece', phrase: '', text: 'Çerçeve eylemin kendisi.' })
        expect(
            parseInviteNotePayload(
                '{"scope":"block","phrase":"Virtue is not a feeling","intent":"remark","text":"Bu paragraf durmuyor."}'
            )
        ).toMatchObject({ scope: 'block', phrase: 'Virtue is not a feeling' })
        expect(
            parseInviteNotePayload(
                '<thinking><case>phase text</case></thinking>\n{"phrase":"erdem bir his","intent":"critique","text":"Bu iddia durmuyor."}'
            )
        ).toMatchObject({ intent: 'critique', text: 'Bu iddia durmuyor.' })
        expect(parseInviteNotePayload('Phase 1: dump\n{"phrase":"x"}').text).toBe('')
        expect(
            parseInlineNotes([
                { by: 'you', name: 'Ada', text: 'note', avatar: '/a.png', kind: 'human' },
            ])
        ).toEqual([
            {
                by: 'you',
                name: 'Ada',
                text: 'note',
                avatar: '/a.png',
                kind: 'human',
                pending: false,
                createdAt: undefined,
                intent: undefined,
                suggestion: undefined,
            },
        ])
    })

    test('inline notes live on the annotation layer, not inside markdown refs', () => {
        const legacy = '# Title\n\n<ref id="abc" notes=\'[{"by":"nietzsche","name":"Nietzsche","text":"Yes.","kind":"bot"}]\'>Life</ref>'
        const parsed = parseMarkdownNotebook(legacy)
        const paragraph = parsed.nodes.find((node) => node.type === 'paragraph')
        expect(paragraph && paragraph.type === 'paragraph').toBe(true)
        if (!paragraph || paragraph.type !== 'paragraph') return
        const mark = paragraph.children[0] && paragraph.children[0].type === 'text' ? paragraph.children[0].marks?.[0] : null
        expect(mark).toMatchObject({ type: 'ref', id: 'abc' })
        expect(mark && 'notes' in mark ? mark.notes : undefined).toBeUndefined()
        expect(parsed.annotations?.abc.notes[0]).toMatchObject({ by: 'nietzsche', text: 'Yes.' })

        const saved = serializeMarkdownNotebook(parsed)
        expect(saved).toContain('<ref id="abc">Life</ref>')
        expect(saved).not.toContain('notes=')
        expect(saved).toContain('<!--wim-annotations:')

        const roundTrip = parseMarkdownNotebook(saved)
        expect(roundTrip.annotations?.abc.notes[0].text).toBe('Yes.')
        expect(getNodeFingerprint(paragraph)).toBe(
            getNodeFingerprint(roundTrip.nodes.find((node) => node.type === 'paragraph')!)
        )

        const withReply = {
            ...roundTrip,
            annotations: upsertAnnotation(roundTrip.annotations, 'abc', [
                { by: 'nietzsche', name: 'Nietzsche', text: 'Updated.', kind: 'bot' },
            ]),
        }
        expect(getNodeFingerprint(withReply.nodes.find((node) => node.type === 'paragraph')!)).toBe(
            getNodeFingerprint(paragraph)
        )
    })

    test('annotation maps merge by author without touching the other side', () => {
        const base = upsertAnnotation({}, 'abc', [{ by: 'you', name: 'Ada', text: 'draft', kind: 'human' }])
        const local = upsertAnnotation(base, 'abc', [
            { by: 'you', name: 'Ada', text: 'mine', kind: 'human' },
            { by: 'marx', name: 'Marx', text: 'local marx', kind: 'bot' },
        ])
        const remote = upsertAnnotation(base, 'abc', [
            { by: 'you', name: 'Ada', text: 'draft', kind: 'human' },
            { by: 'nietzsche', name: 'Nietzsche', text: 'remote nietzsche', kind: 'bot' },
        ])
        const merged = mergeAnnotationMaps(base, local, remote)
        const by = Object.fromEntries((merged?.abc.notes || []).map((note) => [note.by, note.text]))
        expect(by.you).toBe('mine')
        expect(by.marx).toBe('local marx')
        expect(by.nietzsche).toBe('remote nietzsche')

        const baseMd = '# Title\n\nLife'
        const localMd = serializeMarkdownNotebook({
            ...parseMarkdownNotebook('# Title\n\n<ref id="abc">Life</ref>'),
            annotations: local,
            errors: [],
        })
        const remoteMd = serializeMarkdownNotebook({
            ...parseMarkdownNotebook('# Title\n\n<ref id="abc">Life</ref>'),
            annotations: remote,
            errors: [],
        })
        const result = mergeNotebookMarkdownChanges({
            baseMarkdown: baseMd,
            localMarkdown: localMd,
            remoteMarkdown: remoteMd,
        })
        expect(result.document.annotations?.abc.notes.map((note) => note.by).sort()).toEqual([
            'marx',
            'nietzsche',
            'you',
        ])
        expect(result.mergedMarkdown).not.toContain('notes=')
    })

    test('autonomous invite places two notes on different spans and delete unwraps', () => {
        const parsed = parseMarkdownNotebook(
            '# Title\n\nVirtue is not a feeling.\n\nThe market is a historical form, not nature.'
        )
        expect(notebookReadableText(parsed.nodes)).toContain('Virtue is not a feeling.')
        expect(wordSpanAt('Virtue is not a feeling.', 0)).toEqual({ start: 0, end: 6 })
        expect(notebookReadableText(parsed.nodes)).toContain('Title: Title')

        const first = resolveAutonomousPlacement(parsed.nodes, 'Virtue', 'span', [])
        expect(first.kind).toBe('span')
        if (first.kind !== 'span') return
        expect(first.span.end - first.span.start).toBe('Virtue'.length)
        const afterFirst = applyRefOnNotebookSpan(parsed.nodes, first.span, 'ref-a')
        const used = collectExistingRefSpans(afterFirst)
        expect(used).toHaveLength(1)

        const meta = resolveAutonomousPlacement(afterFirst, '', 'piece', used)
        expect(meta).toEqual({ kind: 'piece' })
        expect(resolveAutonomousPlacement(afterFirst, 'Virtue', 'span', used)).toEqual({ kind: 'piece' })
        const onBlock = resolveAutonomousPlacement(parsed.nodes, 'Virtue is not a feeling', 'block', [])
        expect(onBlock.kind).toBe('block')
        if (onBlock.kind === 'block') {
            expect(onBlock.nodeId).toBeTruthy()
            expect(onBlock.nodeId).not.toBe(parsed.nodes[0]?.id)
        }
        const untitledBlock = resolveAutonomousPlacement(parsed.nodes, '', 'block', [])
        expect(untitledBlock.kind).toBe('block')
        if (untitledBlock.kind === 'block') {
            expect(untitledBlock.nodeId).not.toBe(parsed.nodes[0]?.id)
        }

        const second = resolveAutonomousPlacement(afterFirst, 'historical form', 'span', used)
        expect(second.kind).toBe('span')
        if (second.kind !== 'span') return
        const withBoth = applyRefOnNotebookSpan(afterFirst, second.span, 'ref-b')
        const saved = {
            type: 'doc' as const,
            nodes: withBoth,
            annotations: {
                'ref-a': {
                    id: 'ref-a',
                    notes: [{ by: 'nietzsche', name: 'Nietzsche', text: 'Will first.', kind: 'bot' as const }],
                },
                'ref-b': {
                    id: 'ref-b',
                    notes: [{ by: 'marx', name: 'Marx', text: 'History first.', kind: 'bot' as const }],
                },
                'ref-piece': {
                    id: 'ref-piece',
                    scope: 'piece' as const,
                    notes: [{ by: 'arendt', name: 'Arendt', text: 'The frame is the act.', kind: 'bot' as const }],
                },
            },
            errors: [],
        }
        const markdown = serializeMarkdownNotebook(saved)
        expect(markdown).toContain('<ref id="ref-a">')
        expect(markdown).toContain('<ref id="ref-b">')
        expect(markdown).toContain('<!--wim-annotations:')
        expect(markdown).toContain('"scope":"piece"')

        const afterDelete = deleteNotebookAnnotation(saved, 'ref-a', 'nietzsche')
        expect(afterDelete.annotations?.['ref-a']).toBeUndefined()
        expect(serializeMarkdownNotebook(afterDelete)).not.toContain('ref-a')
        expect(afterDelete.annotations?.['ref-b'].notes[0].text).toBe('History first.')
        expect(afterDelete.annotations?.['ref-piece'].scope).toBe('piece')
        expect(getRefQuote(withBoth, 'ref-b').length).toBeGreaterThan(0)
        expect(formatNoteTime(new Date().toISOString())).toBe('Just now')

        const blockId = 'blk-1'
        const withBlock = {
            ...saved,
            nodes: parsed.nodes.map((node, index) => (index === 1 ? { ...node, blockId } : node)),
            annotations: {
                [blockId]: {
                    id: blockId,
                    scope: 'block' as const,
                    notes: [{ by: 'you', name: 'Ada', text: 'This paragraph.', kind: 'human' as const }],
                },
            },
        }
        const blockMarkdown = serializeMarkdownNotebook(withBlock)
        expect(blockMarkdown).toContain(`<!--wim-block:${blockId}-->`)
        expect(blockMarkdown).toContain('"scope":"block"')
        const blockRoundTrip = parseMarkdownNotebook(blockMarkdown)
        expect(blockRoundTrip.nodes.some((node) => node.blockId === blockId)).toBe(true)
        expect(blockRoundTrip.annotations?.[blockId]?.scope).toBe('block')
        expect(blockRoundTrip.annotations?.[blockId]?.notes[0].text).toBe('This paragraph.')
    })

    test('invite apply and slash WIM AI keep the writer’s text', () => {
        const parsed = parseMarkdownNotebook('# Title\n\nVirtue is not a feeling.\n\nThe market is a historical form.')
        const applied = applyPhilosopherInviteNotes(
            parsed,
            [
                {
                    botId: 'marx',
                    author: 'Marx',
                    phrase: 'Virtue is not a feeling',
                    text: 'This paragraph is the claim.',
                    scope: 'block',
                },
                { botId: 'arendt', author: 'Arendt', phrase: '', text: 'The frame is the act.', scope: 'piece' },
            ],
            [
                { id: 'marx', name: 'Marx', avatarUrl: '/philosophers/marx.png' },
                { id: 'arendt', name: 'Arendt' },
            ],
            { now: '2026-08-18T12:00:00.000Z', createId: (() => { let n = 0; return () => `id-${++n}` })() }
        )
        expect(applied.placed).toHaveLength(2)
        expect(applied.document.nodes.some((node) => node.blockId)).toBe(true)
        expect(Object.values(applied.document.annotations || {}).some((entry) => entry.scope === 'piece')).toBe(true)

        const withSlash = parseMarkdownNotebook('hello /wim')
        const planned = planOpenAIPromptInsert(withSlash.nodes, withSlash.nodes[0].id)
        expect(planned.nodes).toHaveLength(2)
        expect(planned.nodes[0].type).toBe('paragraph')
        expect(getInlineText((planned.nodes[0] as NotebookTextBlockNode).children).trim()).toBe('hello')
        expect(planned.nodes[1]).toMatchObject({ type: 'component', tagName: 'Prompt' })
    })

    test('presence ignores this client and only draws carets with a node index', () => {
        const colorA = caretColorForClient('peer-a')
        const colorB = caretColorForClient('peer-b')
        expect(colorA).toMatch(/^#/)
        expect(caretColorForClient('peer-a')).toBe(colorA)
        const { carets, people } = presenceStateToCarets(
            {
                me: [{ clientId: 'me', userName: 'Me', color: '#111', position: { nodeIndex: 0, offset: 1 } }],
                'peer-a': [
                    {
                        clientId: 'peer-a',
                        userName: 'Ada',
                        color: colorA,
                        position: { nodeIndex: 2, offset: 4 },
                    },
                ],
                'peer-b': [{ clientId: 'peer-b', userName: 'Ben', color: colorB }],
            },
            'me'
        )
        expect(people.map((person) => person.clientId).sort()).toEqual(['peer-a', 'peer-b'])
        expect(carets).toHaveLength(1)
        expect(carets[0].clientId).toBe('peer-a')
        expect(carets[0].position.nodeIndex).toBe(2)
    })

    test('writing blocks have defaults and parse stored database props', () => {
        expect(parseCalloutTone('warning')).toBe('warning')
        expect(parseCalloutTone('nope')).toBe('note')
        expect(openNotebookHash('abc')).toBe('#/notebook/abc')

        const database = makeDefaultDatabaseContent(() => 'r1')
        expect(database.columns.map((column) => column.id)).toEqual(['name', 'status', 'check'])
        expect(parseDatabaseContent({ columns: database.columns, rows: database.rows }).rows[0].id).toBe('r1')
    })

    test('notebook image upload accepts common image types only', () => {
        expect(isNotebookImageFile({ type: 'image/png' })).toBe(true)
        expect(isNotebookImageFile({ type: 'image/jpeg' })).toBe(true)
        expect(isNotebookImageFile({ type: 'application/pdf' })).toBe(false)
        expect(notebookImageExtension('image/webp')).toBe('webp')
        expect(notebookImageExtension('image/jpeg')).toBe('jpg')
    })
})
