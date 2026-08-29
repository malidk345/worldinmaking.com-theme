import { test, expect } from '@playwright/test'
import { parseNotebookRoute, notebookPathForRoute } from '../src/lib/notebook-route'
import {
    canonicalWindowPath,
    extractNotebookId,
    extractPublicNotebookId,
    isArtifactWindowPath,
    isPathRoutedWindow,
    isPlaceholderPath,
    notebookPublicPath,
    notebookWindowPath,
    repairWindowPath,
    stripPathNoise,
} from '../src/lib/window-path'

test.describe('window path', () => {
    test('strips query and trailing slash', () => {
        expect(stripPathNoise('/posts/foo/?x=1#h')).toBe('/posts/foo')
        expect(isPlaceholderPath('/posts/[slug]')).toBe(true)
        expect(isPlaceholderPath('/posts/hello-world')).toBe(false)
    })

    test('repair maps listing/placeholder to the live detail URL', () => {
        expect(repairWindowPath('/posts/[slug]', '/posts/hello-world')).toBe('/posts/hello-world')
        expect(repairWindowPath('/posts', '/posts/hello-world')).toBe('/posts/hello-world')
        expect(repairWindowPath('/questions', '/questions/42')).toBe('/questions/42')
        expect(repairWindowPath('/notebooks', '/notebooks/nb-1')).toBe('/notebooks/nb-1')
        expect(repairWindowPath('/posts/kept', '/posts/other')).toBe('/posts/kept')
    })

    test('artifact preview windows are recognized by path', () => {
        expect(isArtifactWindowPath('/artifact/art-1')).toBe(true)
        expect(isArtifactWindowPath('/artifact')).toBe(true)
        expect(isArtifactWindowPath('/notebooks')).toBe(false)
    })

    test('canonical path is a clean pathname', () => {
        expect(canonicalWindowPath('/questions/99/?a=1')).toBe('/questions/99')
        expect(isPathRoutedWindow('/workspace-chat')).toBe(true)
    })

    test('desktop-pinned notebooks keep their id instead of collapsing to the list', () => {
        expect(extractNotebookId('/notebooks?id=nb-1')).toBe('nb-1')
        expect(extractNotebookId('/notebooks?notebookId=nb-1')).toBe('nb-1')
        expect(extractNotebookId('/notebooks/nb-1')).toBe('nb-1')
        expect(extractNotebookId('/notebooks')).toBeNull()
        expect(extractNotebookId('/notebooks/templates')).toBeNull()
        expect(canonicalWindowPath('/notebooks?id=nb-1')).toBe('/notebooks/nb-1')
        expect(notebookWindowPath('nb-1')).toBe('/notebooks/nb-1')
        expect(isPathRoutedWindow('/notebooks/nb-1')).toBe(true)
        expect(parseNotebookRoute('/notebooks', '', '?id=nb-1')).toEqual({
            page: 'editor',
            notebookId: 'nb-1',
        })
        expect(parseNotebookRoute('/notebooks', '#/notebook/nb-1', '')).toEqual({
            page: 'editor',
            notebookId: 'nb-1',
        })
        expect(parseNotebookRoute('/notebooks', '', '')).toEqual({ page: 'list' })
        expect(notebookPathForRoute({ page: 'editor', notebookId: 'nb-1' })).toBe('/notebooks/nb-1')
    })

    test('published notebook links open the public reader, not the editor list', () => {
        expect(extractPublicNotebookId('/notebooks#/n/abc')).toBe('abc')
        expect(extractPublicNotebookId('/notebooks/n/abc')).toBe('abc')
        expect(extractNotebookId('/notebooks/n/abc')).toBeNull()
        expect(canonicalWindowPath('/notebooks#/n/abc')).toBe('/notebooks/n/abc')
        expect(canonicalWindowPath('/notebooks/n/abc')).toBe('/notebooks/n/abc')
        expect(notebookPublicPath('abc')).toBe('/notebooks/n/abc')
        expect(parseNotebookRoute('/notebooks/n/abc')).toEqual({ page: 'public', notebookId: 'abc' })
        expect(parseNotebookRoute('/notebooks#/n/abc')).toEqual({ page: 'public', notebookId: 'abc' })
        expect(notebookPathForRoute({ page: 'public', notebookId: 'abc' })).toBe('/notebooks/n/abc')
        expect(repairWindowPath('/notebooks', '/notebooks/n/abc')).toBe('/notebooks/n/abc')
    })
})
