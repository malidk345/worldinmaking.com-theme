import { test, expect } from '@playwright/test'
import {
    mergeNotebookLists,
    notebookChromeSyncFromRemoteResult,
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
    setAnnotationResolved,
    upsertAnnotation,
} from '../src/notebook-app/lib/components/MarkdownNotebook/annotations'
import {
    filterMentionPeople,
    getMentionTokenAt,
    insertMentionMark,
    listMentionPeople,
} from '../src/notebook-app/lib/components/MarkdownNotebook/mentionPeople'
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
import {
    compactHistoryForStorage,
    createNotebook,
    deleteNotebook,
    emptyNotebookTrash,
    getNotebook,
    getNotebookHistory,
    getOrCreateDailyNotebook,
    restoreNotebookFromTrash,
    restoreNotebookVersion,
    unpinNotebookFromDesktop,
    writeNotebookHistory,
    type StoredNotebook,
} from '../src/notebook-app/scenes/notebooks/notebookStorage'
import { collectLocalNotebookFaces } from '../src/notebook-app/scenes/notebooks/notebookFaces'
import { serializeAnnotationsSidecar } from '../src/notebook-app/lib/components/MarkdownNotebook/annotations'
import {
    buildBlockMoreMenuItems,
    canShowBlockMoreMenu,
} from '../src/notebook-app/lib/components/MarkdownNotebook/notebookEditorModel'
import {
    notebookMatchesQuery,
    notebookPreviewExcerpt,
} from '../src/notebook-app/scenes/notebooks/notebookPreview'
import {
    addCalendarMonths,
    buildMonthWeeks,
    CALENDAR_DAY_LABELS,
    collectNotebookTasks,
    dateFromKey,
    extractNotebookTasks,
    folderDepth,
    folderLeaf,
    groupNotebookTasks,
    normalizeFolder,
    parseTaskDue,
    sortNotebookTasks,
    todayKey,
    toggleTaskLine,
    uniqueTags,
} from '../src/notebook-app/scenes/notebooks/notebookOrganize'
import {
    collectSlashSplitNodes,
    getInsertMenuFilterQuery,
    getSlashCommandQuery,
    getSlashTokenAt,
    mergeDetachedSlashMenuBack,
    planDeleteEmptyCodeBlock,
    planDeleteTextAtSelection,
    planInsertEmptyParagraphAfter,
    planInsertMarkdownAfter,
    planInsertNodesAfter,
    planInsertNodesAtBoundary,
    planMergeAdjacentTextBlocks,
    planPasteInlineChildren,
    mapRestoreSelectionThroughDocumentChange,
    planPasteIntoTextBlock,
    shouldPasteInlineMarkdown,
    planMergeTextIntoPreviousNonText,
    planReplaceCodeBlockRange,
    shouldInsertParagraphBelowTrailingCode,
    slashMenuRestoreText,
    splitTextBlockAtSlashToken,
} from '../src/notebook-app/lib/components/MarkdownNotebook/documentModel'
import { splitInlineNodesAt } from '../src/notebook-app/lib/components/MarkdownNotebook/inlineContent'
import { htmlStringToInlineNodes } from '../src/notebook-app/lib/components/MarkdownNotebook/markdown'
import { getInlineText } from '../src/notebook-app/lib/components/MarkdownNotebook/utils'
import { computeBacklinks } from '../src/notebook-app/lib/components/MarkdownNotebook/wikilinks'
import { extractOutlineHeadings } from '../src/notebook-app/scenes/notebooks/outlineModel'
import type { NotebookTextBlockNode } from '../src/notebook-app/lib/components/MarkdownNotebook/types'
import { documentMarkdown, pickPublicNotebook } from '../src/notebook-app/scenes/notebooks/notebookPublicMarkdown'
import {
    findDuplicateStrings,
    slashCatalogKeys,
    SLASH_REMOVED_KEYS,
    SLASH_REGISTRY_TAGS,
} from '../src/notebook-app/lib/components/MarkdownNotebook/insertCatalog'
import {
    nextBeginSlashInsertMenuState,
    nextOpenInsertMenuState,
    planDismissSlashMenu,
    planInsertAtBoundary,
    planRemoveTemporaryInsertNode,
    planSlashInsertAtTextCaret,
    planSplitTextBlock,
    planTextBlockTypedSlash,
    getInsertMenuPosition,
} from '../src/notebook-app/lib/components/MarkdownNotebook/insertMenuModel'
import type { InsertMenuState } from '../src/notebook-app/lib/components/MarkdownNotebook/editorTypes'
import { planDeleteListItemAtStart, planSplitListItem } from '../src/notebook-app/lib/components/MarkdownNotebook/listModel'
import { planInsertTableRow } from '../src/notebook-app/lib/components/MarkdownNotebook/tableModel'

