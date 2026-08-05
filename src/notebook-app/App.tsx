import React, { useState, useEffect, Component, useCallback } from 'react'
import { MarkdownNotebook } from './lib/components/MarkdownNotebook/MarkdownNotebook'
import { LemonButton, LemonInput, LemonTag, LemonBanner } from '~nb-lib/lemon-ui/index'
import { ArrowLeft } from 'lucide-react'
import { buildExtraInsertCommands } from './scenes/notebooks/extraInsertCommands.tsx'
import { WIM_HIDDEN_INSERT_COMMAND_KEYS } from './scenes/notebooks/hiddenInsertCommands'
import {
    StoredNotebook,
    DEFAULT_NOTEBOOKS,
    getNotebooks,
    getNotebook,
    saveNotebook,
    createNotebook,
    deleteNotebook,
    duplicateNotebook,
    publishNotebook,
} from './scenes/notebooks/notebookStorage'
import { NotebookPublicView } from './scenes/notebooks/NotebookPublicView'
import { NotebooksListScene } from './scenes/notebooks/NotebooksListScene'
import { TemplatesGallery } from './scenes/notebooks/TemplatesGallery'
import { NotebookCanvasScene } from './scenes/notebooks/NotebookCanvasScene'
import { NotebookMenu } from './scenes/notebooks/NotebookMenu'
import { NotebookShareModal } from './scenes/notebooks/NotebookShareModal'
import { NotebookHistory } from './scenes/notebooks/NotebookHistory'
import { NotebookSyncInfo, NotebookExpandButton } from './scenes/notebooks/NotebookMeta'
import { NotebookAIWriterModal } from './scenes/notebooks/NotebookAIWriterModal'
import { CommandPaletteModal } from './scenes/notebooks/CommandPaletteModal'
import { CollaboratorsBanner } from './scenes/notebooks/CollaboratorsBanner'
import { SidebarContextPanelMenu } from './scenes/notebooks/SidebarContextPanelMenu'
import { NotebookPublishModal } from './scenes/notebooks/NotebookPublishModal'
import { AskAIDropdown } from './scenes/notebooks/AskAIDropdown'
import { useSiteThemeSync } from './lib/useSiteThemeSync'
import { ensureLemonStyles, releaseLemonStyles } from '../lib/lemon/ensureLemonStyles'

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
  const [syncStatus, setSyncStatus] = useState<'saved' | 'edited' | 'local'>('local')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

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

  // Load notebook when route changes to editor
  useEffect(() => {
    if (route.page === 'editor') {
      const nbs = getNotebooks()
      const nb = getNotebook(route.notebookId) || nbs[0] || DEFAULT_NOTEBOOKS[0]
      if (nb) {
        setCurrentNotebook(nb)
        setMarkdown(nb.content)
        setTitle(nb.title)
        setSyncStatus('saved')
        setShowHistory(false)
        setShowAIModal(false)
      } else {
        setCurrentNotebook(null)
      }
    }
  }, [route])

  // Auto-save with debounce (snapshots throttled inside saveNotebook)
  useEffect(() => {
    if (!currentNotebook || route.page !== 'editor') return
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
        isPublished: meta.isPublished !== false,
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
    if (confirm(`Delete "${currentNotebook.title}"?`)) {
      deleteNotebook(currentNotebook.id)
      navigate({ page: 'list' })
    }
  }

  const handleInsertAIResponse = useCallback((aiContent?: string) => {
    const text = (aiContent || '').trim()
    if (!text) return
    setMarkdown((prev) => {
      const current = prev || ''
      return current.trim() + '\n\n' + text + '\n'
    })
    setMarkdownVersion((v) => v + 1)
  }, [])

  const handleRestoreVersion = (content: string) => {
    setMarkdown(content)
    setMarkdownVersion((v) => v + 1)
    setShowHistory(false)
    if (currentNotebook) {
      const saved = saveNotebook(
        { ...currentNotebook, title, content },
        { snapshot: true, snapshotLabel: 'Restored from history' }
      )
      setCurrentNotebook(saved)
      setSyncStatus('saved')
    }
  }

  const handleCanvasSave = (id: string) => {
    navigate({ page: 'editor', notebookId: id })
  }

  const extraCommands = useCallback(
    (api?: any) =>
      buildExtraInsertCommands({
        ...api,
        openAIPrompt: () => {
          setShowAIModal(true)
          setAiPromptRequest((n) => (n ?? 0) + 1)
        },
      }),
    []
  )

  // Shell matches standalone posthog-notebook-app.
  // `notebook-app-scope` on THIS root only (never body) so site OS chrome is not affected.
  // Host light/dark → .dark so index tokens (--bg-3000 etc.) resolve.
  return (
    <div
      className={`App notebook-app-scope min-h-full h-auto bg-[var(--bg-3000,#f3f4f5)] text-[var(--text-3000,#1d1f27)] ${
        hostTheme === 'dark' ? 'dark' : ''
      }`}
      data-lemon-scope
      data-host-theme={hostTheme}
    >
      {/* ===== Main Content Area matching PostHog Notebook SceneContent ===== */}
      {/* pb so last lines aren't clipped under window edge when scrolling */}
      <main className="p-3 sm:p-6 lg:p-8 pb-16 sm:pb-20 max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        <ErrorBoundary>
          {/* ---------- Public notebook (read-only share link) ---------- */}
          {route.page === 'public' && (() => {
            const pub = getNotebook(route.notebookId)
            if (!pub) {
              return (
                <div className="p-12 text-center text-muted space-y-4">
                  <p className="text-lg">Published notebook not found ({route.notebookId})</p>
                  <LemonButton type="primary" onClick={() => navigate({ page: 'list' })}>
                    Back to notebooks
                  </LemonButton>
                </div>
              )
            }
            return (
              <NotebookPublicView
                notebook={pub}
                onBack={() => navigate({ page: 'list' })}
                onOpenEditor={() => navigate({ page: 'editor', notebookId: pub.id })}
              />
            )
          })()}

          {/* ---------- Notebooks List (Default Entry Scene) ---------- */}
          {route.page === 'list' && (
            <NotebooksListScene
              onSelectNotebook={handleSelectNotebook}
              onCreateNew={handleCreateNew}
              onOpenCanvas={() => navigate({ page: 'canvas' })}
              onSelectTemplate={handleSelectTemplate}
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
                    <CollaboratorsBanner editedByText={currentNotebook.created_by?.first_name || 'Mustafa'} />
                    <span className="text-muted opacity-30 hidden sm:inline">•</span>
                    <div className="hidden sm:block">
                      <NotebookSyncInfo syncStatus={syncStatus} />
                    </div>
                  </div>

                  <div className="flex gap-3 items-center">
                    <AskAIDropdown onInsertPromptBlock={handleInsertAIResponse} />
                    <NotebookMenu
                      notebookId={currentNotebook.id}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onShowHistory={() => setShowHistory(!showHistory)}
                      onShare={() => setShowShareModal(true)}
                      onOpenPublishModal={() => setShowPublishModal(true)}
                    />
                    <NotebookExpandButton
                      isExpanded={isExpanded}
                      onToggleExpand={() => setIsExpanded(!isExpanded)}
                    />
                    <SidebarContextPanelMenu
                      notebookTitle={currentNotebook.title}
                      onOpenAI={() => setShowAIModal(true)}
                      onCreateNew={handleCreateNew}
                      onPublish={handlePublish}
                    />
                  </div>
                </div>

                {/* Main Markdown Notebook Editor */}
                <div className="w-full min-h-[600px] pt-4 sm:pt-6 mt-4 sm:mt-6">
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
                    extraInsertCommands={extraCommands}
                    hiddenInsertCommandKeys={WIM_HIDDEN_INSERT_COMMAND_KEYS}
                  />
                </div>

                {/* History Drawer Panel */}
                {showHistory && (
                  <NotebookHistory
                    notebookId={currentNotebook.id}
                    isOpen={showHistory}
                    onRestore={handleRestoreVersion}
                    onClose={() => setShowHistory(false)}
                  />
                )}

                {/* Share Modal */}
                <NotebookShareModal
                  isOpen={showShareModal}
                  onClose={() => setShowShareModal(false)}
                  notebookId={currentNotebook.id}
                  notebookTitle={currentNotebook.title}
                />

                {/* PostHog AI Assistant Modal */}
                <NotebookAIWriterModal
                  isOpen={showAIModal}
                  onClose={() => setShowAIModal(false)}
                  onInsertContent={handleInsertAIResponse}
                />

                {/* Publish & Cover Meta Details Modal */}
                <NotebookPublishModal
                  isOpen={showPublishModal}
                  onClose={() => setShowPublishModal(false)}
                  notebookTitle={currentNotebook.title}
                  onPublishSuccess={handlePublish}
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
          onOpenCanvas={() => navigate({ page: 'canvas' })}
          onOpenTemplates={() => navigate({ page: 'templates' })}
          onOpenAI={() => setShowAIModal(true)}
        />
      </main>
    </div>
  )
}

export default App
