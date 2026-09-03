import React, { useState, useEffect, Component, useCallback, useRef, useMemo } from 'react'
import type { MarkdownNotebookAskAIRequest } from './lib/components/MarkdownNotebook/MarkdownNotebook'
import { planOpenNotebookRemoteApply, pullNotebookById } from './scenes/notebooks/notebookRemote'
import { useNotebookPresence } from './scenes/notebooks/notebookPresence'
import {
    applyNotebookAIFailure,
    replaceInlineRangeInMarkdown,
    replaceNotebookAIResponseMarkdown,
} from './lib/components/MarkdownNotebook/notebookAI'
import { parseMarkdownNotebook } from './lib/components/MarkdownNotebook/markdown'
import { markNotebookNodeFreshlyInserted } from './lib/components/MarkdownNotebook/freshlyInserted'
import { LemonButton, LemonTag, LemonBanner } from '~nb-lib/lemon-ui/index'
import { ArrowLeft } from 'lucide-react'
import { buildExtraInsertCommands } from './scenes/notebooks/extraInsertCommands.tsx'
import {
    readNotebookChromeSettings,
    writeNotebookChromeSettings,
    type NotebookChromeSettings,
} from './scenes/notebooks/notebookChromeSettings'

import { SELECTION_AI_ACTIONS } from './scenes/notebooks/selectionAI'
import { playInlineEditorMarkdown, playInlineSelectionMarkdown } from './lib/wimai-typewriter'
import { notebookExcerptForEditor, wimaiEditorFailureMessage } from '../lib/bots/wimai-editor'
import {
    StoredNotebook,
    getNotebooks,
    getNotebook,
    saveNotebook,
    createNotebook,
    deleteNotebook,
    duplicateNotebook,
    publishNotebook,
    rememberRemoteNotebook,
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
import { NotebookInviteScene } from './scenes/notebooks/NotebookInviteScene'
import { NotebookSyncInfo } from './scenes/notebooks/NotebookMeta'
import { CommandPaletteModal } from './scenes/notebooks/CommandPaletteModal'
import { CollaboratorsBanner } from './scenes/notebooks/CollaboratorsBanner'
import { SidebarContextPanelMenu } from './scenes/notebooks/SidebarContextPanelMenu'
import { AskAIDropdown } from './scenes/notebooks/AskAI'
import { NotebookToolsSidebar } from './scenes/notebooks/NotebookToolsSidebar'
import { useSiteThemeSync } from './lib/useSiteThemeSync'
import { useUser } from '../hooks/useUser'
import { getNotebookActor, setNotebookActor, userToNotebookActor } from '../lib/notebook-actor'
import { isNotebookImageFile, uploadNotebookImage } from '../lib/notebook-upload'
import { uuid } from './lib/utils/dom'
import { ensureLemonStyles, releaseLemonStyles } from '../lib/lemon/ensureLemonStyles'
import { useAppActions, useAppSettings, useAppWindows } from '../context/App'
import { useWindow } from '../context/Window'
import { parseNotebookRoute, notebookPathForRoute, type NotebookRoute } from '../lib/notebook-route'
import { canWriteNotebook } from '../lib/notebook-sharing'
import { bindNotebookChat } from '../lib/notebook-chat-bind'
import { openAskAiWindow } from '../lib/open-ask-ai-window'

const MarkdownNotebook = React.lazy(() =>
    import('./lib/components/MarkdownNotebook/MarkdownNotebook').then((mod) => ({
        default: mod.MarkdownNotebook,
    }))
)

// ---- Error Boundary ----
type NotebookErrorBoundaryProps = { children: React.ReactNode }
type NotebookErrorBoundaryState = { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<NotebookErrorBoundaryProps, NotebookErrorBoundaryState> {
  state: NotebookErrorBoundaryState = { hasError: false, error: null }
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

type Route = NotebookRoute

function readNotebookLocation(windowPath?: string): Route {
  if (typeof window === 'undefined') return { page: 'list' }
  return parseNotebookRoute(
    windowPath || window.location.pathname,
    window.location.hash,
    window.location.search
  )
}

function useNotebookRouter(): [Route, (route: Route) => void] {
  const { appWindow } = useWindow()
  const { updateWindow } = useAppActions()
  const [route, setRoute] = useState<Route>(() => readNotebookLocation(appWindow?.path))

  useEffect(() => {
    const next = readNotebookLocation(appWindow?.path)
    setRoute((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [appWindow?.path])

  useEffect(() => {
    const sync = () => setRoute(readNotebookLocation(appWindow?.path))
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [appWindow?.path])

  const navigate = useCallback((newRoute: Route) => {
    const nextPath = notebookPathForRoute(newRoute)
    setRoute(newRoute)
    if (appWindow) {
      updateWindow(appWindow, {
        path: nextPath,
        props: { ...(appWindow.props || {}), path: nextPath },
      })
    }
    try {
      window.history.replaceState(window.history.state || {}, '', nextPath)
    } catch {
      /* ignore */
    }
  }, [appWindow, updateWindow])

  return [route, navigate]
}

// ---- App ----
export function App() {
  const [route, navigate] = useNotebookRouter()
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
  const [chrome, setChrome] = useState<NotebookChromeSettings>(() => readNotebookChromeSettings())
  const isExpanded = chrome.wide
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTab, setShareTab] = useState<NotebookShareTab>('private')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [isAskAIBusy, setIsAskAIBusy] = useState(false)
  const askAIAbortRef = useRef(0)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const articleColumnRef = useRef<HTMLDivElement | null>(null)
  const [notebookLibrary, setNotebookLibrary] = useState<StoredNotebook[]>(() => getNotebooks())
  const [outlineMarkdown, setOutlineMarkdown] = useState('')
  const routeRef = useRef(route)
  const notebookRef = useRef(currentNotebook)
  const markdownRef = useRef(markdown)
  const titleRef = useRef(title)
  const saveInFlightRef = useRef(false)
  const saveQueuedRef = useRef(false)
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
    titleRef.current = title
  }, [title])

  const persistOpenNotebookDraft = useCallback((reason: 'idle' | 'flush'): boolean => {
    if (routeRef.current.page !== 'editor') return false
    if (!notebookRef.current) return false
    if (!canWriteNotebook(notebookRef.current.access_role)) return false
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true
      return false
    }

    saveInFlightRef.current = true
    let didSave = false
    try {
      do {
        saveQueuedRef.current = false
        const current = notebookRef.current
        if (!current) break
        const nextTitle = titleRef.current
        const nextContent = markdownRef.current
        if (nextContent === current.content && nextTitle === current.title) {
          if (reason === 'idle') setSyncStatus('saved')
          break
        }
        const saved = saveNotebook({ ...current, title: nextTitle, content: nextContent })
        notebookRef.current = saved
        setCurrentNotebook(saved)
        setRemoteMarkdown(saved.content)
        didSave = true
      } while (saveQueuedRef.current)

      if (didSave) {
        const stillTyping =
          markdownRef.current !== notebookRef.current?.content ||
          titleRef.current !== notebookRef.current?.title
        setSyncStatus(stillTyping ? 'edited' : 'saved')
      }
    } finally {
      saveInFlightRef.current = false
    }

    if (saveQueuedRef.current) {
      return persistOpenNotebookDraft(reason) || didSave
    }
    return didSave
  }, [])

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
  const { appWindow } = useWindow()
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

    const fail = (error: string) => {
      if (requestId !== askAIAbortRef.current) return
      setMarkdown(
        applyNotebookAIFailure(request.markdownWithResponse, {
          apply: request.apply ?? 'block',
          responseNodeIndex: request.responseNodeIndex,
          instruction: (request.instruction || request.query || '').trim(),
          error,
        })
      )
    }

    try {
      const instruction = (request.instruction || request.query || '').trim()
      const res = await fetch('/api/notebook/inline-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          selection: request.selectedMarkdown || '',
          notebook: notebookExcerptForEditor(request.markdownWithResponse, request.responseMarker, {
            nodeIndex: request.responseNodeIndex,
            selectedMarkdown: request.selectedMarkdown,
          }),
        }),
      })

      let data: { ok?: boolean; markdown?: string; error?: string } | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (requestId !== askAIAbortRef.current) return

      const reply = typeof data?.markdown === 'string' ? data.markdown.trim() : ''
      if (!data?.ok || !reply) {
        fail(wimaiEditorFailureMessage(data, res.status))
        return
      }

      if (request.apply === 'inline') {
        const start = request.selectionStart ?? 0
        const end = request.selectionEnd ?? start + (request.selectedMarkdown?.length ?? 0)
        await playInlineSelectionMarkdown({
          baseMarkdown: request.markdownWithResponse,
          responseNodeIndex: request.responseNodeIndex,
          start,
          end,
          fullText: reply,
          listItemIndex: request.listItemIndex,
          isCancelled: () => requestId !== askAIAbortRef.current,
          onFrame: (nextMarkdown) => {
            if (requestId !== askAIAbortRef.current) return
            setMarkdown(nextMarkdown)
          },
        })
        return reply
      }

      await playInlineEditorMarkdown({
        baseMarkdown: request.markdownWithResponse,
        responseNodeIndex: request.responseNodeIndex,
        fullText: reply,
        isCancelled: () => requestId !== askAIAbortRef.current,
        onFrame: (nextMarkdown) => {
          if (requestId !== askAIAbortRef.current) return
          setMarkdown(nextMarkdown)
        },
      })
      return reply
    } catch (error) {
      console.warn('[notebook editor] request failed', error)
      fail('The editor is unreachable right now. Please try again.')
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
      if (appWindow && nb.title) {
        appActions.setWindowTitle(appWindow, nb.title)
      }
    }

    const nb = getNotebook(route.notebookId)
    if (nb) {
      apply(nb)
      return
    }
    setCurrentNotebook(null)

    let cancelled = false
    void pullNotebookById(route.notebookId).then((remote) => {
      if (cancelled || !remote) return
      rememberRemoteNotebook(remote)
      apply(remote)
    })

    const onHydrated = () => {
      const remote = getNotebook(route.notebookId)
      if (remote) apply(remote)
    }
    window.addEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, onHydrated)
    return () => {
      cancelled = true
      window.removeEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, onHydrated)
    }
  }, [route, appWindow, appActions])

  useEffect(() => {
    if (route.page !== 'editor' || !currentNotebook) return
    const notebookId = currentNotebook.id
    const applyRemoteIfNewer = () => {
      const latest = getNotebook(notebookId)
      const current = notebookRef.current
      if (!latest || !current || current.id !== notebookId) {
        return
      }
      const plan = planOpenNotebookRemoteApply({
        current,
        latest,
        draftContent: markdownRef.current,
        draftTitle: titleRef.current,
      })
      if (!plan.adopt) return
      notebookRef.current = latest
      setCurrentNotebook(latest)
      if (plan.applyRemoteBase) setRemoteMarkdown(latest.content)
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
  }, [route.page, currentNotebook?.id])

  // Auto-save after idle. Always read the latest draft from refs so a save that
  // lands while the user is already typing again cannot write (or echo) a stale body.
  useEffect(() => {
    if (!currentNotebook || route.page !== 'editor') return
    const dirty = markdown !== currentNotebook.content || title !== currentNotebook.title
    if (!dirty) {
      setSyncStatus('saved')
      return
    }
    setSyncStatus('edited')
    const timer = window.setTimeout(() => {
      persistOpenNotebookDraft('idle')
    }, chrome.autosaveMs)
    return () => window.clearTimeout(timer)
  }, [markdown, title, currentNotebook?.id, route.page, persistOpenNotebookDraft, chrome.autosaveMs])

  useEffect(() => {
    if (route.page !== 'editor' || !currentNotebook) return
    const flush = () => {
      persistOpenNotebookDraft('flush')
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [route.page, currentNotebook?.id, persistOpenNotebookDraft])

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
      const label = mode === 'replace' ? 'Full document rewrite' : 'Inserted artifact'
      saveNotebook({ ...target, content: next }, { snapshot: true, snapshotLabel: label })

      // Mark the newly inserted nodes to trigger smooth highlight glow
      try {
        const parsed = parseMarkdownNotebook(next)
        const insertedDoc = parseMarkdownNotebook(text)
        if (insertedDoc.nodes.length > 0) {
          if (mode === 'prepend') {
            parsed.nodes.slice(0, insertedDoc.nodes.length).forEach((n) => markNotebookNodeFreshlyInserted(n.id))
          } else if (mode === 'replace') {
            parsed.nodes.forEach((n) => markNotebookNodeFreshlyInserted(n.id))
          } else {
            parsed.nodes.slice(-insertedDoc.nodes.length).forEach((n) => markNotebookNodeFreshlyInserted(n.id))
          }
        }
      } catch {
        /* ignore parse */
      }

      // Smooth scroll target block into view
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          const glows = document.querySelectorAll('.MarkdownNotebook__text-row--inserted-glow, [data-markdown-notebook-node-id]')
          const targetEl = glows[glows.length - 1]
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 80)
      }
    }

    const handleSetTitle = (event: Event) => {
      const customEvent = event as CustomEvent<{ title: string; notebookId?: string }>
      const newTitle = String(customEvent.detail?.title || '').trim()
      if (!newTitle) return
      let target: StoredNotebook | null = notebookRef.current
      if (customEvent.detail?.notebookId) {
        const bound = getNotebook(customEvent.detail.notebookId)
        if (bound) target = bound
      }
      if (!target) return
      setTitle(newTitle)
      const updated = { ...target, title: newTitle }
      setCurrentNotebook(updated)
      saveNotebook(updated, { snapshot: true, snapshotLabel: `Rename: ${newTitle}` })
      if (appWindow) {
        appActions.setWindowTitle(appWindow, newTitle)
      }
    }

    const handleReplaceSelection = (event: Event) => {
      const customEvent = event as CustomEvent<{ text: string; notebookId?: string }>
      const text = String(customEvent.detail?.text || '').trim()
      if (!text) return
      let target: StoredNotebook | null = notebookRef.current
      if (customEvent.detail?.notebookId) {
        const bound = getNotebook(customEvent.detail.notebookId)
        if (bound) target = bound
      }
      if (!target) return
      const current = markdownRef.current || target.content || ''
      const selection = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : ''
      let next = current
      if (selection && current.includes(selection)) {
        next = current.replace(selection, text)
      } else {
        next = current.trim() ? `${current.trim()}\n\n${text}\n` : `${text}\n`
      }
      setCurrentNotebook(target)
      setMarkdown(next)
      setMarkdownVersion((v) => v + 1)
      saveNotebook({ ...target, content: next }, { snapshot: true, snapshotLabel: 'Replaced selection' })
    }

    window.addEventListener('wimNotebookInsertText', handleInsertText)
    window.addEventListener('wimNotebookSetTitle', handleSetTitle)
    window.addEventListener('wimNotebookReplaceSelection', handleReplaceSelection)
    return () => {
      window.removeEventListener('wimNotebookInsertText', handleInsertText)
      window.removeEventListener('wimNotebookSetTitle', handleSetTitle)
      window.removeEventListener('wimNotebookReplaceSelection', handleReplaceSelection)
    }
  }, [navigate, appWindow])

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

  useEffect(() => {
    const reloadLibrary = () => setNotebookLibrary(getNotebooks())
    reloadLibrary()
    window.addEventListener(WIM_NOTEBOOKS_CHANGED_EVENT, reloadLibrary)
    window.addEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, reloadLibrary)
    return () => {
      window.removeEventListener(WIM_NOTEBOOKS_CHANGED_EVENT, reloadLibrary)
      window.removeEventListener(WIM_NOTEBOOKS_HYDRATED_EVENT, reloadLibrary)
    }
  }, [])

  useEffect(() => {
    setOutlineMarkdown(markdown)
  }, [currentNotebook?.id])

  useEffect(() => {
    if (route.page !== 'editor') return
    const timer = window.setTimeout(() => setOutlineMarkdown(markdown), 280)
    return () => window.clearTimeout(timer)
  }, [markdown, route.page])

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

  const shellClassName = [
    'App notebook-app-scope w-full h-full min-h-0 flex-1 flex flex-col overflow-hidden',
    route.page === 'public' ? 'bg-transparent' : 'bg-[var(--bg-3000,#f3f4f5)]',
    hostTheme === 'dark' ? 'dark' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Shell matches standalone posthog-notebook-app.
  // notebook-app-scope stays on this root only so site OS chrome is not affected.
  return (
    <div
      className={shellClassName}
      data-lemon-scope="true"
      data-host-theme={hostTheme}
      data-notebook-lock="true"
      data-notebook-font={chrome.fontSize}
    >
      {/* ===== Main Content Area matching PostHog Notebook SceneContent ===== */}
      {/* pb so last lines aren't clipped under window edge when scrolling */}
      <main
        className={
          route.page === 'public'
            ? 'flex-1 w-full min-h-0 p-0 bg-primary text-primary'
            : route.page === 'editor' && currentNotebook
              ? 'flex-1 w-full min-h-0 h-full flex flex-col p-0 overflow-hidden'
              : 'flex-1 w-full min-h-0 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-16 sm:pb-20 max-w-[1400px] mx-auto space-y-4 sm:space-y-6'
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
          {route.page === 'invite' && (
            <NotebookInviteScene
              token={route.token}
              onJoined={(id) => navigate({ page: 'editor', notebookId: id })}
              onBack={() => navigate({ page: 'list' })}
            />
          )}

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
              <div className={'Notebook flex-1 h-full min-h-0 flex items-stretch relative overflow-hidden ' + (isExpanded ? 'Notebook--expanded' : 'Notebook--compact')}>
                <NotebookToolsSidebar
                  markdown={outlineMarkdown}
                  containerRef={editorContainerRef}
                  articleRef={articleColumnRef}
                  notebooks={notebookLibrary
                    .slice()
                    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
                    .map((nb) => ({ id: nb.id, title: nb.title }))}
                  activeNotebookId={currentNotebook.id}
                  notebookTitle={currentNotebook.title || title}
                  currentContent={markdown}
                  onSelectNotebook={handleSelectNotebook}
                  onCreateNotebook={handleCreateNew}
                  onSnapshotNow={handleHistorySnapshotNow}
                  onHistoryRestored={handleHistoryRestored}
                  chrome={chrome}
                  onChromeChange={(next) => {
                    const merged = { ...chrome, ...next }
                    writeNotebookChromeSettings(merged)
                    setChrome(merged)
                  }}
                  onShare={(tab) => {
                    setShareTab(tab || 'private')
                    setShowShareModal(true)
                  }}
                  people={presence.people}
                />
                <div
                  ref={articleColumnRef}
                  className="relative flex-1 min-w-0 min-h-0 flex flex-col"
                >
                <div className="flex-1 min-w-0 min-h-0 overflow-y-auto px-3 py-2 sm:p-6 lg:p-8 pb-16 sm:pb-20">
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
                {currentNotebook.access_role === 'viewer' && (
                  <LemonBanner type="info" className="mb-6">
                    You can read this notebook. Ask the owner to give you edit access if you need to write.
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
                      onShare={(tab) => {
                        setShareTab(tab || 'private')
                        setShowShareModal(true)
                      }}
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
                <div className="w-full min-h-[600px] pt-2 sm:pt-3 mt-1 sm:mt-2">
                  <div className="min-w-0" ref={editorContainerRef}>
                    <React.Suspense
                      fallback={
                        <div className="py-10 text-sm text-muted animate-pulse">Loading editor…</div>
                      }
                    >
                    <MarkdownNotebook
                      key={`${currentNotebook.id}-${markdownVersion}`}
                      value={markdown}
                      remoteValue={remoteMarkdown}
                      remoteVersion={currentNotebook.version}
                      remoteCarets={presence.carets}
                      onCaretChange={presence.publishCaret}
                      clientId={presence.clientId}
                      mode={canWriteNotebook(currentNotebook.access_role) ? 'edit' : 'view'}
                      focusAIPromptRequest={aiPromptRequest}
                      onChange={(val) => {
                        if (!canWriteNotebook(currentNotebook.access_role)) return
                        setMarkdown(val)
                        const heading = val.match(/^\s*#\s+(.+?)\s*$/m)?.[1]?.trim()
                        if (heading) setTitle(heading)
                      }}
                      onAskAI={canWriteNotebook(currentNotebook.access_role) ? handleNotebookAskAI : undefined}
                      isAskAIDisabled={isAskAIBusy || !canWriteNotebook(currentNotebook.access_role)}
                      extraInsertCommands={extraCommands}
                      onInvitePeople={() => {
                        setShareTab('private')
                        setShowShareModal(true)
                      }}
                      convertExternalDataTransferToNodes={convertExternalDataTransferToNodes}
                      selectionAIActions={SELECTION_AI_ACTIONS}
                      placeholder="Type / to insert a block, or just start writing…"
                      autoFocus={Boolean(title && title !== 'Untitled Notebook')}
                      spellCheck={chrome.spellcheck}
                    />
                    </React.Suspense>
                  </div>
                </div>
                </div>

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
