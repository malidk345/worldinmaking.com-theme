import React, { useState, useEffect, Component, useCallback, useRef } from 'react'
import {
    MarkdownNotebook,
    type MarkdownNotebookAskAIRequest,
} from './lib/components/MarkdownNotebook/MarkdownNotebook'
import { planOpenNotebookRemoteApply } from './scenes/notebooks/notebookRemote'
import { useNotebookPresence } from './scenes/notebooks/notebookPresence'
import {
    replaceInlineRangeInMarkdown,
    replaceNotebookAIResponseMarkdown,
} from './lib/components/MarkdownNotebook/notebookAI'
import { LemonButton, LemonInput, LemonTag, LemonBanner } from '~nb-lib/lemon-ui/index'
import { ArrowLeft } from 'lucide-react'
import { buildExtraInsertCommands } from './scenes/notebooks/extraInsertCommands.tsx'
import { WIM_HIDDEN_INSERT_COMMAND_KEYS } from './scenes/notebooks/hiddenInsertCommands'
import { SELECTION_AI_ACTIONS } from './scenes/notebooks/selectionAI'
import { playInlineEditorMarkdown } from './lib/wimai-typewriter'
import { notebookExcerptForEditor } from '../lib/bots/wimai-editor'
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
    WIM_NOTEBOOKS_CHANGED_EVENT,
    WIM_NOTEBOOKS_HYDRATED_EVENT,
    WIM_NOTEBOOK_SYNC_EVENT,
    type NotebookSyncEventDetail,
} from './scenes/notebooks/notebookStorage'

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
import { getNotebookActor, setNotebookActor, userToNotebookActor } from '../lib/notebook-actor'
import { isNotebookImageFile, uploadNotebookImage } from '../lib/notebook-upload'
import { uuid } from './lib/utils/dom'
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
        <div className="p-8 max-w-xl mx-auto text-center space-y-3">
          <h2 className="m-0 text-lg font-semibold">This notebook view hit an error</h2>
          <p className="m-0 text-sm text-muted">The rest of the desktop is fine. Reload the window to try again.</p>
          <pre className="m-0 text-left text-xs overflow-auto p-3 rounded-lg bg-surface-secondary text-secondary">
            {this.state.error?.toString()}
          </pre>
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
  const [remoteMarkdown, setRemoteMarkdown] = useState('')
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
  const presence = useNotebookPresence({
    notebookId: route.page === 'editor' ? currentNotebook?.id : undefined,
    version: currentNotebook?.version,
    actor: userToNotebookActor(user) || getNotebookActor(),
  })


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

  /** Slash / rewrite: isolated WIM AI editor. Never opens chat or a philosopher. */
  const handleNotebookAskAI = useCallback(async (request: MarkdownNotebookAskAIRequest) => {
    const requestId = ++askAIAbortRef.current
    setIsAskAIBusy(true)

    const applyStatic = (reply: string) => {
      if (requestId !== askAIAbortRef.current) return
      try {
        if (request.apply === 'inline') {
          const start = request.selectionStart ?? 0
          const end = request.selectionEnd ?? start + (request.selectedMarkdown?.length ?? 0)
          setMarkdown(
            replaceInlineRangeInMarkdown(
              request.markdownWithResponse,
              request.responseNodeIndex,
              start,
              end,
              reply.trim(),
              request.listItemIndex
            )
          )
          return
        }
        const result = replaceNotebookAIResponseMarkdown(
          request.markdownWithResponse,
          request.responseNodeIndex,
          reply.trim(),
          1
        )
        setMarkdown(result.markdown)
      } catch (err) {
        console.warn('[notebook editor] failed to apply reply', err)
      }
    }

    try {
      const instruction = (request.instruction || request.query || '').trim()
      const res = await fetch('/api/notebook/inline-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          selection: request.selectedMarkdown || '',
          notebook: notebookExcerptForEditor(request.markdownWithResponse, request.responseMarker),
        }),
      })

      let data: { ok?: boolean; markdown?: string; error?: string } | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      const reply =
        (typeof data?.markdown === 'string' && data.markdown.trim()) ||
        (typeof data?.error === 'string' && data.error) ||
        (res.ok ? 'No edit returned. Try again.' : `Request failed (${res.status}).`)

      if (requestId !== askAIAbortRef.current) return

      if (!data?.ok || !data.markdown?.trim() || request.apply === 'inline') {
        applyStatic(reply)
        return reply
      }

      await playInlineEditorMarkdown({
        baseMarkdown: request.markdownWithResponse,
        responseNodeIndex: request.responseNodeIndex,
        fullText: data.markdown,
        isCancelled: () => requestId !== askAIAbortRef.current,
        onFrame: (nextMarkdown) => {
          if (requestId !== askAIAbortRef.current) return
          setMarkdown(nextMarkdown)
        },
      })
      return reply
    } catch (error) {
      console.warn('[notebook editor] request failed', error)
      applyStatic('The editor is unreachable right now. Please try again.')
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
      setRemoteMarkdown(nb.content)
      setTitle(nb.title)
      setSyncStatus('saved')
      setShowHistory(false)
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

  useEffect(() => {
    if (route.page !== 'editor' || !currentNotebook) return
    const applyRemoteIfNewer = () => {
      const latest = getNotebook(currentNotebook.id)
      if (!latest) {
        return
      }
      const plan = planOpenNotebookRemoteApply({
        current: currentNotebook,
        latest,
        draftContent: markdown,
        draftTitle: title,
      })
      if (!plan.adopt) return
      setCurrentNotebook(latest)
      setRemoteMarkdown(latest.content)
      if (plan.applyContent) setMarkdown(latest.content)
      if (plan.applyTitle) setTitle(latest.title)
      if (plan.applyContent && plan.applyTitle) setSyncStatus('saved')
    }
    window.addEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, applyRemoteIfNewer)
    window.addEventListener(WIM_NOTEBOOKS_CHANGED_EVENT, applyRemoteIfNewer)
    return () => {
      window.removeEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, applyRemoteIfNewer)
      window.removeEventListener(WIM_NOTEBOOKS_CHANGED_EVENT, applyRemoteIfNewer)
    }
  }, [route.page, currentNotebook, markdown, title])

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

  const handleDelete = () => {
    if (!currentNotebook) return
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

  const convertExternalDataTransferToNodes = useCallback(async (dataTransfer: DataTransfer) => {
    const files = Array.from(dataTransfer.files || []).filter(isNotebookImageFile)
    if (!files.length) return null
    const nodes = []
    for (const file of files) {
      try {
        const uploaded = await uploadNotebookImage(file)
        nodes.push({
          id: uuid(),
          type: 'component' as const,
          tagName: 'Image',
          props: { src: uploaded.url, alt: file.name.replace(/\.[^.]+$/, '') },
        })
      } catch {
        /* skip failed files */
      }
    }
    return nodes.length ? nodes : null
  }, [])

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
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5">
                  <div className="flex gap-2 sm:gap-3 items-center min-w-0">
                    <LemonButton
                      type="stealth"
                      size="small"
                      icon={<ArrowLeft className="w-4 h-4" />}
                      onClick={() => navigate({ page: 'list' })}
                      tooltip="Back to notebooks"
                      aria-label="Back to notebooks"
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
                      livePeople={presence.people}
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

                {/* Main editor */}
                <div className="w-full min-h-[600px] pt-2 sm:pt-3 mt-1 sm:mt-2 flex gap-6 items-start">
                  <div className="flex-1 min-w-0" ref={editorContainerRef}>
                    <LemonInput
                      value={title}
                      onChange={setTitle}
                      transparentBackground
                      aria-label="Notebook title"
                      autoFocus={!title || title === 'Untitled Notebook'}
                      className="text-2xl sm:text-3xl font-bold border-none shadow-none focus:outline-none p-0 mb-2 bg-transparent w-full"
                      placeholder="Untitled"
                      onPressEnter={(event) => {
                        event.preventDefault()
                        const root = editorContainerRef.current
                        const firstBlock = root?.querySelector(
                          '.MarkdownNotebook__text-block, [data-markdown-notebook-editor]'
                        ) as HTMLElement | null
                        firstBlock?.focus()
                      }}
                    />
                    {!markdown.trim() ? (
                      <p className="m-0 mb-5 sm:mb-6 text-[11px] text-muted select-none">
                        <span className="font-medium text-secondary">Enter</span> to write ·{' '}
                        <span className="font-medium text-secondary">/</span> insert a block ·{' '}
                        <span className="font-medium text-secondary">⌘K</span> jump
                      </p>
                    ) : (
                      <div className="mb-5 sm:mb-6" />
                    )}

                    <MarkdownNotebook
                      key={`${currentNotebook.id}-${markdownVersion}`}
                      value={markdown}
                      remoteValue={remoteMarkdown}
                      remoteVersion={currentNotebook.version}
                      remoteCarets={presence.carets}
                      onCaretChange={presence.publishCaret}
                      clientId={presence.clientId}
                      focusAIPromptRequest={aiPromptRequest}
                      onChange={(val) => setMarkdown(val)}
                      onAskAI={handleNotebookAskAI}
                      isAskAIDisabled={isAskAIBusy}
                      extraInsertCommands={extraCommands}
                      convertExternalDataTransferToNodes={convertExternalDataTransferToNodes}
                      hiddenInsertCommandKeys={WIM_HIDDEN_INSERT_COMMAND_KEYS}
                      selectionAIActions={SELECTION_AI_ACTIONS}
                      placeholder="Type / to insert a block, or just start writing…"
                      autoFocus={Boolean(title && title !== 'Untitled Notebook')}
                    />
                  </div>
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
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="m-0 text-lg font-semibold text-primary">This notebook isn’t here</p>
                <p className="m-0 text-sm text-muted max-w-sm">
                  It may have been deleted on this device, or the link is stale.
                </p>
                <LemonButton type="primary" size="small" onClick={() => navigate({ page: 'list' })}>
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
      </main>
    </div>
  )
}

export default App
