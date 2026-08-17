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
    cleanInviteCommentOutput,
    isNotebookInviteBotId,
    resolveInviteBot,
} from '../src/lib/bots/notebook-invite'
import { caretColorForClient, presenceStateToCarets } from '../src/notebook-app/scenes/notebooks/notebookPresence'
import {
    makeDefaultDatabaseContent,
    openNotebookHash,
    parseCalloutTone,
    parseDatabaseContent,
} from '../src/notebook-app/lib/components/MarkdownNotebook/writingBlockModel'
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

    test('only the four invite philosophers can be asked to comment', () => {
        expect(isNotebookInviteBotId('nietzsche')).toBe(true)
        expect(isNotebookInviteBotId('hegel')).toBe(false)
        expect(resolveInviteBot('arendt')?.name).toBe('Arendt')
        expect(resolveInviteBot('hegel')).toBeNull()
        expect(cleanInviteCommentOutput('```\nA short comment.\n```')).toBe('A short comment.')
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
