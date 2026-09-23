// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function memoryStorage(): Storage {
    const map = new Map<string, string>()
    return {
        get length() {
            return map.size
        },
        clear() {
            map.clear()
        },
        getItem(key: string) {
            return map.has(key) ? (map.get(key) as string) : null
        },
        key() {
            return null
        },
        removeItem(key: string) {
            map.delete(key)
        },
        setItem(key: string, value: string) {
            map.set(key, value)
        },
    }
}

function installWindow() {
    const localStorage = memoryStorage()
    const sessionStorage = memoryStorage()
    const listeners = new Map<string, Set<(event: Event) => void>>()
    ;(globalThis as { window?: unknown }).window = {
        localStorage,
        sessionStorage,
        dispatchEvent(event: Event) {
            listeners.get(event.type)?.forEach((fn) => fn(event))
            return true
        },
        addEventListener(type: string, fn: (event: Event) => void) {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type)!.add(fn)
        },
        removeEventListener(type: string, fn: (event: Event) => void) {
            listeners.get(type)?.delete(fn)
        },
    }
    return { localStorage, sessionStorage }
}

describe('workspace-local owner namespace', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('stores projects/settings under owner-namespaced keys', async () => {
        const { localStorage } = installWindow()
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const mod = await import('./workspace-local')
        const projects = [
            {
                id: 'proj-1',
                name: 'Secret',
                description: 'd',
                systemPrompt: 'You are Alice private coach',
                iconName: 'folder',
                color: '#000',
                chatCount: 0,
                createdAt: '2026-01-01',
            },
        ]
        mod.writeLocalProjects(projects)
        mod.writeLocalSettings({ ...mod.getDefaultWorkspaceSettings(), defaultModel: 'nietzsche' })
        expect(localStorage.getItem('claude_workspace_projects_v7')).toBeNull()
        expect(localStorage.getItem('claude_workspace_settings')).toBeNull()
        expect(localStorage.getItem(mod.getProjectLsKey())).toContain('Alice private coach')
        expect(localStorage.getItem(mod.getSettingsLsKey())).toContain('nietzsche')
        expect(mod.readLocalProjects()).toEqual(projects)
    })

    it('does not migrate legacy global projects into a signed-in account', async () => {
        const { localStorage } = installWindow()
        localStorage.setItem(
            'claude_workspace_projects_v7',
            JSON.stringify([
                {
                    id: 'proj-leak',
                    name: 'Prev',
                    description: '',
                    systemPrompt: 'LEAK',
                    iconName: 'folder',
                    color: '#000',
                    chatCount: 0,
                    createdAt: '2026-01-01',
                },
            ])
        )
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const mod = await import('./workspace-local')
        expect(mod.readLocalProjects([])).toEqual([])
        expect(localStorage.getItem(mod.getProjectLsKey())).toBeNull()
    })

    it('clears draft leftovers when identity owner changes', async () => {
        const { localStorage, sessionStorage } = installWindow()
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const mod = await import('./workspace-local')
        const { WIM_IDENTITY_EVENT } = await import('./wim-identity')
        mod.syncWorkspaceLocalForIdentity()
        localStorage.setItem(mod.WIM_AI_DRAFT_PROMPT_KEY, 'draft from alice')
        sessionStorage.setItem(mod.WIM_FORUM_DRAFT_KEY, JSON.stringify({ subject: 'x', body: 'y' }))

        localStorage.removeItem('wim_auth_user_id')
        window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
        expect(localStorage.getItem(mod.WIM_AI_DRAFT_PROMPT_KEY)).toBeNull()
        expect(sessionStorage.getItem(mod.WIM_FORUM_DRAFT_KEY)).toBeNull()
    })
})
