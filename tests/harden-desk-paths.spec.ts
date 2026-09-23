import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const root = process.cwd()

test.describe('HARDEN desk / WIM AI / notebook path locks', () => {
  test('host web search passes client AbortSignal (Stop reaches Tavily/Brave)', async () => {
    const src = fs.readFileSync(path.join(root, 'src/lib/bots/orchestrate.ts'), 'utf-8')
    expect(src).toContain('searchWebSources(searchQuery, runtimeEnv, input.abortSignal)')
    expect(src).toContain("err.name === 'AbortError'")
    expect(src).toContain(
      'Abort before finish so held public tokens are not flushed after Stop mid host-search.'
    )
  })

  test('agentMode + notebook bind push remote for dual-device rehydrate', async () => {
    const src = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    const modeStart = src.indexOf('const handleAgentModeChange')
    expect(modeStart).toBeGreaterThan(-1)
    const modeFn = src.slice(modeStart, modeStart + 800)
    expect(modeFn).toContain('pushChatToRemote(chat)')

    expect(src).toContain('// Persist notebook_id so cold open / other device can rehydrate the bind.')
    expect(src).toContain('void pushChatToRemote(boundChat)')
  })

  test('wallpaper cycle paints chrome + data-wallpaper synchronously', async () => {
    const app = fs.readFileSync(path.join(root, 'src/context/App.tsx'), 'utf-8')
    expect(app).toContain('applyWallpaperBrowserChrome({')
    expect(app).toContain("document.documentElement.setAttribute('data-wallpaper', wallpaper)")
    expect(app).toContain("document.body.setAttribute('data-wallpaper', wallpaper)")

    const spot = fs.readFileSync(path.join(root, 'src/components/SpotlightSearch/actions.tsx'), 'utf-8')
    expect(spot).toContain("from '../../lib/wallpaperChrome'")
    expect(spot).toContain('applyWallpaperBrowserChrome({')

    const wall = fs.readFileSync(path.join(root, 'src/components/Desktop/Wallpapers.tsx'), 'utf-8')
    expect(wall).not.toMatch(/PLACEHOLDER/)
    expect(wall).toContain('const SCENES')
    expect(wall).toContain('hogzilla')
    expect(wall).toContain('keyboard-mint')
  })

  test('notebook OS dispatch stays fail-closed on missing listener', async () => {
    const dispatch = fs.readFileSync(path.join(root, 'src/lib/notebook-os-dispatch.ts'), 'utf-8')
    expect(dispatch).toContain('fail-closed')
    expect(dispatch).toContain('resolve(false)')
    const chat = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    expect(chat).toContain('failClosedNotebookMount')
  })
})
