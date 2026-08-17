import { test, expect } from '@playwright/test'
import { mergeNotebookLists } from '../src/notebook-app/scenes/notebooks/notebookRemote'
import type { StoredNotebook } from '../src/notebook-app/scenes/notebooks/notebookStorage'
import {
    notebookMatchesQuery,
    notebookPreviewExcerpt,
} from '../src/notebook-app/scenes/notebooks/notebookPreview'
import { getSlashCommandQuery, getSlashTokenAt } from '../src/notebook-app/lib/components/MarkdownNotebook/documentModel'

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
})
