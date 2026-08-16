import React, { useState, useEffect, Component, useCallback, useRef } from 'react'
import {
    MarkdownNotebook,
    type MarkdownNotebookAskAIRequest,
} from './lib/components/MarkdownNotebook/MarkdownNotebook'
import { replaceNotebookAIResponseMarkdown } from './lib/components/MarkdownNotebook/notebookAI'
import { LemonButton, LemonInput, LemonTag, LemonBanner } from '~nb-lib/lemon-ui/index'
import { ArrowLeft } from 'lucide-react'
import { buildExtraInsertCommands } from './scenes/notebooks/extraInsertCommands.tsx'
import { WIM_HIDDEN_INSERT_COMMAND_KEYS } from './scenes/notebooks/hiddenInsertCommands'
import { SELECTION_AI_ACTIONS } from './scenes/notebooks/selectionAI'
import { PHILOSOPHER_BOTS } from './lib/philosophers'
import {
    StoredNotebook,
    getNotebooks,
    getNotebook,
    saveNotebook,
    createNotebook,
    deleteNotebook,
    duplicateNotebook,
    publishNotebook,
    backfillNotebookActors,
    retryNotebookRemoteSync,
    WIM_NOTEBOOKS_HYDRATED_EVENT,
    WIM_NOTEBOOK_SYNC_EVENT,
    type NotebookSyncEventDetail,
} from './scenes/notebooks/notebookStorage'
import { useNotebookConfirm } from './scenes/notebooks/NotebookConfirmDialog'
import { NotebookPublicRoute } from './scenes/notebooks/NotebookPublicView'
import { NotebooksListScene } from './scenes/notebooks/NotebooksListScene'
import { TemplatesGallery } from './scenes/notebooks/TemplatesGallery'
import { NotebookCanvasScene } from './scenes/notebooks/NotebookCanvasScene'
import { NotebookMenu } from './scenes/notebooks/NotebookMenu'
import { NotebookShareModal, type NotebookShareTab } from './scenes/notebooks/NotebookShareModal'
import { NotebookHistory } from './scenes/notebooks/NotebookHistory'
import { NotebookSyncInfo, NotebookExpandButton } from './scenes/notebooks/NotebookMeta'
import { CommandPaletteModal } from './scenes/notebooks/CommandPaletteModal'
import { CollaboratorsBanner } from './scenes/notebooks/CollaboratorsBanner'
import { SidebarContextPanelMenu } from './scenes/notebooks/SidebarContextPanelMenu'
import { AskAIDropdown } from './scenes/notebooks/AskAI'
import { NotebookOutline } from './scenes/notebooks/NotebookOutline'
import { useSiteThemeSync } from './lib/useSiteThemeSync'
import { useUser } from '../hooks/useUser'
import { setNotebookActor, userToNotebookActor } from '../lib/notebook-actor'
import { ensureLemonStyles, releaseLemonStyles } from '../lib/lemon/ensureLemonStyles'
import { useAppActions, useAppSettings, useAppWindows } from '../context/App'
import { bindNotebookChat } from '../lib/notebook-chat-bind'
import { openAskAiWindow } from '../lib/open-ask-ai-window'