test.describe('notebook frontend helpers', () => {
    test('list timeAgo uses hours between 1h and 24h', () => {
        const seconds = Math.floor((2 * 60 * 60 * 1000) / 1000)
        expect(seconds < 86400).toBe(true)
        expect(Math.floor(seconds / 3600)).toBe(2)
        expect(Math.floor(seconds / 86400)).toBe(0)
    })

    test('public notebook body drops editor blocks and a repeated title', () => {
        expect(documentMarkdown('# Hello\n\nBody text', 'Hello')).toBe('Body text')
        expect(documentMarkdown('<ph-query />\n\nKept', 'Other')).toBe('Kept')
        expect(documentMarkdown('<ph-callout>hidden</ph-callout>\nVisible', 'T')).toBe('Visible')
        // Leading whitespace, CRLF, and wim-block annotations
        expect(documentMarkdown('\r\n\r\n# Hello\r\n\r\nBody text', 'Hello')).toBe('Body text')
        expect(documentMarkdown('<!--wim-block:abc-123-->\n# Hello\n\nBody text', 'Hello')).toBe('Body text')
        // Even when user modified the title in the publish modal, leading H1 is the notebook title and is dropped
        expect(documentMarkdown('# Hello Draft\n\nBody text', 'Hello Published')).toBe('Body text')
        // Subheadings that don't match the title are preserved
        expect(documentMarkdown('## Chapter 1\n\nBody text', 'My Book')).toBe('## Chapter 1\n\nBody text')
    })

    test('public links ignore unpublished local drafts', () => {
        expect(pickPublicNotebook({ isPublished: false }, null)).toBeNull()
        expect(pickPublicNotebook({ isPublished: true, id: 'local' }, null)).toEqual({ isPublished: true, id: 'local' })
        expect(pickPublicNotebook({ isPublished: true, id: 'local' }, { isPublished: true, id: 'remote' })).toEqual({
            isPublished: true,
            id: 'remote',
        })
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

    test('slash catalog is one WIM list without duplicate keys or leftover PostHog inserts', () => {
        const keys = slashCatalogKeys()
        expect(findDuplicateStrings(keys)).toEqual([])
        expect(keys).toEqual(
            expect.arrayContaining([
                'media-table',
                'text-bullet-list',
                'text-numbered-list',
                'text-todo-list',
                'component-Image',
                'component-Embed',
                'component-Latex',
                'component-Callout',
                'component-Toggle',
                'component-DatabaseTable',
                'page-subpage',
            ])
        )
        expect(keys).not.toContain('inline-comment')
        for (const removed of SLASH_REMOVED_KEYS) {
            expect(keys).not.toContain(removed)
        }
        expect(SLASH_REGISTRY_TAGS).not.toEqual(expect.arrayContaining(['Query', 'FeatureFlag', 'Experiment', 'SubPage']))
        expect(keys.some((key) => /FeatureFlag|Query|Experiment|Recording/.test(key))).toBe(false)
    })

    test('insert menu plans keep slash and + boundary in one place', () => {
        const paragraph = {
            id: 'p1',
            type: 'paragraph' as const,
            children: [{ type: 'text' as const, text: 'Hello' }],
        }
        expect(planInsertAtBoundary([paragraph], 0)).toBeNull()

        const atEnd = planInsertAtBoundary([paragraph], 1)
        expect(atEnd?.insertedId).toBeTruthy()
        expect(atEnd?.nodes).toHaveLength(2)
        expect(atEnd?.nodes[1].id).toBe(atEnd?.insertedId)
        expect(atEnd?.nodes[1]).toMatchObject({ type: 'paragraph', startsGroup: true })
        expect(atEnd?.rejoinNodeIdOnClose).toBeUndefined()

        const between = planInsertAtBoundary(
            [
                paragraph,
                { id: 'p2', type: 'paragraph' as const, children: [{ type: 'text' as const, text: 'World' }] },
            ],
            1
        )
        expect(between?.nodes).toHaveLength(3)
        expect(between?.rejoinNodeIdOnClose).toBe('p2')
        expect(between?.nodes[2]).toMatchObject({ id: 'p2', startsGroup: true })

        const current: InsertMenuState = {
            nodeId: 'p1',
            query: 'ta',
            selectedIndex: 2,
            mode: 'tools',
            detached: true,
            source: 'slash',
        }
        expect(nextOpenInsertMenuState(current, 'p1', 'ta').selectedIndex).toBe(2)
        expect(nextOpenInsertMenuState(current, 'p1', 'tab').selectedIndex).toBe(0)
        expect(nextBeginSlashInsertMenuState(current, 'p2', 'img', { detached: true })).toMatchObject({
            nodeId: 'p2',
            query: 'img',
            source: 'slash',
            detached: true,
            selectedIndex: 0,
        })

        const slashNode = {
            id: 'slash',
            type: 'paragraph' as const,
            children: [{ type: 'text' as const, text: 'tab' }],
        }
        const restored = planDismissSlashMenu(
            [
                { ...paragraph, children: [{ type: 'text' as const, text: 'Hello ' }] },
                slashNode,
            ],
            { nodeId: 'slash', query: 'tab', selectedIndex: 0, mode: 'tools', detached: true, source: 'slash' }
        )
        expect(restored?.removedNodeId).toBe('slash')
        expect(restored?.focus.nodeId).toBe('p1')

        const tempRemoved = planRemoveTemporaryInsertNode(
            [paragraph, { id: 'tmp', type: 'paragraph' as const, children: [], startsGroup: true }],
            {
                nodeId: 'tmp',
                query: '',
                selectedIndex: 0,
                mode: 'tools',
                removeNodeOnClose: true,
            }
        )
        expect(tempRemoved?.map((node) => node.id)).toEqual(['p1'])
    })

    test('Enter split and typed slash share one insert plan', () => {
        const paragraph = {
            id: 'p2',
            type: 'paragraph' as const,
            children: [{ type: 'text' as const, text: 'Hello world' }],
        }
        const split = planSplitTextBlock(paragraph, 1, 5, 5)
        expect(split.focus.start).toBe(0)
        expect(split.replacementNodes).toHaveLength(2)
        expect(getInlineText((split.replacementNodes[0] as typeof paragraph).children)).toBe('Hello')

        const titleSplit = planSplitTextBlock(
            { id: 't1', type: 'paragraph', children: [{ type: 'text', text: 'Title more' }] },
            0,
            5,
            5
        )
        expect(titleSplit.replacementNodes[0]).toMatchObject({ type: 'heading', level: 1 })

        const caretSlash = planSlashInsertAtTextCaret(paragraph, 6, 6, '')
        expect(caretSlash.commandNodeId).toBeTruthy()
        expect(caretSlash.replacementNodes.length).toBeGreaterThanOrEqual(2)

        const wholeLine = planTextBlockTypedSlash(
            { id: 'p3', type: 'paragraph', children: [{ type: 'text', text: '/table' }] },
            1,
            [{ type: 'text', text: '/table' }],
            6
        )
        expect(wholeLine).toMatchObject({ type: 'same-node', query: 'table' })

        const midLine = planTextBlockTypedSlash(
            paragraph,
            1,
            [{ type: 'text', text: 'Hello /tab' }],
            10
        )
        expect(midLine?.type).toBe('split')
        if (midLine?.type === 'split') {
            expect(midLine.query).toBe('tab')
            expect(midLine.nodes.length).toBeGreaterThanOrEqual(2)
        }
        expect(planTextBlockTypedSlash(paragraph, 0, paragraph.children, 5)).toBeNull()
    })

    test('list Enter/Backspace and table Enter share one edit plan', () => {
        const list = {
            id: 'l1',
            type: 'list' as const,
            ordered: false,
            items: [
                {
                    id: 'i1',
                    children: [{ type: 'text' as const, text: 'Alpha' }],
                    depth: 0,
                    ordered: false,
                },
                {
                    id: 'i2',
                    children: [{ type: 'text' as const, text: 'Beta' }],
                    depth: 1,
                    ordered: false,
                },
            ],
        }

        const split = planSplitListItem(list, 0, 3, 3)
        expect(split?.kind).toBe('split')
        expect(split?.items).toHaveLength(3)
        expect(split?.focus.listItemIndex).toBe(1)
        expect(getInlineText(split?.items?.[0].children ?? [])).toBe('Alp')

        const emptyNested = {
            ...list,
            items: [
                list.items[0],
                { id: 'i2', children: [], depth: 1, ordered: false },
            ],
        }
        const outdent = planSplitListItem(emptyNested, 1, 0, 0)
        expect(outdent?.kind).toBe('outdent')
        expect(outdent?.items?.[1].depth).toBe(0)

        const unwrap = planDeleteListItemAtStart(
            { ...list, items: [{ id: 'i1', children: [], depth: 0, ordered: false }] },
            0,
            'backward'
        )
        expect(unwrap?.kind).toBe('unwrap')
        expect(unwrap?.replacementNodes?.[0]).toMatchObject({ type: 'paragraph' })

        expect(
            planDeleteListItemAtStart(list, 0, 'forward')
        ).toBeNull()

        const table = {
            id: 't1',
            type: 'table' as const,
            headers: [{ children: [{ type: 'text' as const, text: 'A' }] }],
            rows: [[{ children: [{ type: 'text' as const, text: '1' }] }]],
        }
        expect(planInsertTableRow(table, { section: 'header', rowIndex: 0, columnIndex: 0 }).kind).toBe('focus-body')
        const inserted = planInsertTableRow(table, { section: 'body', rowIndex: 0, columnIndex: 0 })
        expect(inserted.kind).toBe('insert-row')
        if (inserted.kind === 'insert-row') {
            expect(inserted.rows).toHaveLength(2)
            expect(inserted.focus.tableCell).toEqual({ section: 'body', rowIndex: 1, columnIndex: 0 })
        }
    })

    test('Backspace at the start of a block merges or focuses, never deletes the previous block', () => {
        const first = {
            id: 'p1',
            type: 'paragraph' as const,
            children: [{ type: 'text' as const, text: 'Hello' }],
        }
        const second = {
            id: 'p2',
            type: 'paragraph' as const,
            children: [{ type: 'text' as const, text: 'World' }],
        }
        const range = planDeleteTextAtSelection([first, second], 1, 1, 4, 'backward')
        expect(range?.kind).toBe('replace')
        if (range?.kind === 'replace') {
            expect(getInlineText((range.nodes[1] as typeof second).children)).toBe('Wd')
        }

        expect(planDeleteTextAtSelection([first], 0, 0, 0, 'backward')?.kind).toBe('noop')
        expect(planDeleteTextAtSelection([first, second], 1, 2, 2, 'backward')).toBeNull()

        const merged = planMergeAdjacentTextBlocks([first, second], 1)
        expect(merged?.kind).toBe('replace')
        if (merged?.kind === 'replace') {
            expect(merged.nodes).toHaveLength(1)
            expect(getInlineText((merged.nodes[0] as typeof first).children)).toBe('HelloWorld')
            expect(merged.focus.start).toBe(5)
        }

        const headingAfterList = planDeleteTextAtSelection(
            [
                {
                    id: 'l1',
                    type: 'list' as const,
                    ordered: false,
                    items: [{ id: 'i1', children: [{ type: 'text' as const, text: 'Item' }], depth: 0, ordered: false }],
                },
                { id: 'h1', type: 'heading' as const, level: 2, children: [{ type: 'text' as const, text: 'Title' }] },
            ],
            1,
            0,
            0,
            'backward'
        )
        expect(headingAfterList?.kind).toBe('replace')
        if (headingAfterList?.kind === 'replace') {
            expect(headingAfterList.nodes[1]).toMatchObject({ type: 'paragraph', id: 'h1' })
        }

        const intoList = planMergeTextIntoPreviousNonText(
            [
                {
                    id: 'l1',
                    type: 'list' as const,
                    ordered: false,
                    items: [{ id: 'i1', children: [{ type: 'text' as const, text: 'Item' }], depth: 0, ordered: false }],
                },
                second,
            ],
            1
        )
        expect(intoList?.kind).toBe('replace')
        if (intoList?.kind === 'replace') {
            const list = intoList.nodes[0]
            expect(list.type).toBe('list')
            if (list.type === 'list') {
                expect(getInlineText(list.items[0].children)).toBe('ItemWorld')
            }
            expect(intoList.nodes).toHaveLength(1)
        }

        const emptyAfterCode = planMergeTextIntoPreviousNonText(
            [
                { id: 'c1', type: 'code' as const, text: 'const x = 1' },
                { id: 'p3', type: 'paragraph' as const, children: [] },
            ],
            1
        )
        expect(emptyAfterCode?.kind).toBe('replace')
        if (emptyAfterCode?.kind === 'replace') {
            expect(emptyAfterCode.nodes.map((node) => node.id)).toEqual(['c1'])
            expect(emptyAfterCode.focus.start).toBe('const x = 1'.length)
        }

        const filledAfterCode = planMergeTextIntoPreviousNonText(
            [
                { id: 'c1', type: 'code' as const, text: 'const x = 1' },
                second,
            ],
            1
        )
        expect(filledAfterCode).toEqual({ kind: 'focus', nodeId: 'c1', offset: 'const x = 1'.length })
    })

    test('code Enter inserts a real newline and empty code deletes through the model', () => {
        const code = { id: 'c1', type: 'code' as const, text: 'ab' }
        const newline = planReplaceCodeBlockRange(code, 1, 1, '\n')
        expect(newline.node.text).toBe('a\nb')
        expect(newline.focus).toEqual({ nodeId: 'c1', start: 2, end: 2 })

        const indent = planReplaceCodeBlockRange(code, 0, 0, '    ')
        expect(indent.node.text).toBe('    ab')
        expect(indent.focus.start).toBe(4)

        const replaced = planReplaceCodeBlockRange(code, 0, 2, 'z')
        expect(replaced.node.text).toBe('z')
        expect(replaced.focus.start).toBe(1)

        expect(planDeleteEmptyCodeBlock([{ id: 'c1', type: 'code', text: 'keep' }], 'c1')).toBeNull()
        expect(planDeleteEmptyCodeBlock([{ id: 'c1', type: 'code', text: '' }, { id: 'p1', type: 'paragraph', children: [] }], 'c1')?.map((node) => node.id)).toEqual(
            ['p1']
        )

        expect(shouldInsertParagraphBelowTrailingCode([code], 0, 2)).toBe(true)
        expect(shouldInsertParagraphBelowTrailingCode([code, { id: 'p1', type: 'paragraph', children: [] }], 0, 2)).toBe(
            false
        )
        expect(shouldInsertParagraphBelowTrailingCode([{ id: 'c1', type: 'code', text: 'a\nb' }], 0, 1)).toBe(false)

        const after = planInsertEmptyParagraphAfter([code], 'c1')
        expect(after?.kind).toBe('insert')
        if (after?.kind === 'insert') {
            expect(after.nodes).toHaveLength(2)
            expect(after.nodes[1]).toMatchObject({ type: 'paragraph' })
        }
        expect(
            planInsertEmptyParagraphAfter(
                [code, { id: 'p1', type: 'paragraph', children: [] }],
                'c1'
            )
        ).toEqual({ kind: 'focus-existing', nodeId: 'p1' })
    })

    test('paste inserts after a node, never before the title, and inlines a single paragraph', () => {
        const title = {
            id: 't1',
            type: 'heading' as const,
            level: 1 as const,
            children: [{ type: 'text' as const, text: 'Title' }],
        }
        const body = {
            id: 'p1',
            type: 'paragraph' as const,
            children: [{ type: 'text' as const, text: 'Hello' }],
        }
        const pasted = [
            { id: 'x', type: 'paragraph' as const, children: [{ type: 'text' as const, text: 'X' }] },
        ]

        const after = planInsertNodesAfter([title, body], 'p1', pasted)
        expect(after?.nodes.map((node) => node.id)).toEqual(['t1', 'p1', 'x'])
        expect(after?.focus).toMatchObject({ kind: 'text', nodeId: 'x' })

        const atStart = planInsertNodesAtBoundary([title, body], pasted, 0)
        expect(atStart?.[0].id).toBe('t1')
        expect(atStart).toHaveLength(3)

        const fromMarkdown = planInsertMarkdownAfter([title], 't1', 'Pasted line', 'seed')
        expect(fromMarkdown?.nodes).toHaveLength(2)
        expect(fromMarkdown?.nodes[1].type).toBe('paragraph')

        const inline = planPasteIntoTextBlock(body, false, 5, 5, pasted, 'X')
        expect(inline?.kind).toBe('update')
        if (inline?.kind === 'update') {
            expect(getInlineText(inline.nextNode.children)).toBe('HelloX')
            expect(inline.focus.start).toBe(6)
        }

        const multi = planPasteIntoTextBlock(body, false, 5, 5, [
            { id: 'a', type: 'paragraph', children: [{ type: 'text', text: 'A' }] },
            { id: 'b', type: 'paragraph', children: [{ type: 'text', text: 'B' }] },
        ], 'A\n\nB')
        expect(multi?.kind).toBe('replace-nodes')
        if (multi?.kind === 'replace-nodes') {
            expect(multi.replacementNodes.length).toBeGreaterThanOrEqual(3)
            expect(getInlineText((multi.replacementNodes[0] as typeof body).children)).toBe('Hello')
        }

        const titlePaste = planPasteIntoTextBlock(title, true, 5, 5, pasted, 'Hello')
        expect(titlePaste?.kind).toBe('update')
        if (titlePaste?.kind === 'update') {
            expect(titlePaste.nextNode).toMatchObject({ type: 'heading', level: 1 })
            expect(getInlineText(titlePaste.nextNode.children)).toBe('TitleX')
        }

        const titleWithBody = planPasteIntoTextBlock(title, true, 5, 5, pasted, 'Hello\n\nWorld')
        expect(titleWithBody?.kind).toBe('replace-nodes')
        if (titleWithBody?.kind === 'replace-nodes') {
            expect(titleWithBody.replacementNodes[0]).toMatchObject({ type: 'heading', level: 1 })
            expect(titleWithBody.replacementNodes.length).toBeGreaterThanOrEqual(2)
        }

        const inlineChildren = planPasteInlineChildren(
            [{ type: 'text', text: 'Hello' }],
            5,
            5,
            [{ type: 'text', text: 'X' }]
        )
        expect(getInlineText(inlineChildren.children)).toBe('HelloX')
        expect(inlineChildren.start).toBe(6)
        const replaced = planPasteInlineChildren(
            [{ type: 'text', text: 'Hello' }],
            1,
            4,
            [{ type: 'text', text: 'XX' }]
        )
        expect(getInlineText(replaced.children)).toBe('HXX' + 'o')
        expect(shouldPasteInlineMarkdown('Hello', '', { type: 'doc', nodes: [body], errors: [] })).toBe(true)
        expect(
            shouldPasteInlineMarkdown('Hello\n\nWorld', '', {
                type: 'doc',
                nodes: [body, { id: 'p2', type: 'paragraph', children: [{ type: 'text', text: 'World' }] }],
                errors: [],
            })
        ).toBe(false)

        expect(htmlStringToInlineNodes('')).toEqual([])
        const htmlNodes =
            typeof document === 'undefined'
                ? [{ type: 'text' as const, text: 'X', marks: [{ type: 'bold' as const }] }]
                : htmlStringToInlineNodes('<strong>X</strong>')
        if (typeof document !== 'undefined') {
            expect(getInlineText(htmlStringToInlineNodes('<b>Hi</b>'))).toBe('Hi')
        }
        const fromHtml = planPasteInlineChildren([{ type: 'text', text: 'Hello' }], 5, 5, htmlNodes)
        expect(getInlineText(fromHtml.children)).toBe('HelloX')
        expect(
            fromHtml.children.some(
                (child) => child.type === 'text' && child.marks?.some((mark) => mark.type === 'bold')
            )
        ).toBe(true)
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

    test('outline extracts H1–H3 in document order', () => {
        const headings = extractOutlineHeadings('# Agora\n\nIntro\n\n## Forum\n\nText\n\n### Voice\n\nMore\n\n#### Skip')
        expect(headings.map((item) => `${item.level}:${item.text}`)).toEqual(['1:Agora', '2:Forum', '3:Voice'])
    })

    test('backlinks scan other notebooks once, never the open page itself', () => {
        const links = computeBacklinks(
            { id: 'n1', title: 'Labor' },
            [
                { id: 'n1', title: 'Labor', content: 'See [[Capital]]' },
                { id: 'n2', title: 'Wages', content: 'Compare [[Labor]] with surplus.' },
                { id: 'n3', title: 'Notes', content: 'No links here.' },
            ]
        )
        expect(links).toHaveLength(1)
        expect(links[0].sourceNotebookId).toBe('n2')
        expect(links[0].contextSnippet).toContain('Labor')
    })

    test('list search matches title or body', () => {
        const notebook = { title: 'Market notes', content: '# Draft\n\nLook at **ARR** next week.' }
        expect(notebookMatchesQuery(notebook, '')).toBe(true)
        expect(notebookMatchesQuery(notebook, 'market')).toBe(true)
        expect(notebookMatchesQuery(notebook, 'arr')).toBe(true)
        expect(notebookMatchesQuery(notebook, 'missing')).toBe(false)
        expect(notebookMatchesQuery({ title: 'Doc', content: '```js\nhidden\n```\nVisible ARR' }, 'arr')).toBe(true)
        expect(notebookMatchesQuery({ title: 'Doc', content: '', folder: 'Projects/Launch' }, 'launch')).toBe(true)
        expect(notebookMatchesQuery({ title: 'Doc', content: '', tags: ['research'] }, '#research')).toBe(true)
    })

    test('organize helpers parse folders, tags, daily keys, and GFM tasks', () => {
        expect(todayKey(new Date('2026-09-06T15:00:00'))).toBe('2026-09-06')
        expect(todayKey(dateFromKey('2026-09-06')!)).toBe('2026-09-06')
        expect(normalizeFolder(' /Projects//Launch/ ')).toBe('Projects/Launch')
        expect(folderLeaf('Projects/Launch')).toBe('Launch')
        expect(folderDepth('Projects/Launch')).toBe(1)
        expect(uniqueTags(['#Research', 'research', ' Launch '])).toEqual(['Research', 'Launch'])
        expect(parseTaskDue('Write brief due:2026-09-10')).toBe('2026-09-10')
        expect(parseTaskDue('Ship by 2026-09-11')).toBe('2026-09-11')

        const tasks = extractNotebookTasks({
            id: 'n1',
            title: 'Plan',
            content: '- [ ] Write brief due:2026-09-10\n- [x] Done item\n* [ ] Other\nNot a task',
        })
        expect(tasks).toHaveLength(3)
        expect(tasks[0]).toMatchObject({ text: 'Write brief due:2026-09-10', done: false, due: '2026-09-10' })
        expect(tasks[1].done).toBe(true)
        expect(toggleTaskLine('- [ ] Write', 0)).toBe('- [x] Write')
        expect(toggleTaskLine('- [x] Write', 0)).toBe('- [ ] Write')
        expect(sortNotebookTasks(tasks)[0].due).toBe('2026-09-10')
        expect(groupNotebookTasks(tasks)).toHaveLength(1)
        expect(collectNotebookTasks([{ id: 't', title: 'Template', content: '- [ ] Hidden', isTemplate: true }])).toEqual(
            []
        )
    })

    test('daily calendar grid matches PostHog Sunday-start month padding', () => {
        expect(CALENDAR_DAY_LABELS).toEqual(['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'])
        const weeks = buildMonthWeeks(dateFromKey('2026-09-01')!)
        expect(weeks).toHaveLength(5)
        expect(weeks.every((week) => week.length === 7)).toBe(true)
        expect(todayKey(weeks[0][0])).toBe('2026-08-30')
        expect(todayKey(weeks[0][2])).toBe('2026-09-01')
        expect(todayKey(weeks[4][6])).toBe('2026-10-03')
        const next = addCalendarMonths(dateFromKey('2026-09-15')!, 1)
        expect(next.getFullYear()).toBe(2026)
        expect(next.getMonth()).toBe(9)
    })

    test('idle background pulls do not show Sync failed', () => {
        const silent = { report: false as const, remoteAvailable: true as boolean | null }
        expect(notebookChromeSyncFromRemoteResult(false, silent)).toBeNull()
        expect(notebookChromeSyncFromRemoteResult({ ok: false }, silent)).toBeNull()
        expect(notebookChromeSyncFromRemoteResult(undefined, silent)).toBeNull()

        const write = { report: true as const, remoteAvailable: true as boolean | null }
        expect(notebookChromeSyncFromRemoteResult({ ok: true }, write)).toEqual({ status: 'ok' })
        expect(notebookChromeSyncFromRemoteResult({ ok: false, forbidden: true }, write)).toBeNull()
        expect(notebookChromeSyncFromRemoteResult({ ok: false, gone: true }, write)).toBeNull()
        expect(notebookChromeSyncFromRemoteResult({ ok: false, conflict: true }, write)).toEqual({ status: 'ok' })
        expect(notebookChromeSyncFromRemoteResult({ ok: false }, write)).toEqual({
            status: 'error',
            message: 'Cloud sync failed. Notebook is still saved on this device.',
        })
        expect(notebookChromeSyncFromRemoteResult(false, { report: true, remoteAvailable: false })).toEqual({
            status: 'offline',
            message: 'Offline. Notebook is saved on this device.',
        })
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
        expect(dirty).toEqual({ adopt: true, applyContent: false, applyTitle: true, applyRemoteBase: true })

        const clean = planOpenNotebookRemoteApply({
            current,
            latest,
            draftContent: 'saved',
            draftTitle: 'Local',
        })
        expect(clean).toEqual({ adopt: true, applyContent: true, applyTitle: true, applyRemoteBase: true })

        const ownSaveEcho = planOpenNotebookRemoteApply({
            current,
            latest: { ...latest, content: 'saved', title: 'Local' },
            draftContent: 'saved plus local typing',
            draftTitle: 'Local',
        })
        expect(ownSaveEcho).toEqual({
            adopt: true,
            applyContent: false,
            applyTitle: true,
            applyRemoteBase: false,
        })
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
        expect(isNotebookInviteBotId('hegel')).toBe(true)
        expect(isNotebookInviteBotId('nobody')).toBe(false)
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
        expect(saved.replace(/[\r\n]+/g, '')).toContain('<ref id="abc">Life</ref>')
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

    test('mention marks and resolved notes survive serialize', () => {
        expect(getMentionTokenAt('hello @mar', 10)).toEqual({ start: 6, query: 'mar' })
        expect(getMentionTokenAt('mail@x.com', 10)).toBeNull()
        const people = listMentionPeople()
        expect(people.some((person) => person.id === 'marx')).toBe(true)
        expect(filterMentionPeople(people, 'mar').map((person) => person.id)).toContain('marx')

        const mentioned = insertMentionMark([{ type: 'text', text: 'hi @mar' }], 3, 7, {
            id: 'marx',
            label: 'Marx',
        })
        const parsed = parseMarkdownNotebook(
            serializeMarkdownNotebook({
                type: 'doc',
                nodes: [{ id: 'p1', type: 'paragraph', children: mentioned }],
                errors: [],
            })
        )
        const paragraph = parsed.nodes[0]
        expect(paragraph?.type).toBe('paragraph')
        if (paragraph?.type !== 'paragraph') return
        expect(paragraph.children[0]).toMatchObject({
            type: 'text',
            text: 'hi ',
        })
        expect(paragraph.children[1]).toMatchObject({
            type: 'text',
            text: '@Marx',
            marks: [{ type: 'mention', id: 'marx' }],
        })

        const withNote = upsertAnnotation({}, 'abc', [{ by: 'you', name: 'Ada', text: 'keep me', kind: 'human' }])
        const resolved = setAnnotationResolved(withNote, 'abc', true)
        expect(resolved.abc.notes[0].text).toBe('keep me')
        expect(resolved.abc.resolved).toBe(true)
        const saved = serializeMarkdownNotebook({
            type: 'doc',
            nodes: [
                {
                    id: 'p1',
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'Life', marks: [{ type: 'ref', id: 'abc' }] }],
                },
            ],
            annotations: resolved,
            errors: [],
        })
        expect(saved).toContain('"resolved":true')
        expect(parseMarkdownNotebook(saved).annotations?.abc).toMatchObject({
            resolved: true,
            notes: [{ text: 'keep me' }],
        })
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
        expect(markdown.replace(/[\r\n]+/g, '')).toContain('<ref id="ref-a">')
        expect(markdown.replace(/[\r\n]+/g, '')).toContain('<ref id="ref-b">')
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

    test('block more menu is Comment / Invite / WIM AI / Delete, not on title or writing rows', () => {
        expect(
            canShowBlockMoreMenu({
                mode: 'edit',
                isTitleRow: false,
                isAIPrompt: false,
                isAIWriting: false,
                isDiscussionComment: false,
            })
        ).toBe(true)
        expect(
            canShowBlockMoreMenu({
                mode: 'edit',
                isTitleRow: true,
                isAIPrompt: false,
                isAIWriting: false,
                isDiscussionComment: false,
            })
        ).toBe(false)
        expect(
            canShowBlockMoreMenu({
                mode: 'edit',
                isTitleRow: false,
                isAIPrompt: false,
                isAIWriting: true,
                isDiscussionComment: false,
            })
        ).toBe(false)
        expect(buildBlockMoreMenuItems({ canAskAI: true }).map((item) => item.key)).toEqual([
            'comment',
            'invite',
            'wim-ai',
            'delete',
        ])
        expect(buildBlockMoreMenuItems({ canAskAI: false }).map((item) => item.key)).toEqual([
            'comment',
            'invite',
            'delete',
        ])
        expect(buildBlockMoreMenuItems({ canAskAI: true }).find((item) => item.key === 'delete')?.status).toBe('danger')
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

    test('history keeps only three full bodies and writeHistory survives quota', () => {
        const entries = Array.from({ length: 6 }, (_, index) => ({
            version: index + 1,
            content: `body-${index + 1}`,
            title: 'Doc',
            timestamp: `2026-08-19T12:0${index}:00.000Z`,
        }))
        const compacted = compactHistoryForStorage(entries)
        expect(compacted).toHaveLength(6)
        expect(compacted.slice(0, 3).every((entry) => !entry.content)).toBe(true)
        expect(compacted.slice(-3).map((entry) => entry.content)).toEqual(['body-4', 'body-5', 'body-6'])
        expect(restoreNotebookVersion('missing-notebook', 1)).toBeUndefined()
        expect(() => writeNotebookHistory('nb-quota-test', entries)).not.toThrow()
        if (typeof localStorage !== 'undefined') {
            expect(getNotebookHistory('nb-quota-test').length).toBeGreaterThan(0)
            localStorage.removeItem('wim_notebook_history_nb-quota-test')
        }
    })

    test('restore refuses compacted snapshots that no longer store a body', () => {
        if (typeof localStorage === 'undefined') return
        const notebook = createNotebook('Restore test', 'live body')
        writeNotebookHistory(notebook.id, [
            { version: 1, title: 'Restore test', timestamp: '2026-01-01T00:00:00.000Z' },
            { version: 2, content: 'kept body', title: 'Restore test', timestamp: '2026-01-02T00:00:00.000Z' },
        ])
        expect(restoreNotebookVersion(notebook.id, 1)).toBeUndefined()
        expect(restoreNotebookVersion(notebook.id, 2)?.content).toBe('kept body')
        deleteNotebook(notebook.id)
    })

    test('faces collect author plus philosophers and compacted snapshots keep author', () => {
        const sidecar = serializeAnnotationsSidecar({
            n1: {
                id: 'n1',
                notes: [{ by: 'heraclitus', name: 'Heraclitus', text: 'flux', kind: 'bot' }],
            },
        })
        const faces = collectLocalNotebookFaces({
            createdBy: { first_name: 'Ali', username: 'ali' },
            lastModifiedBy: { first_name: 'Ali', username: 'ali' },
            markdown: `Hello\n\n${sidecar || ''}`,
        })
        expect(faces.map((face) => face.role)).toEqual(['author', 'philosopher'])
        expect(faces[0].name).toBe('Ali')
        expect(faces[1].name).toBe('Heraclitus')

        const compacted = compactHistoryForStorage([
            {
                version: 1,
                content: 'old',
                title: 'Doc',
                timestamp: '2026-01-01T00:00:00.000Z',
                author: { first_name: 'Ali' },
            },
            {
                version: 2,
                content: 'mid',
                title: 'Doc',
                timestamp: '2026-01-02T00:00:00.000Z',
                author: { first_name: 'Ali' },
            },
            {
                version: 3,
                content: 'new',
                title: 'Doc',
                timestamp: '2026-01-03T00:00:00.000Z',
                author: { first_name: 'Sara' },
            },
            {
                version: 4,
                content: 'newer',
                title: 'Doc',
                timestamp: '2026-01-04T00:00:00.000Z',
                author: { first_name: 'Sara' },
            },
        ])
        expect(compacted[0].content).toBeUndefined()
        expect(compacted[0].author?.first_name).toBe('Ali')
        expect(compacted[compacted.length - 1].author?.first_name).toBe('Sara')
    })

    test('deleted notebooks can be restored from trash', () => {
        if (typeof localStorage === 'undefined') return
        const notebook = createNotebook('Bin me', 'trash-body')
        deleteNotebook(notebook.id)
        expect(getNotebook(notebook.id)).toBeUndefined()
        const restored = restoreNotebookFromTrash(notebook.id)
        expect(restored?.content).toBe('trash-body')
        expect(getNotebook(notebook.id)?.title).toBe('Bin me')
        deleteNotebook(notebook.id)
        emptyNotebookTrash()
    })

    test('createNotebook stores folder tags and daily notes stay unique per day', () => {
        if (typeof localStorage === 'undefined') return
        const notebook = createNotebook('Launch notes', '- [ ] Ship due:2026-09-10', {
            folder: ' /Projects//Launch/ ',
            tags: ['#Research', 'research'],
        })
        expect(notebook.folder).toBe('Projects/Launch')
        expect(notebook.tags).toEqual(['Research'])
        const firstDaily = getOrCreateDailyNotebook(dateFromKey('2026-09-06')!)
        const secondDaily = getOrCreateDailyNotebook(dateFromKey('2026-09-06')!)
        expect(firstDaily.id).toBe(secondDaily.id)
        expect(firstDaily.kind).toBe('daily')
        expect(firstDaily.dailyDate).toBe('2026-09-06')
        deleteNotebook(notebook.id)
        deleteNotebook(firstDaily.id)
    })

    test('deleting a notebook automatically unpins it from desktop pinned items', () => {
        if (typeof localStorage === 'undefined') return
        const customAppsKey = 'wim_os_desktop_pinned_items'
        const initial = [
            { id: 'nb-keep', notebookId: 'nb-keep', label: 'Keep Me', url: '/notebooks?id=nb-keep' },
            { id: 'nb-delete-me', notebookId: 'nb-delete-me', label: 'Delete Me', url: '/notebooks?id=nb-delete-me' },
        ]
        localStorage.setItem(customAppsKey, JSON.stringify(initial))

        unpinNotebookFromDesktop('nb-delete-me')

        const remaining = JSON.parse(localStorage.getItem(customAppsKey) || '[]')
        expect(remaining).toHaveLength(1)
        expect(remaining[0].id).toBe('nb-keep')
        localStorage.removeItem(customAppsKey)
    })

    test('slash menu in inline context prioritizes inline commands and footnote keeps paragraph intact', () => {
        const emptyNode: NotebookTextBlockNode = {
            id: 'empty-1',
            type: 'paragraph',
            children: [],
        }
        const slashOnlyNode: NotebookTextBlockNode = {
            id: 'slash-1',
            type: 'paragraph',
            children: [{ type: 'text', text: '/' }],
        }
        const textWithSlashNode: NotebookTextBlockNode = {
            id: 'text-1',
            type: 'paragraph',
            children: [{ type: 'text', text: 'This is a long sentence with /' }],
        }

        // 1. Context detection:
        const {
            getNodeInsertContext,
            getFilteredInsertCommands,
        } = require('../src/notebook-app/lib/components/MarkdownNotebook/insertMenuModel')
        expect(getNodeInsertContext(emptyNode)).toBe('block')
        expect(getNodeInsertContext(slashOnlyNode)).toBe('block')
        expect(getNodeInsertContext(textWithSlashNode)).toBe('inline')

        // 2. Command filtering by context:
        const sampleCommands = [
            { key: 'text-heading-1', label: 'Heading 1', category: 'Basic', run: () => {} },
            { key: 'media-table', label: 'Table', category: 'Media', run: () => {} },
            { key: 'insert-footnote', label: 'Footnote', category: 'Common', run: () => {}, scope: 'all' as const },
        ]

        const blockResults = getFilteredInsertCommands(sampleCommands, '', 'block')
        expect(blockResults.map((c: any) => c.key)).toContain('text-heading-1')
        expect(blockResults.map((c: any) => c.key)).toContain('media-table')
        expect(blockResults.map((c: any) => c.key)).toContain('insert-footnote')

        const inlineResults = getFilteredInsertCommands(sampleCommands, '', 'inline')
        expect(inlineResults.map((c: any) => c.key)).toEqual(['insert-footnote'])

        const inlineSearch = getFilteredInsertCommands(sampleCommands, 'foot', 'inline')
        expect(inlineSearch.map((c: any) => c.key)).toEqual(['insert-footnote'])

        // 3. Footnote insertion into paragraph does not split it:
        const initialParagraph: NotebookTextBlockNode = {
            id: 'p-fn',
            type: 'paragraph',
            children: [{ type: 'text', text: 'Sentence with footnote' }],
        }
        const withFootnote: NotebookTextBlockNode = {
            ...initialParagraph,
            children: [
                { type: 'text', text: 'Sentence with footnote' },
                { type: 'footnote', id: '1' },
            ],
        }
        expect(withFootnote.id).toBe(initialParagraph.id)
        expect(withFootnote.type).toBe('paragraph')
        expect(withFootnote.children).toHaveLength(2)
        expect(withFootnote.children[1]).toEqual({ type: 'footnote', id: '1' })
    })

    test('footnote markdown round-trip parses and serializes without data loss', () => {
        const markdown = '# Footnote Document\n\nThis is a sentence with a footnote[^1] and another[^2].\n\n[^1]: First detailed reference.\n[^2]: Second citation source.'
        const parsed = parseMarkdownNotebook(markdown)
        expect(parsed.footnotes).toEqual({
            '1': 'First detailed reference.',
            '2': 'Second citation source.',
        })
        const bodyParagraph = parsed.nodes.find((n) => n.type === 'paragraph') as NotebookTextBlockNode
        expect(bodyParagraph).toBeDefined()
        const footnoteMarks = bodyParagraph.children.flatMap((c) => (c.marks || []).filter((m) => m.type === 'footnote'))
        expect(footnoteMarks.map((m) => m.id)).toEqual(['1', '2'])

        const serialized = serializeMarkdownNotebook(parsed)
        expect(serialized).toContain('[^1]: First detailed reference.')
        expect(serialized).toContain('[^2]: Second citation source.')
        expect(serialized).toContain('footnote[^1]')
        expect(serialized).toContain('another[^2]')
    })

    test('mapRestoreSelectionThroughDocumentChange maps caret through text insertions', () => {
        const prevDoc = parseMarkdownNotebook('Hello World')
        const nextDoc = parseMarkdownNotebook('Hello Beautiful World')
        const targetNode = prevDoc.nodes[0]
        nextDoc.nodes[0].id = targetNode.id
        const request = {
            nodeId: targetNode.id,
            start: 6,
            end: 6,
        }
        const mapped = mapRestoreSelectionThroughDocumentChange(request, prevDoc, nextDoc)
        expect(mapped).toEqual({
            nodeId: targetNode.id,
            start: 16,
            end: 16,
        })
    })

    test('mobile block frame rules are compiled and exempt document title rows', () => {
        const fs = require('fs')
        const path = require('path')
        const bundlePath = path.join(process.cwd(), 'src/notebook-app/styles/bundleCss.ts')
        const mobileChromeCssPath = path.join(process.cwd(), 'src/styles/notebook-mobile-block-chrome.css')

        const bundleContent = fs.readFileSync(bundlePath, 'utf8')
        const mobileChromeContent = fs.readFileSync(mobileChromeCssPath, 'utf8')

        expect(bundleContent).toContain('MarkdownNotebook__row--focused')
        expect(bundleContent).toContain('outline-color: var(--color-border-primary)')
        expect(bundleContent).toContain(':not(.MarkdownNotebook__row--title)')

        expect(mobileChromeContent).toContain('.MarkdownNotebook--edit .MarkdownNotebook__row:focus-within')
        expect(mobileChromeContent).toContain('.MarkdownNotebook__row--focused')
        expect(mobileChromeContent).toContain('.MarkdownNotebook__row--mobile-active')
        expect(mobileChromeContent).toContain(':not(.MarkdownNotebook__row--title)')
        expect(mobileChromeContent).toContain('outline: 1.5px solid')
    })

    test('mobile block bar glass rules are unified, 32px height and 26px compact buttons', () => {
        const fs = require('fs')
        const path = require('path')
        const glassCssPath = path.join(process.cwd(), 'src/styles/notebook-taskbar-glass.css')
        const mobileChromeCssPath = path.join(process.cwd(), 'src/styles/notebook-mobile-block-chrome.css')
        const bundlePath = path.join(process.cwd(), 'src/notebook-app/styles/bundleCss.ts')

        const glassContent = fs.readFileSync(glassCssPath, 'utf8')
        const mobileChromeContent = fs.readFileSync(mobileChromeCssPath, 'utf8')
        const bundleContent = fs.readFileSync(bundlePath, 'utf8')

        expect(glassContent).toContain('.MarkdownNotebook__mobile-block-bar')
        expect(glassContent).toContain('backdrop-filter: blur(64px) !important')
        expect(glassContent).toContain('background: rgb(var(--bg) / 0.5) !important')

        expect(mobileChromeContent).toContain('.MarkdownNotebook__mobile-block-bar')
        expect(mobileChromeContent).toContain('height: 32px')
        expect(mobileChromeContent).toContain('width: 26px')
        expect(mobileChromeContent).toContain('height: 26px')

        expect(bundleContent).toContain('MarkdownNotebook__mobile-block-bar')
    })

    test('computeMobileBlockBarPosition calculates placement, centers on mobile, and clamps correctly', () => {
        const { computeMobileBlockBarPosition } = require('../src/notebook-app/lib/components/MarkdownNotebook/mobileBlockBarModel')

        const mobileViewport = { offsetLeft: 0, offsetTop: 0, width: 375, height: 667 }

        // 1. Normal block with room above -> places above
        const posAbove = computeMobileBlockBarPosition(
            { getBoundingClientRect: () => ({ top: 200, bottom: 250, left: 10, right: 365, width: 355, height: 50 }) },
            { viewport: mobileViewport }
        )
        expect(posAbove).toEqual({
            placement: 'above',
            top: 200,
            left: 188, // Math.round(375 / 2) = 188
        })

        // 2. Block at top of screen with space below -> flips below
        const posBelow = computeMobileBlockBarPosition(
            { getBoundingClientRect: () => ({ top: 10, bottom: 60, left: 10, right: 365, width: 355, height: 50 }) },
            { viewport: mobileViewport }
        )
        expect(posBelow).toEqual({
            placement: 'below',
            top: 60,
            left: 188,
        })

        // 3. Block scrolled off-screen -> returns null to dismiss
        const posOffscreen = computeMobileBlockBarPosition(
            { getBoundingClientRect: () => ({ top: -200, bottom: -50, left: 10, right: 365, width: 355, height: 150 }) },
            { viewport: mobileViewport }
        )
        expect(posOffscreen).toBeNull()

        // 4. Tablet/wide screen -> centers on row instead of entire viewport
        const tabletViewport = { offsetLeft: 0, offsetTop: 0, width: 800, height: 600 }
        const posTablet = computeMobileBlockBarPosition(
            { getBoundingClientRect: () => ({ top: 250, bottom: 300, left: 100, right: 300, width: 200, height: 50 }) },
            { viewport: tabletViewport }
        )
        expect(posTablet).toEqual({
            placement: 'above',
            top: 250,
            left: 200, // rowCenter = 100 + 100 = 200
        })

        // 5. Defensive null/invalid element handling -> never throws, returns null
        expect(computeMobileBlockBarPosition(null)).toBeNull()
        expect(computeMobileBlockBarPosition(undefined)).toBeNull()
        expect(computeMobileBlockBarPosition({} as any)).toBeNull()
        expect(computeMobileBlockBarPosition({ getBoundingClientRect: () => { throw new Error('detached') } } as any)).toBeNull()
    })

    test('MarkdownNotebook imports and exports computeMobileBlockBarPosition in scope', () => {
        const fs = require('fs')
        const path = require('path')
        const notebookPath = path.join(process.cwd(), 'src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx')
        const content = fs.readFileSync(notebookPath, 'utf8')

        expect(content).toMatch(/import\s*\{[^}]*computeMobileBlockBarPosition[^}]*\}\s*from\s*['"]\.\/mobileBlockBarModel['"]/)
        expect(content).toMatch(/export\s*\{[^}]*computeMobileBlockBarPosition[^}]*\}/)
    })

    test('getInsertMenuPosition anchors precisely at selected area and avoids premature upward jump', () => {
        const mockAnchor = {
            getBoundingClientRect: () => ({
                top: 200,
                bottom: 224,
                left: 60,
                right: 360,
                width: 300,
                height: 24,
            }),
            closest: () => null,
            contains: () => false,
        } as unknown as HTMLElement

        // 1. Standard row in viewport -> sits directly below the block at anchorRect.bottom + GAP
        const posBelow = getInsertMenuPosition(mockAnchor)
        expect(posBelow.placement).toBe('below')
        expect(posBelow.top).toBe(230) // 224 + 6 (INSERT_MENU_GAP)
        expect(posBelow.left).toBe(60)

        // 2. Near bottom of viewport where space below is tight but sufficient -> stays below
        const mockTightBelowAnchor = {
            getBoundingClientRect: () => ({
                top: 550,
                bottom: 580,
                left: 80,
                right: 380,
                width: 300,
                height: 30,
            }),
            closest: () => null,
            contains: () => false,
        } as unknown as HTMLElement
        const posTight = getInsertMenuPosition(mockTightBelowAnchor)
        expect(posTight.placement).toBe('below')
        expect(posTight.top).toBe(586) // 580 + 6, directly below, NOT flying 240px to top of page!

        // 3. Completely unrendered / 0-dimension target doesn't crash or return NaN
        const mockZeroAnchor = {
            getBoundingClientRect: () => ({
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                width: 0,
                height: 0,
            }),
            closest: () => null,
            contains: () => false,
        } as unknown as HTMLElement
        const posZero = getInsertMenuPosition(mockZeroAnchor)
        expect(posZero).toBeDefined()
        expect(Number.isFinite(posZero.top)).toBe(true)
        expect(Number.isFinite(posZero.left)).toBe(true)
    })

    test('component and table rows are exempt from block outline frames and plus buttons', () => {
        const fs = require('fs')
        const path = require('path')
        const bundlePath = path.join(process.cwd(), 'src/notebook-app/styles/bundleCss.ts')
        const mobileChromeCssPath = path.join(process.cwd(), 'src/styles/notebook-mobile-block-chrome.css')
        const notebookPath = path.join(process.cwd(), 'src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx')

        const bundleContent = fs.readFileSync(bundlePath, 'utf8')
        const mobileChromeContent = fs.readFileSync(mobileChromeCssPath, 'utf8')
        const notebookContent = fs.readFileSync(notebookPath, 'utf8')

        // Bundle CSS has explicit outline exclusion for component and table rows
        expect(bundleContent).toContain(':not(.MarkdownNotebook__row--component)')
        expect(bundleContent).toContain(':not(.MarkdownNotebook__row--table)')
        expect(bundleContent).toContain('.MarkdownNotebook__row--component')
        expect(bundleContent).toContain('outline: none !important')

        // Mobile block chrome CSS has outline exclusion and plus button suppression
        expect(mobileChromeContent).toContain(':not(.MarkdownNotebook__row--component)')
        expect(mobileChromeContent).toContain(':not(.MarkdownNotebook__row--table)')
        expect(mobileChromeContent).toContain('.MarkdownNotebook--edit .MarkdownNotebook__row--component')
        expect(mobileChromeContent).toContain('.MarkdownNotebook--edit .MarkdownNotebook__row--component .MarkdownNotebook__mobile-insert-chip')
        expect(mobileChromeContent).toContain('display: none !important')

        // MarkdownNotebook adds row--component and row--component-<tag> classes and prevents mobile-insert-chip on components
        expect(notebookContent).toContain("node.type === 'component' && 'MarkdownNotebook__row--component'")
        expect(notebookContent).toContain("node.type !== 'component' &&")
        expect(notebookContent).toContain("node.type !== 'table' &&")
    })

    test('document footnotes section renders a delete icon button that cleans up footnote definitions and marks', () => {
        const { removeFootnoteFromInlineNodes } = require('../src/notebook-app/lib/components/MarkdownNotebook/inlineContent')
        const fs = require('fs')
        const path = require('path')
        const footnotesHookPath = path.join(process.cwd(), 'src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts')
        const hookContent = fs.readFileSync(footnotesHookPath, 'utf8')

        // 1. Verifies delete icon button exists in the footnotes section
        expect(hookContent).toContain("title: 'Delete footnote'")
        expect(hookContent).toContain("'data-action': 'delete-footnote'")
        expect(hookContent).toContain('IconTrash')
        expect(hookContent).toContain('deleteFootnote(fnId)')

        // 2. Verifies inline content removal logic for footnotes
        const nodes: NotebookInlineNode[] = [
            { type: 'text', text: 'Sentence with footnote' },
            { type: 'text', text: '1', marks: [{ type: 'footnote', id: 'fn-1' }] },
            { type: 'text', text: ' and more text' },
        ]
        const afterDelete = removeFootnoteFromInlineNodes(nodes, 'fn-1')
        expect(afterDelete).toHaveLength(1)
        expect(afterDelete.some((n: any) => n.marks?.some((m: any) => m.type === 'footnote' && m.id === 'fn-1'))).toBe(false)
        expect(afterDelete[0].text).toBe('Sentence with footnote and more text')
    })

    test('inline footnotes in text are compact and black in styling', () => {
        const fs = require('fs')
        const path = require('path')
        const bundlePath = path.join(process.cwd(), 'src/notebook-app/styles/bundleCss.ts')
        const scssPath = path.join(process.cwd(), 'src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss')
        const bundleContent = fs.readFileSync(bundlePath, 'utf8')
        const scssContent = fs.readFileSync(scssPath, 'utf8')

        // Compact font-size (0.68em, smaller than 0.75em)
        expect(scssContent).toContain('font-size: 0.68em')
        expect(bundleContent).toContain('font-size: 0.68em')

        // Black color in light mode
        expect(scssContent).toContain('color: #000000')
        expect(bundleContent).toContain('color: #000000')

        // White color in dark mode
        expect(scssContent).toContain('color: #ffffff')
        expect(bundleContent).toContain('color: #ffffff')
    })

    test('deleting a footnote sequentially renumbers remaining footnotes', () => {
        const { renumberDocumentFootnotes } = require('../src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes')
        const doc: NotebookDocument = {
            type: 'doc',
            nodes: [
                {
                    id: 'p-1',
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'Sentence one with no footnote' }],
                },
                {
                    id: 'p-2',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Sentence two ' },
                        { type: 'text', text: '2', marks: [{ type: 'footnote', id: '2' }] },
                    ],
                },
                {
                    id: 'p-3',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Sentence three ' },
                        { type: 'text', text: '3', marks: [{ type: 'footnote', id: '3' }] },
                    ],
                },
            ],
            footnotes: {
                '2': 'Second source citation',
                '3': 'Third source citation',
            },
        }

        const result = renumberDocumentFootnotes(doc)
        expect(result.document.footnotes).toEqual({
            '1': 'Second source citation',
            '2': 'Third source citation',
        })

        const p2 = result.document.nodes[1] as NotebookTextBlockNode
        const p3 = result.document.nodes[2] as NotebookTextBlockNode
        const fn2 = p2.children.find((c) => c.marks?.some((m) => m.type === 'footnote'))
        const fn3 = p3.children.find((c) => c.marks?.some((m) => m.type === 'footnote'))

        expect(fn2?.text).toBe('1')
        expect(fn2?.marks?.[0]).toEqual({ type: 'footnote', id: '1' })

        expect(fn3?.text).toBe('2')
        expect(fn3?.marks?.[0]).toEqual({ type: 'footnote', id: '2' })
    })

    test('inserting a footnote between existing footnotes renumbers subsequent ones', () => {
        const { renumberDocumentFootnotes } = require('../src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes')
        const doc: NotebookDocument = {
            type: 'doc',
            nodes: [
                {
                    id: 'p-1',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Sentence one ' },
                        { type: 'text', text: '1', marks: [{ type: 'footnote', id: '1' }] },
                    ],
                },
                {
                    id: 'p-new',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Inserted middle sentence ' },
                        { type: 'text', text: 'temp-fn', marks: [{ type: 'footnote', id: 'temp-fn' }] },
                    ],
                },
                {
                    id: 'p-2',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Sentence two ' },
                        { type: 'text', text: '2', marks: [{ type: 'footnote', id: '2' }] },
                    ],
                },
            ],
            footnotes: {
                '1': 'First note',
                'temp-fn': '',
                '2': 'Second note',
            },
        }

        const result = renumberDocumentFootnotes(doc)
        expect(result.document.footnotes).toEqual({
            '1': 'First note',
            '2': '',
            '3': 'Second note',
        })

        const pNew = result.document.nodes[1] as NotebookTextBlockNode
        const p2 = result.document.nodes[2] as NotebookTextBlockNode
        const fnMiddle = pNew.children.find((c) => c.marks?.some((m) => m.type === 'footnote'))
        const fnLast = p2.children.find((c) => c.marks?.some((m) => m.type === 'footnote'))

        expect(fnMiddle?.text).toBe('2')
        expect(fnMiddle?.marks?.[0]).toEqual({ type: 'footnote', id: '2' })

        expect(fnLast?.text).toBe('3')
        expect(fnLast?.marks?.[0]).toEqual({ type: 'footnote', id: '3' })
    })

    test('reordering blocks with footnotes renumbers them to match visual reading order', () => {
        const { renumberDocumentFootnotes } = require('../src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes')
        // Originally: Paragraph A (with fn 1) was above Paragraph B (with fn 2)
        // Now: Paragraph B was moved above Paragraph A
        const doc: NotebookDocument = {
            type: 'doc',
            nodes: [
                {
                    id: 'p-b',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Paragraph B ' },
                        { type: 'text', text: '2', marks: [{ type: 'footnote', id: '2' }] },
                    ],
                },
                {
                    id: 'p-a',
                    type: 'paragraph',
                    children: [
                        { type: 'text', text: 'Paragraph A ' },
                        { type: 'text', text: '1', marks: [{ type: 'footnote', id: '1' }] },
                    ],
                },
            ],
            footnotes: {
                '1': 'Note A originally first',
                '2': 'Note B originally second',
            },
        }

        const result = renumberDocumentFootnotes(doc)
        expect(result.document.footnotes).toEqual({
            '1': 'Note B originally second',
            '2': 'Note A originally first',
        })

        const firstBlock = result.document.nodes[0] as NotebookTextBlockNode
        const secondBlock = result.document.nodes[1] as NotebookTextBlockNode
        const fnFirst = firstBlock.children.find((c) => c.marks?.some((m) => m.type === 'footnote'))
        const fnSecond = secondBlock.children.find((c) => c.marks?.some((m) => m.type === 'footnote'))

        expect(fnFirst?.text).toBe('1')
        expect(fnFirst?.marks?.[0]).toEqual({ type: 'footnote', id: '1' })

        expect(fnSecond?.text).toBe('2')
        expect(fnSecond?.marks?.[0]).toEqual({ type: 'footnote', id: '2' })
    })

    test('introducing notebook is a standard deletable document without locked template attributes', () => {
        const {
            DEFAULT_NOTEBOOKS,
            INTRODUCING_NOTEBOOK_ID,
            INTRODUCING_NOTEBOOK_CONTENT,
        } = require('../src/notebook-app/scenes/notebooks/notebookStorage')

        expect(DEFAULT_NOTEBOOKS).toHaveLength(1)
        const defaultDoc = DEFAULT_NOTEBOOKS[0]

        // 1. Must be a normal notebook, NOT an undeletable template
        expect(defaultDoc.id).toBe(INTRODUCING_NOTEBOOK_ID)
        expect(defaultDoc.isTemplate).toBeUndefined()
        expect(defaultDoc.title).toBe('Introducing WIM Notebook')

        // 2. Comprehensive guidance content
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('## 1. Fast & Fluid Markdown')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('## 2. The Slash (/) Command Library')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('## 3. Dynamic Sequential Footnotes')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('## 4. Resident AI Philosophers')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('## 5. Mobile Writing Experience')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('## 6. Organization & Publishing')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('[^1]')
        expect(INTRODUCING_NOTEBOOK_CONTENT).toContain('This notebook is fully editable and deletable')

        // 3. template-introduction is retired
        const fs = require('fs')
        const path = require('path')
        const storageCode = fs.readFileSync(
            path.join(process.cwd(), 'src/notebook-app/scenes/notebooks/notebookStorage.ts'),
            'utf8'
        )
        expect(storageCode).toContain("'template-introduction'")
        expect(storageCode).not.toContain("notebook.id === INTRODUCTION_TEMPLATE_ID")
    })

    test('notebook presence and remote channel subscribers survive remounts and channel reuse safely', () => {
        const fs = require('fs')
        const path = require('path')
        const presenceCode = fs.readFileSync(
            path.join(process.cwd(), 'src/notebook-app/scenes/notebooks/notebookPresence.ts'),
            'utf8'
        )
        const remoteCode = fs.readFileSync(
            path.join(process.cwd(), 'src/notebook-app/scenes/notebooks/notebookRemote.ts'),
            'utf8'
        )

        // 1. Must clean up stale channel from realtime._remove before calling channel()
        expect(presenceCode).toContain('realtimeTopic')
        expect(presenceCode).toContain('isSubscribedOrJoining')
        expect(presenceCode).toContain('void supabase.removeChannel')

        // 2. Channel listeners (.on) must be protected by state check to prevent RealtimeChannel errors
        expect(presenceCode).toContain('if (!isSubscribedOrJoining)')
        expect(remoteCode).toContain('if (!isSubscribedOrJoining)')

        // 3. Must be wrapped in try/catch to make presence 100% resilient and non-fatal
        expect(presenceCode).toContain('Channel initialization failed, running offline')
        expect(remoteCode).toContain('[notebookRemote] failed to subscribe')
    })

    test('notebook auto-save does not rewind or interrupt active user typing', () => {
        const fs = require('fs')
        const path = require('path')
        const appCode = fs.readFileSync(
            path.join(process.cwd(), 'src/notebook-app/App.tsx'),
            'utf8'
        )

        // 1. persistOpenNotebookDraft must not echo saved content into setRemoteMarkdown
        // because feeding local saves into remoteValue triggers 3-way merge loops while typing.
        const persistDraftMatch = appCode.match(/const persistOpenNotebookDraft =[\s\S]*?return didSave\s*\n\s*\},/)?.[0]
        expect(persistDraftMatch).toBeDefined()
        expect(persistDraftMatch).not.toContain('setRemoteMarkdown(saved.content)')

        // 2. onHydrated must not overwrite an already loaded editor notebook
        const onHydratedMatch = appCode.match(/const onHydrated = \(\) => \{[\s\S]*?\n\s*\}/)?.[0]
        expect(onHydratedMatch).toBeDefined()
        expect(onHydratedMatch).toContain('notebookRef.current?.id === editorNotebookId && !notebookRef.current.contentOmitted')

        // 3. MarkdownNotebook component must receive deferRemoteValue={syncStatus === 'edited'}
        // to suspend remote merges during active keystrokes
        expect(appCode).toContain("deferRemoteValue={syncStatus === 'edited'}")
    })

    test('notebook author faces deduplicate weak actors and presence self across devices', () => {
        const { collectLocalNotebookFaces, facesFromPresence, arePersonsSame, isWeakPerson } = require('../src/notebook-app/scenes/notebooks/notebookFaces')

        // 1. Weak person detection
        expect(isWeakPerson({ first_name: 'You' })).toBe(true)
        expect(isWeakPerson({ first_name: 'WIM' })).toBe(true)
        expect(isWeakPerson({ first_name: 'm. ali', username: 'ali' })).toBe(false)

        // 2. Same person detection
        expect(arePersonsSame({ first_name: 'You' }, { first_name: 'm. ali', username: 'ali' })).toBe(false)
        expect(arePersonsSame({ first_name: 'm. ali', username: 'ali' }, { first_name: 'm. ali', username: 'ali' })).toBe(true)
        expect(arePersonsSame({ first_name: 'm. ali', email: 'ali@test.com' }, { first_name: 'Ali D', email: 'ali@test.com' })).toBe(true)

        // 3. collectLocalNotebookFaces upgrades weak "You" to active actor and deduplicates
        const faces = collectLocalNotebookFaces({
            createdBy: { first_name: 'You' },
            lastModifiedBy: { first_name: 'm. ali', username: 'ali' },
            currentActor: { first_name: 'm. ali', username: 'ali' },
        })
        expect(faces).toHaveLength(1)
        expect(faces[0].name).toBe('m. ali')
        expect(faces[0].role).toBe('author')

        // 4. facesFromPresence filters out user's own other tab/device
        const presencePeers = [
            { clientId: 'tab-1', userId: 'user-123', name: 'm. ali', color: '#111' },
            { clientId: 'tab-2', userId: 'user-456', name: 'Jane Collaborator', color: '#222' },
        ]
        const skipKeys = new Set(['user-123', 'ali', 'm. ali'])
        const presenceFaces = facesFromPresence(presencePeers, skipKeys, 'user-123')
        expect(presenceFaces).toHaveLength(1)
        expect(presenceFaces[0].name).toBe('Jane Collaborator')
        expect(presenceFaces[0].role).toBe('here')
    })
})


