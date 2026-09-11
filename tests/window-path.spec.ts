import { test, expect } from '@playwright/test'
import {
    parseNotebookRoute,
    notebookPathForRoute,
    seedNotebookHistory,
    planNotebookHistoryPush,
    notebookHistoryFlags,
} from '../src/lib/notebook-route'
import {
    canonicalWindowPath,
    extractNotebookId,
    extractPublicNotebookId,
    isArtifactWindowPath,
    isHomeWindowPath,
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
        expect(repairWindowPath('/notebooks', '/notebooks/nb-1')).toBe('/notebooks')
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
        expect(isPathRoutedWindow('/pricing')).toBe(true)
        expect(isPathRoutedWindow('/home')).toBe(true)
        expect(isPathRoutedWindow('/account')).toBe(true)
    })

    test('home window path is the guest landing, not other apps', () => {
        expect(isHomeWindowPath('/home')).toBe(true)
        expect(isHomeWindowPath('/home/')).toBe(true)
        expect(isHomeWindowPath('/')).toBe(true)
        expect(isHomeWindowPath('/desktop')).toBe(true)
        expect(isHomeWindowPath('/posts')).toBe(false)
        expect(isHomeWindowPath('/notebooks')).toBe(false)
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
        expect(extractNotebookId('/notebooks/invite/abc')).toBeNull()
        expect(parseNotebookRoute('/notebooks/nb-1', '', '?mark=mention')).toEqual({
            page: 'editor',
            notebookId: 'nb-1',
            mark: 'mention',
        })
        expect(parseNotebookRoute('/notebooks/nb-1?mark=comment')).toEqual({
            page: 'editor',
            notebookId: 'nb-1',
            mark: 'comment',
        })
        expect(notebookPathForRoute({ page: 'editor', notebookId: 'nb-1', mark: 'mention' })).toBe(
            '/notebooks/nb-1?mark=mention'
        )
        expect(canonicalWindowPath('/notebooks/nb-1?mark=mention')).toBe('/notebooks/nb-1?mark=mention')
        expect(notebookWindowPath('nb-1', 'mention')).toBe('/notebooks/nb-1?mark=mention')
        expect(parseNotebookRoute('/notebooks/invite/abc')).toEqual({ page: 'invite', token: 'abc' })
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
        expect(repairWindowPath('/notebooks', '/notebooks/n/abc')).toBe('/notebooks')
    })

    test('notebook chrome history seeds the list behind an editor', () => {
        expect(seedNotebookHistory('/notebooks')).toEqual({ stack: ['/notebooks'], index: 0 })
        expect(seedNotebookHistory('/notebooks/nb-1')).toEqual({
            stack: ['/notebooks', '/notebooks/nb-1'],
            index: 1,
        })
        expect(notebookHistoryFlags(seedNotebookHistory('/notebooks/nb-1'))).toEqual({
            canGoBack: true,
            canGoForward: false,
        })
        const opened = planNotebookHistoryPush(seedNotebookHistory('/notebooks'), '/notebooks/nb-1')
        expect(opened).toEqual({ stack: ['/notebooks', '/notebooks/nb-1'], index: 1 })
        const back = { ...opened, index: 0 }
        expect(notebookHistoryFlags(back)).toEqual({ canGoBack: false, canGoForward: true })
        expect(planNotebookHistoryPush(back, '/notebooks/nb-1')).toEqual({
            stack: ['/notebooks', '/notebooks/nb-1'],
            index: 1,
        })
        expect(planNotebookHistoryPush(opened, '/notebooks/nb-2').stack).toEqual([
            '/notebooks',
            '/notebooks/nb-1',
            '/notebooks/nb-2',
        ])
    })
})