// ---- Error Boundary ----
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  override componentDidCatch(error: Error, errorInfo: any) {
    console.error('App ErrorBoundary caught:', error, errorInfo)
  }
  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#ffeef0', color: '#900', fontFamily: 'monospace' }}>
          <h2>Runtime Component Error:</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre style={{ marginTop: '1rem', color: '#666' }}>{(this.state.error as any)?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Hash Router ----
type Route =
  | { page: 'list' }
  | { page: 'templates' }
  | { page: 'canvas' }
  | { page: 'editor'; notebookId: string }
  | { page: 'public'; notebookId: string }

function parseHash(hash: string): Route {
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search)
    const queryId = params.get('id') || params.get('notebookId')
    if (queryId) {
      return { page: 'editor', notebookId: queryId }
    }
  }

  const h = hash.replace(/^#\/?/, '')
  if (h.startsWith('notebook/')) {
    return { page: 'editor', notebookId: h.replace('notebook/', '') }
  }
  // Public read view: #/n/:short_id
  if (h.startsWith('n/')) {
    return { page: 'public', notebookId: h.replace(/^n\//, '') }
  }
  if (h === 'canvas') return { page: 'canvas' }
  if (h === 'templates') return { page: 'templates' }
  return { page: 'list' }
}

function useHashRouter(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((newRoute: Route) => {
    let hash = '#/'
    if (newRoute.page === 'editor') hash = `#/notebook/${newRoute.notebookId}`
    else if (newRoute.page === 'public') hash = `#/n/${newRoute.notebookId}`
    else if (newRoute.page === 'canvas') hash = '#/canvas'
    else if (newRoute.page === 'templates') hash = '#/templates'
    window.location.hash = hash
  }, [])

  return [route, navigate]
}

// ---- App ----
export function App() {
  const [route, navigate] = useHashRouter()
  // Host Display options light/dark → notebook shell (Lemon components untouched)
  const hostTheme = useSiteThemeSync()

  // Shared site-wide Lemon CSS inject (same as <LemonScope> on other pages)
  useEffect(() => {
    ensureLemonStyles()
    return () => {
      releaseLemonStyles()
    }
  }, [])

  // Mirror host Display options theme for shell + themeLogic (does not remount Lemon CSS)
  useEffect(() => {
    document.documentElement.dataset.notebookHostTheme = hostTheme
    return () => {
      delete document.documentElement.dataset.notebookHostTheme
    }
  }, [hostTheme])

  // Editor state
  const [currentNotebook, setCurrentNotebook] = useState<StoredNotebook | null>(null)
  const [markdown, setMarkdown] = useState('')
  const [title, setTitle] = useState('')
  const [markdownVersion, setMarkdownVersion] = useState(0)
  const [aiPromptRequest, setAiPromptRequest] = useState<number | undefined>(undefined)
  const [syncStatus, setSyncStatus] = useState<'saved' | 'edited' | 'local' | 'error' | 'offline'>('local')
  const [cloudMessage, setCloudMessage] = useState<string | undefined>(undefined)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTab, setShareTab] = useState<NotebookShareTab>('private')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [isAskAIBusy, setIsAskAIBusy] = useState(false)
  const askAIAbortRef = useRef(0)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandPalette((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const appActions = useAppActions()
  const { windows } = useAppWindows()
  const { isMobile } = useAppSettings()

  const openAskAi = useCallback(() => {
    if (currentNotebook) {
      bindNotebookChat({ notebookId: currentNotebook.id, title: currentNotebook.title })
    }
    openAskAiWindow({
      notebookId: currentNotebook?.id,
      notebookTitle: currentNotebook?.title,
      windows,
      isMobile,
      addWindow: appActions.addWindow,
      updateWindow: appActions.updateWindow,
      snapWindow: appActions.handleSnapToSide,
    })
  }, [appActions, currentNotebook, isMobile, windows])
  const { user } = useUser()
  const { confirm, dialog: confirmDialog } = useNotebookConfirm()

  useEffect(() => {
    setNotebookActor(userToNotebookActor(user))
    backfillNotebookActors()
  }, [user])

  useEffect(() => {
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<NotebookSyncEventDetail>).detail
      if (!detail) return
      setCloudMessage(detail.message)
      if (detail.status === 'ok') {
        setSyncStatus((prev) => (prev === 'edited' ? prev : 'saved'))
        return
      }
      setSyncStatus((prev) => (prev === 'edited' ? prev : detail.status))
    }
    window.addEventListener(WIM_NOTEBOOK_SYNC_EVENT, onSync)
    return () => window.removeEventListener(WIM_NOTEBOOK_SYNC_EVENT, onSync)
  }, [])

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>
      if (customEvent.detail?.prompt && appActions?.openNewChat) {
        appActions.openNewChat({ initialQuestion: customEvent.detail.prompt })
      }
    }
    window.addEventListener('wimOpenGlobalChat', handleOpenChat)
    return () => window.removeEventListener('wimOpenGlobalChat', handleOpenChat)
  }, [appActions])

  /** Inline / selection AI: fills Thinking… placeholder via philosopher bots. */
  const handleNotebookAskAI = useCallback(async (request: MarkdownNotebookAskAIRequest) => {
    const requestId = ++askAIAbortRef.current
    setIsAskAIBusy(true)
    const defaultBot = PHILOSOPHER_BOTS[0]?.id || 'socrates'

    const applyReply = (reply: string) => {
      if (requestId !== askAIAbortRef.current) return
      try {
        const result = replaceNotebookAIResponseMarkdown(
          request.markdownWithResponse,
          request.responseNodeIndex,
          reply.trim(),
          1
        )
        setMarkdown(result.markdown)
        setMarkdownVersion((v) => v + 1)
      } catch (err) {
        console.warn('[notebook AI] failed to apply reply', err)
      }
    }

    try {
      let res = await fetch('/api/bots/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          bot: defaultBot,
          question: request.query,
          mood: 'calm',
           taskType: 'community_reply',
          thinkingDepth: 'standard',
        }),
      })

      if (res.status === 404 || res.status === 405) {
        res = await fetch('/api/philosopher-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            philosopher: defaultBot,
            question: request.query,
            mood: 'calm',
             taskType: 'community_reply',
            thinkingDepth: 'standard',
          }),
        })
      }

      let data: any = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      const reply =
        (typeof data?.reply === 'string' && data.reply.trim()) ||
        (typeof data?.error === 'string' && data.error) ||
        (res.ok ? 'No reply returned. Try again.' : `Request failed (${res.status}).`)

      applyReply(reply)
    } catch (error) {
      console.warn('[notebook AI] request failed', error)
      applyReply('The philosopher network is unreachable right now. Please try again.')
    } finally {
      if (requestId === askAIAbortRef.current) {
        setIsAskAIBusy(false)
      }
    }
  }, [])

  // Load notebook when route changes to editor. Never fall back to another notebook.
  useEffect(() => {
    if (route.page !== 'editor') return

    const apply = (nb: StoredNotebook) => {
      setCurrentNotebook(nb)
      setMarkdown(nb.content)
      setTitle(nb.title)
      setSyncStatus('saved')
      setShowHistory(false)
      setShowAIModal(false)
    }

    const nb = getNotebook(route.notebookId)
    if (nb) {
      apply(nb)
      return
    }
    setCurrentNotebook(null)

    const onHydrated = () => {
      const remote = getNotebook(route.notebookId)
      if (remote) apply(remote)
    }
    window.addEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, onHydrated)
    return () => window.removeEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, onHydrated)
  }, [route])

  // Auto-save with debounce (snapshots throttled inside saveNotebook)
  useEffect(() => {
    if (!currentNotebook || route.page !== 'editor') return
    const dirty = markdown !== currentNotebook.content || title !== currentNotebook.title
    if (!dirty) {
      setSyncStatus('saved')
      return
    }
    setSyncStatus('edited')
    const timer = setTimeout(() => {
      const saved = saveNotebook({ ...currentNotebook, title, content: markdown })
      setCurrentNotebook(saved)
      setSyncStatus('saved')
    }, 800)
    return () => clearTimeout(timer)
  }, [markdown, title]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = useCallback(
    (meta: {
      title?: string
      subtitle?: string
      coverImage?: string
      category?: string
      tags?: string
      isPublished?: boolean
    }) => {
      if (!currentNotebook) return
      const tags = meta.tags
        ? meta.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
        : undefined
      const saved = publishNotebook(currentNotebook.id, {
        publicTitle: meta.title || title,
        subtitle: meta.subtitle,
        coverUrl: meta.coverImage,
        category: meta.category,
        tags,
        isPublished: Boolean(meta.isPublished),
      })
      if (saved) {
        setCurrentNotebook(saved)
        setTitle(saved.title)
        setSyncStatus('saved')
      }
    },
    [currentNotebook, title]
  )

  const handleCreateNew = () => {
    const nb = createNotebook()
    navigate({ page: 'editor', notebookId: nb.id })
  }

  const handleSelectNotebook = (id: string) => {
    navigate({ page: 'editor', notebookId: id })
  }

  const handleSelectTemplate = (template: StoredNotebook) => {
    const nb = createNotebook(template.title, template.content)
    navigate({ page: 'editor', notebookId: nb.id })
  }

  const handleDuplicate = () => {
    if (!currentNotebook) return
    const dup = duplicateNotebook(currentNotebook.id)
    if (dup) navigate({ page: 'editor', notebookId: dup.id })
  }

  const handleDelete = async () => {
    if (!currentNotebook) return
    const ok = await confirm({
      title: `Delete “${currentNotebook.title}”?`,
      description: 'This removes the notebook from this device and from cloud sync.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deleteNotebook(currentNotebook.id)
    navigate({ page: 'list' })
  }

  const handleInsertAIResponse = useCallback((aiContent?: string, mode: 'append' | 'replace' | 'prepend' = 'append') => {
    const text = (aiContent || '').trim()
    if (!text) return
    setMarkdown((prev) => {
      const current = prev || ''
      if (mode === 'replace') {
        return text + '\n'
      }
      if (mode === 'prepend') {
        return text + '\n\n' + current
      }
      return current.trim() ? current.trim() + '\n\n' + text + '\n' : text + '\n'
    })
    setMarkdownVersion((v) => v + 1)
  }, [])

  const routeRef = useRef(route)
  const notebookRef = useRef(currentNotebook)
  const markdownRef = useRef(markdown)
  useEffect(() => {
    routeRef.current = route
  }, [route])
  useEffect(() => {
    notebookRef.current = currentNotebook
  }, [currentNotebook])
  useEffect(() => {
    markdownRef.current = markdown
  }, [markdown])

  useEffect(() => {
    const handleInsertText = (e: Event) => {
      const customEvent = e as CustomEvent<{
        text: string
        mode?: 'append' | 'replace' | 'prepend'
        notebookId?: string
      }>
      const text = (customEvent.detail?.text || '').trim()
      const mode = customEvent.detail?.mode || 'append'
      if (!text) return

      let target = notebookRef.current
      if (customEvent.detail?.notebookId) {
        const bound = getNotebook(customEvent.detail.notebookId)
        if (bound) target = bound
      }
      if (routeRef.current.page !== 'editor' || !target) {
        const recent = getNotebooks().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]
        target = recent || target
        if (target) navigate({ page: 'editor', notebookId: target.id })
      }
      if (!target) return

      const current =
        routeRef.current.page === 'editor' && notebookRef.current?.id === target.id
          ? markdownRef.current || target.content || ''
          : target.content || ''
      const next =
        mode === 'replace'
          ? `${text}\n`
          : mode === 'prepend'
            ? `${text}\n\n${current}`
            : current.trim()
              ? `${current.trim()}\n\n${text}\n`
              : `${text}\n`

      setCurrentNotebook(target)
      setTitle(target.title)
      setMarkdown(next)
      setMarkdownVersion((value) => value + 1)
      saveNotebook({ ...target, content: next }, { snapshot: true, snapshotLabel: 'Inserted artifact' })
    }
    window.addEventListener('wimNotebookInsertText', handleInsertText)
    return () => window.removeEventListener('wimNotebookInsertText', handleInsertText)
  }, [navigate])

  const handleHistoryRestored = useCallback(
    (payload: { content: string; title: string }) => {
      setMarkdown(payload.content)
      setTitle(payload.title)
      setMarkdownVersion((v) => v + 1)
      const nb = getNotebook(currentNotebook?.id || '')
      if (nb) setCurrentNotebook(nb)
      setSyncStatus('saved')
    },
    [currentNotebook?.id]
  )

  const handleHistorySnapshotNow = useCallback(() => {
    if (!currentNotebook) return
    const saved = saveNotebook(
      { ...currentNotebook, title, content: markdown },
      { snapshot: true, snapshotLabel: 'Manual snapshot' }
    )
    setCurrentNotebook(saved)
    setSyncStatus('saved')
  }, [currentNotebook, title, markdown])

  const handleCanvasSave = (id: string) => {
    navigate({ page: 'editor', notebookId: id })
  }

  const extraCommands = useCallback(
    (api?: any) =>
      buildExtraInsertCommands(api),
    []
  )

  // Shell matches standalone posthog-notebook-app.
  // `notebook-app-scope` on THIS root only (never body) so site OS chrome is not affected.
  // Host light/dark → .dark so index tokens (--bg-3000 etc.) resolve.
  return (
    <div
      className={`App notebook-app-scope min-h-full h-auto text-[var(--text-3000,#1d1f27)] ${
        route.page === 'public' ? 'bg-transparent' : 'bg-[var(--bg-3000,#f3f4f5)]'
      } ${hostTheme === 'dark' ? 'dark' : ''}`}
      theme={hostTheme}
      data-lemon-scope
      data-host-theme={hostTheme}
    >
      {/* ===== Main Content Area matching PostHog Notebook SceneContent ===== */}
      {/* pb so last lines aren't clipped under window edge when scrolling */}
      <main
        className={
          route.page === 'public'
            ? 'p-3 sm:p-6 lg:p-8 pb-16 max-w-[1400px] mx-auto bg-transparent'
            : 'p-3 sm:p-6 lg:p-8 pb-16 sm:pb-20 max-w-[1400px] mx-auto space-y-4 sm:space-y-6'
        }
      >
        <ErrorBoundary>
          {/* ---------- Public notebook (read-only share link) ---------- */}
          {route.page === 'public' && (
            <NotebookPublicRoute
              notebookId={route.notebookId}
              onBack={() => navigate({ page: 'list' })}
              onOpenEditor={(id) => navigate({ page: 'editor', notebookId: id })}
            />
          )}

          {/* ---------- Notebooks List (Default Entry Scene) ---------- */}
          {route.page === 'list' && (
            <NotebooksListScene
              onSelectNotebook={handleSelectNotebook}
              onCreateNew={handleCreateNew}
            />
          )}

          {/* ---------- Templates Gallery ---------- */}
          {route.page === 'templates' && (
            <TemplatesGallery onSelectTemplate={handleSelectTemplate} />
          )}

          {/* ---------- Canvas Scene ---------- */}
          {route.page === 'canvas' && (
            <NotebookCanvasScene onSaveAsNotebook={handleCanvasSave} />
          )}

          {/* ---------- Notebook Editor Scene (100% matched to PostHog NotebookScene.tsx) ---------- */}
          {route.page === 'editor' && (
            currentNotebook ? (
              <div className={`Notebook ${isExpanded ? 'Notebook--expanded' : 'Notebook--compact'}`}>
                {/* Template Banner if template */}
                {currentNotebook.isTemplate && (
                  <LemonBanner
                    type="info"
                    action={{
                      onClick: handleDuplicate,
                      children: 'Create copy',
                    }}
                    className="mb-6"
                  >
                    <b>This is a template.</b> You can create a copy of it to edit and use as your own.
                  </LemonBanner>
                )}

                {/* Top Action Bar matching PostHog's NotebookScene.tsx */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-10">
                  <div className="flex gap-3 items-center">
                    <LemonButton
                      type="stealth"
                      size="small"
                      icon={<ArrowLeft className="w-4 h-4" />}
                      onClick={() => navigate({ page: 'list' })}
                      tooltip="Back to notebooks"
                    />
                    {currentNotebook.isTemplate && <LemonTag type="highlight">TEMPLATE</LemonTag>}
                    <CollaboratorsBanner
                      person={
                        currentNotebook.last_modified_by ||
                        currentNotebook.created_by ||
                        userToNotebookActor(user)
                      }
                      updatedAt={currentNotebook.updatedAt}
                      syncStatus={syncStatus}
                      notebookId={currentNotebook.id}
                    />
                    <span className="text-muted opacity-30 hidden sm:inline">•</span>
                    <div className="hidden sm:block">
                      <NotebookSyncInfo
                        syncStatus={syncStatus}
                        message={cloudMessage}
                        onRetry={retryNotebookRemoteSync}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 items-center">
                    <AskAIDropdown
                      onInsertPromptBlock={handleInsertAIResponse}
                      currentNotebookContent={currentNotebook.content}
                      notebookId={currentNotebook.id}
                      notebookTitle={currentNotebook.title}
                    />
                    <NotebookMenu
                      notebookId={currentNotebook.id}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onShowHistory={() => setShowHistory(!showHistory)}
                      onShare={(tab) => {
                        setShareTab(tab || 'private')
                        setShowShareModal(true)
                      }}
                    />
                    <NotebookExpandButton
                      isExpanded={isExpanded}
                      onToggleExpand={() => setIsExpanded(!isExpanded)}
                    />
                    <SidebarContextPanelMenu
                      onOpenShare={(tab) => {
                        setShareTab(tab || 'publish')
                        setShowShareModal(true)
                      }}
                    />
                  </div>
                </div>

                {/* Main editor + outline */}
                <div className="w-full min-h-[600px] pt-4 sm:pt-6 mt-4 sm:mt-6 flex gap-6 items-start">
                  <div className="flex-1 min-w-0" ref={editorContainerRef}>
                    <LemonInput
                      value={title}
                      onChange={setTitle}
                      className="text-2xl sm:text-3xl font-bold border-none shadow-none focus:outline-none p-0 mb-8 sm:mb-10 bg-transparent w-full"
                      placeholder="Untitled Notebook..."
                    />

                    <MarkdownNotebook
                      key={`${currentNotebook.id}-${markdownVersion}`}
                      value={markdown}
                      focusAIPromptRequest={aiPromptRequest}
                      onChange={(val) => setMarkdown(val)}
                      onAskAI={handleNotebookAskAI}
                      isAskAIDisabled={isAskAIBusy}
                      extraInsertCommands={extraCommands}
                      hiddenInsertCommandKeys={WIM_HIDDEN_INSERT_COMMAND_KEYS}
                      selectionAIActions={SELECTION_AI_ACTIONS}
                    />
                  </div>

                  <NotebookOutline markdown={markdown} containerRef={editorContainerRef} />
                </div>

                {/* History Drawer Panel */}
                {showHistory && (
                  <NotebookHistory
                    notebookId={currentNotebook.id}
                    isOpen={showHistory}
                    currentContent={markdown}
                    currentTitle={title}
                    onSnapshotNow={handleHistorySnapshotNow}
                    onRestored={handleHistoryRestored}
                    onClose={() => setShowHistory(false)}
                  />
                )}

                {/* Share Modal */}
                <NotebookShareModal
                  isOpen={showShareModal}
                  onClose={() => setShowShareModal(false)}
                  notebookId={currentNotebook.id}
                  notebookTitle={currentNotebook.title}
                  initialTab={shareTab}
                  onPublish={handlePublish}
                />

              </div>
            ) : (
              <div className="p-12 text-center text-muted space-y-4">
                <p className="text-lg">Notebook not found ({route.notebookId})</p>
                <LemonButton type="primary" onClick={() => navigate({ page: 'list' })}>
                  Back to notebooks
                </LemonButton>
              </div>
            )
          )}
        </ErrorBoundary>

        {/* Global Command Palette Modal (Cmd + K) */}
        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onSelectNotebook={handleSelectNotebook}
          onCreateNew={handleCreateNew}
          onOpenTemplates={() => navigate({ page: 'templates' })}
          onOpenAI={openAskAi}
        />
        {confirmDialog}
      </main>
    </div>
  )
}

export default App
