import { test, expect } from '@playwright/test'
import { findAskAiWindow, findNotebookWindow, isAskAiPath, windowSlot } from '../src/lib/open-ask-ai-window'

test.describe('ask AI window', () => {
    test('recognizes the workspace-chat path', () => {
        expect(isAskAiPath('/workspace-chat')).toBe(true)
        expect(isAskAiPath('/notebooks')).toBe(false)
    })

    test('finds ask-ai and notebook windows', () => {
        const windows = [
            { key: 'nb', path: '/notebooks?id=1', minimized: false },
            { key: 'ask-ai', path: '/workspace-chat', minimized: false },
        ] as any
        expect(findAskAiWindow(windows)?.key).toBe('ask-ai')
        expect(findNotebookWindow(windows)?.key).toBe('nb')
        expect(windowSlot(windows[0])).toBe('notebook')
        expect(windowSlot(windows[1])).toBe('ask-ai')
    })
})
