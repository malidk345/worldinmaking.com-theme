import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const root = process.cwd()

test.describe('HARDEN desk / WIM AI / notebook path locks', () => {
  test('host web search passes client AbortSignal (Stop reaches Tavily/Brave)', async () => {
    const src = fs.readFileSync(path.join(root, 'src/lib/bots/orchestrate.ts'), 'utf-8')
    expect(src).toContain('searchWebSources(searchQuery, runtimeEnv, input.abortSignal, { readPages: true })')
    expect(src).toContain("err.name === 'AbortError'")
    expect(src).toContain(
      'Abort before finish so held public tokens are not flushed after Stop mid host-search.'
    )
  })

  test('gateway-fallback aborts before demux.finish (held tokens not flushed after Stop)', async () => {
    const src = fs.readFileSync(path.join(root, 'src/lib/bots/orchestrate.ts'), 'utf-8')
    const marker =
      'Abort before finish so held public tokens are not flushed after Stop mid gateway-fallback stream'
    const markerIdx = src.indexOf(marker)
    expect(markerIdx).toBeGreaterThan(-1)
    const finishIdx = src.indexOf('demux.finish(onToken, (thinkingChunk) => onThinkingChunk?.(thinkingChunk))', markerIdx)
    expect(finishIdx).toBeGreaterThan(markerIdx)
    const abortReturnIdx = src.indexOf("error: 'aborted'", markerIdx)
    expect(abortReturnIdx).toBeGreaterThan(markerIdx)
    expect(abortReturnIdx).toBeLessThan(finishIdx)
    expect(src).toContain("attempts: ['client aborted during gateway stream']")
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

  test('parallel web_search shares in-flight promise (cache TOCTOU)', async () => {
    const src = fs.readFileSync(path.join(root, 'src/lib/bots/tools/pipeline.ts'), 'utf-8')
    expect(src).toContain('searchInflight: Map<string, Promise<ToolExecution>>')
    expect(src).toContain('export function shareInflight')
    expect(src).toContain('shareInflight(state.searchInflight, key,')
    expect(src).toContain('Parallel identical queries in one ACT: share the in-flight fetch')
  })

  test('notebook OS dispatch stays fail-closed on missing listener', async () => {
    const dispatch = fs.readFileSync(path.join(root, 'src/lib/notebook-os-dispatch.ts'), 'utf-8')
    expect(dispatch).toContain('fail-closed')
    expect(dispatch).toContain('resolve(false)')
    const chat = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    expect(chat).toContain('failClosedNotebookMount')
  })

  test('ChatMessage memo covers errorKind/qualityGate + index updateAssistantMessage', async () => {
    const msg = fs.readFileSync(
      path.join(root, 'src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx'),
      'utf-8'
    )
    expect(msg).toContain('React.memo(ChatMessageComponent')
    expect(msg).toContain('prev.message.errorKind === next.message.errorKind')
    expect(msg).toContain('prev.message.qualityGate === next.message.qualityGate')
    expect(msg).toContain('prev.message.attachments === next.message.attachments')
    expect(msg).toContain('prev.typewriterSpeed === next.typewriterSpeed')

    const src = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    const start = src.indexOf('const updateAssistantMessage = (chatId: string, msgId: string, patch: Partial<Message>)')
    expect(start).toBeGreaterThan(-1)
    const block = src.slice(start, start + 2400)
    expect(block).toContain('prev.findIndex((c) => c.id === chatId)')
    expect(block).toContain('chat.messages.findIndex((m) => m.id === msgId)')
    expect(block).toContain('nextMessages[msgIdx] = nextMsg')
    expect(block).toContain('nextMsg.errorKind === prevMsg.errorKind')
    expect(block).toContain('return prev')
    // Must not reintroduce full chats.map for this helper.
    expect(block).not.toContain('prev.map((c) =>')
  })

  test('ChatInput memo + rAF token coalesce + todo_write activePlan remote push', async () => {
    const input = fs.readFileSync(
      path.join(root, 'src/components/ClaudeWorkspaceChat/components/ChatInput.tsx'),
      'utf-8'
    )
    expect(input).toContain('React.memo(ChatInputComponent, chatInputPropsEqual)')
    expect(input).toContain('prev.isStreaming === next.isStreaming')
    expect(input).toContain('prev.draftNonce === next.draftNonce')

    const src = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    expect(src).toContain('scheduleStreamingTokenPaint')
    expect(src).toContain('requestAnimationFrame(paintStreamingTokens)')
    expect(src).toContain('accumulatedContent.length < 40')
    expect(src).toContain('cancelTokenFlushRaf')
    expect(src).toContain('pendingHumanTurnMessage')
    // Stream-time ChatInput no longer allocates reverse().find every render.
    expect(src).toContain('pendingHumanTurn={pendingHumanTurn}')

    const todoStart = src.indexOf("parsed.tool.name === 'todo_write' && parsed.tool.status === 'done'")
    expect(todoStart).toBeGreaterThan(-1)
    const todoBlock = src.slice(todoStart, todoStart + 900)
    expect(todoBlock).toContain('activePlan: row.tasks')
    expect(todoBlock).toContain('void pushChatToRemote(chat)')
    expect(todoBlock).toContain('updatedAt: new Date().toISOString()')
  })

  test('Sidebar memo + MessageList handler hoist + onContinue presence + stable handleNewChat', async () => {
    const sidebar = fs.readFileSync(
      path.join(root, 'src/components/ClaudeWorkspaceChat/components/Sidebar.tsx'),
      'utf-8'
    )
    expect(sidebar).toContain('export const Sidebar = React.memo(SidebarComponent')
    expect(sidebar).toContain('prev.chats.length !== next.chats.length')
    expect(sidebar).toContain('a.id !== b.id || a.title !== b.title')
    expect(sidebar).toContain('const ChatItem = React.memo(ChatItemComponent')

    const msg = fs.readFileSync(
      path.join(root, 'src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx'),
      'utf-8'
    )
    expect(msg).toContain('Boolean(prev.onContinue) === Boolean(next.onContinue)')
    expect(msg).toContain('Handler identity is intentionally ignored')

    const src = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    expect(src).toContain('const handleNewChat = useCallback((projId?: string) => {')
    expect(src).toContain('stream paint tore down/rebound window keydown')
    expect(src).toContain('continueHandlerForMessages')
    expect(src).toContain('if (pendingHumanTurn) return undefined')
    expect(src).toContain('handleOpenArtifactFromMessage')
    expect(src).toContain('onContinue={continueHandlerForMessages}')
    expect(src).toContain('onOpenArtifact={handleOpenArtifactFromMessage}')
    // Must not reintroduce per-row Continue arrows in the map.
    const mapStart = src.indexOf('{activeChat.messages.map((msg) => (')
    expect(mapStart).toBeGreaterThan(-1)
    const mapBlock = src.slice(mapStart, mapStart + 1200)
    expect(mapBlock).not.toContain("void handleSendMessage('Continue.', [])")
    expect(mapBlock).not.toContain('onOpenByok={() => setSidebarOpen(true)}')
  })


  test('ThinkingBlock memo + EMPTY thinking + stable handleStopStreaming', async () => {
    const msg = fs.readFileSync(
      path.join(root, 'src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx'),
      'utf-8'
    )
    expect(msg).toContain('EMPTY_THINKING_PROCESS')
    expect(msg).toContain('thinking={message.thinkingProcess || EMPTY_THINKING_PROCESS}')
    // Must not reintroduce per-paint empty thinking literal (defeats ThinkingBlock memo).
    expect(msg).not.toMatch(/thinking=\{\s*message\.thinkingProcess \|\| \{/)

    const thinking = fs.readFileSync(
      path.join(root, 'src/components/ClaudeWorkspaceChat/components/ThinkingBlock.tsx'),
      'utf-8'
    )
    expect(thinking).toContain('React.memo(ThinkingBlockComponent, (prev, next) =>')
    expect(thinking).toContain('Parent stream paints allocate new onStop')
    expect(thinking).toContain('prev.thinking === next.thinking')
    expect(thinking).toContain('prev.livePhase === next.livePhase')

    const src = fs.readFileSync(path.join(root, 'src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    expect(src).toContain('const handleStopStreaming = useCallback(() => {')
    expect(src).toContain('chatsRef.current.find((c) => c.id === chatId)')
    expect(src).toContain('activeChatIdRef.current')
    expect(src).toContain(
      '[isSourcesOpen, isArtifactsOpen, searchModalOpen, isStreaming, handleNewChat, handleStopStreaming]'
    )
  })


})
