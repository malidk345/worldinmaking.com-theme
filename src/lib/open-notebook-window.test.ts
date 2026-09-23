// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { openNotebookWindow } from './open-notebook-window'
import type { AppWindow } from '../context/Window'

function windowRow(partial: Partial<AppWindow> & Pick<AppWindow, 'key' | 'path'>): AppWindow {
    return partial as AppWindow
}

describe('openNotebookWindow', () => {
    it('focuses an already-open notebook through addWindow so z-index and minimized are applied', () => {
        const addWindow = vi.fn()
        const updateWindow = vi.fn()
        openNotebookWindow({
            notebookId: 'nb1',
            notebookTitle: 'Note',
            windows: [windowRow({ key: 'notebook-nb1', path: '/notebooks/nb1', title: 'Old', minimized: true })],
            addWindow,
            updateWindow,
            mark: 'mention',
        })
        expect(updateWindow).not.toHaveBeenCalled()
        expect(addWindow).toHaveBeenCalledWith({
            key: 'notebook-nb1',
            path: '/notebooks/nb1?mark=mention',
            title: 'Note',
        })
    })

    it('opens a new notebook window when none is registered', () => {
        const addWindow = vi.fn()
        openNotebookWindow({
            notebookId: 'nb2',
            windows: [],
            addWindow,
            updateWindow: vi.fn(),
        })
        expect(addWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                key: 'notebook-nb2',
                path: '/notebooks/nb2',
            })
        )
    })
})
