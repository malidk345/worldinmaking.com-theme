import { useState, useEffect, useRef } from 'react';
import { Editor as EditorInstance } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, PanelLeft, Moon, Sun, Trash2, SlidersHorizontal, Search,
  Folder, ChevronDown, ChevronRight, Pin, MoreHorizontal, FolderPlus,
  Command, Check, PenLine, Smile, ArrowLeft,
} from 'lucide-react';

import { useDocuments, Folder as FolderType } from '@/hooks/use-documents';
import { useEditorSettings } from '@/hooks/use-editor-settings';
import { useTheme } from '@/components/theme-provider';
import { Editor } from '@/components/editor/editor';
import { SettingsPanel } from '@/components/editor/settings-panel';
import { CommandPalette } from '@/components/editor/command-palette';
import { FolderDialog } from '@/components/editor/folder-dialog';
import { Button } from '@/components/ui/button';
import { NoiseOverlay } from '@/components/noise-overlay';
import { cn } from '@/lib/utils';

import { DOC_ICONS, RenderIcon } from '@/components/editor/icons';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const {
    documents, folders, activeDocId, setActiveDocId, sortOrder, setSortOrder,
    createDocument, updateDocument, deleteDocument, pinDocument, moveDocument, setDocumentIcon,
    createFolder, updateFolder, deleteFolder,
    isLoaded, activeDocument
  } = useDocuments();
  const { settings, updateSettings } = useEditorSettings();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderEditTarget, setFolderEditTarget] = useState<FolderType | null>(null);
  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [mounted, setMounted] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string; type: 'doc' | 'folder' } | null>(null);
  const [iconPicker, setIconPicker] = useState<{ x: number; y: number; id: string } | null>(null);
  const [movePicker, setMovePicker] = useState<{ x: number; y: number; id: string } | null>(null);
  const editorRef = useRef<EditorInstance | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Dynamic theme-color meta tag updater for seamless mobile browser integration
  useEffect(() => {
    if (!mounted) return;
    
    // Select or create the meta tag
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }

    // Determine target color based on sidebar state and theme
    const isDark = theme === 'dark';
    let targetColor = '';
    
    if (sidebarOpen && window.innerWidth < 768) {
      // Sidebar color
      targetColor = isDark ? '#18181b' : '#fafafa';
    } else {
      // Editor / canvas background color
      targetColor = isDark ? '#0f172a' : '#fdfcfb';
    }
    
    meta.setAttribute('content', targetColor);
  }, [sidebarOpen, theme, mounted]);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setSidebarOpen(false); else setSidebarOpen(true); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ⌘K palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close context menus on click outside
  useEffect(() => {
    const close = () => { setContextMenu(null); setIconPicker(null); setMovePicker(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!isLoaded || !mounted) return null;

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.preview.toLowerCase().includes(search.toLowerCase())
  );

  const rootDocs = filteredDocs.filter(d => !d.folderId);
  const folderDocs = (folderId: string | null) => filteredDocs.filter(d => d.folderId === folderId);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'doc' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, id, type });
  };

  const onMenuIcon = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIconPicker({ x: e.clientX, y: e.clientY, id });
  };

  const onMenuMove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMovePicker({ x: e.clientX, y: e.clientY, id });
  };

  return (
    <div className={cn('flex h-[100dvh] w-full overflow-hidden bg-background relative selection:bg-primary/20 font-sans', settings.focusMode && 'sidebar-hidden')}>      <NoiseOverlay />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && !settings.focusMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && !settings.focusMode && (
          <motion.div
            initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'fixed md:relative z-50 h-full w-[270px] shrink-0',
              'bg-background/90 supports-[backdrop-filter]:backdrop-blur-[40px] border-y-0 border-l-0 border-r border-border/40',
              'flex flex-col shadow-2xl md:shadow-none',
              'sidebar-safe-area'
            )}
          >
            {/* Header — extends into status bar on mobile */}
            <div className="flex items-center justify-between px-3 border-b border-border/25 shrink-0 sidebar-header">
              <div className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                <div className="w-5 h-5 rounded-md bg-foreground flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 bg-background rounded-full" />
                </div>
                wim editör
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="iconSm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </Button>
                <Button variant="ghost" size="iconSm" onClick={() => setSettingsOpen(v => !v)} className={cn('rounded-full w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10', settingsOpen && 'bg-black/5 dark:bg-white/10')}>
                  <SlidersHorizontal size={14} />
                </Button>
                <Button variant="ghost" size="iconSm" onClick={() => createDocument()} className="rounded-full w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10">
                  <Plus size={15} />
                </Button>
              </div>
            </div>

            {/* Search & Sort */}
            <div className="px-3 pt-2.5 pb-2 space-y-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-xs bg-black/5 dark:bg-white/8 border border-border/30 rounded-xl pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40 text-foreground"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <ArrowLeft size={11} className="rotate-90" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {(['updated', 'created', 'name'] as const).map(o => (
                    <button
                      key={o}
                      onClick={() => setSortOrder(o)}
                      className={cn(
                        'text-[10px] px-2 py-1 rounded-lg font-medium transition-all capitalize',
                        sortOrder === o ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/6'
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setFolderDialogOpen(true)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition-all"
                >
                  <FolderPlus size={11} /> New Folder
                </button>
              </div>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto py-1 px-2 custom-scrollbar space-y-0.5">
              {documents.length === 0 ? (
                <div className="text-center px-4 py-10 text-xs text-muted-foreground/50">
                  No documents yet.<br />
                  <button onClick={() => createDocument()} className="mt-2 text-primary/70 hover:text-primary underline-offset-2 hover:underline">Create one</button>
                </div>
              ) : (
                <>
                  {/* Root docs */}
                  {rootDocs.map(doc => (
                    <DocItem
                      key={doc.id}
                      doc={doc}
                      active={activeDocId === doc.id}
                      onClick={() => { setActiveDocId(doc.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                      onContextMenu={e => handleContextMenu(e, doc.id, 'doc')}
                      onIconClick={e => onMenuIcon(e, doc.id)}
                    />
                  ))}

                  {/* Folders */}
                  {folders.map(folder => {
                    const expanded = expandedFolders.has(folder.id);
                    const fDocs = folderDocs(folder.id);
                    return (
                      <div key={folder.id} className="mt-1">
                        <button
                          onClick={() => toggleFolder(folder.id)}
                          onContextMenu={e => handleContextMenu(e, folder.id, 'folder')}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-black/4 dark:hover:bg-white/6 transition-all"
                        >
                          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          <RenderIcon name={folder.emoji} size={14} className="text-foreground/75 shrink-0" />
                          <span className="flex-1 text-left truncate">{folder.name}</span>
                          <span className="text-[10px] text-muted-foreground/50">{fDocs.length}</span>
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden ml-3 border-l border-border/20 pl-2 mt-0.5 space-y-0.5"
                            >
                              {fDocs.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground/40 px-2 py-1.5">No documents</p>
                              ) : (
                                fDocs.map(doc => (
                                  <DocItem
                                    key={doc.id}
                                    doc={doc}
                                    active={activeDocId === doc.id}
                                    onClick={() => { setActiveDocId(doc.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                                    onContextMenu={e => handleContextMenu(e, doc.id, 'doc')}
                                    onIconClick={e => onMenuIcon(e, doc.id)}
                                  />
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sidebar footer / ⌘K hint */}
            <div className="px-3 py-2 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground/40 sidebar-footer">
              <span className="flex items-center gap-1"><Command size={10} /> K palette</span>
              <span>{documents.length} docs</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {!sidebarOpen && !settings.focusMode && (
          <div className="absolute top-3 left-3 z-30">
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
              <Button variant="glass" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl shadow-sm h-9 w-9 text-foreground/70 hover:text-foreground">
                <PanelLeft size={16} />
              </Button>
            </motion.div>
          </div>
        )}

        <Editor
          key={activeDocId || 'empty'}
          document={activeDocument || null}
          onChange={updates => activeDocId && updateDocument(activeDocId, updates)}
          sidebarOpen={sidebarOpen}
          settings={settings}
          focusMode={settings.focusMode}
          onEditorReady={ed => { editorRef.current = ed; }}
          onCreateDocument={() => createDocument()}
        />
      </div>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        editor={editorRef.current}
        documents={documents}
        activeDocId={activeDocId}
        onNavigateToDoc={id => setActiveDocId(id)}
        onNewDoc={() => createDocument()}
        onInsertImage={() => window.dispatchEvent(new CustomEvent('craft:openImageDialog'))}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        focusMode={settings.focusMode}
        onToggleFocusMode={() => updateSettings({ focusMode: !settings.focusMode })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Folder dialog */}
      <FolderDialog
        open={folderDialogOpen}
        onClose={() => { setFolderDialogOpen(false); setFolderEditTarget(null); }}
        onConfirm={(name, emoji) => {
          if (folderEditTarget) updateFolder(folderEditTarget.id, { name, emoji });
          else createFolder(name, emoji);
          setFolderEditTarget(null);
        }}
        title={folderEditTarget ? 'Edit Folder' : 'New Folder'}
        confirmLabel={folderEditTarget ? 'Save' : 'Create'}
        initialName={folderEditTarget?.name}
        initialEmoji={folderEditTarget?.emoji}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[70] w-44 rounded-2xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-2xl p-1.5 text-xs animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === 'doc' && (
            <>
              <button onClick={() => { pinDocument(contextMenu.id, !documents.find(d => d.id === contextMenu.id)?.pinned); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
                <Pin size={12} /> {documents.find(d => d.id === contextMenu.id)?.pinned ? 'Unpin' : 'Pin to top'}
              </button>
              <button onClick={e => onMenuIcon(e, contextMenu.id)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
                <Smile size={12} /> Change icon
              </button>
              <button onClick={e => onMenuMove(e, contextMenu.id)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
                <Folder size={12} /> Move to folder
              </button>
              <div className="h-px bg-black/8 dark:bg-white/8 my-1" />
              <button onClick={() => { deleteDocument(contextMenu.id); setContextMenu(null); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all">
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <button onClick={() => { const f = folders.find(x => x.id === contextMenu.id); if (f) { setFolderEditTarget(f); setFolderDialogOpen(true); } setContextMenu(null); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
                <PenLine size={12} /> Rename
              </button>
              <button onClick={() => { createDocument(contextMenu.id); setContextMenu(null); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
                <Plus size={12} /> New document
              </button>
              <div className="h-px bg-black/8 dark:bg-white/8 my-1" />
              <button onClick={() => { deleteFolder(contextMenu.id); setContextMenu(null); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all">
                <Trash2 size={12} /> Delete folder
              </button>
            </>
          )}
        </div>
      )}

      {/* Icon picker */}
      {iconPicker && (
        <div className="fixed z-[80] p-2 rounded-2xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-2xl grid grid-cols-8 gap-1"
          style={{ top: iconPicker.y, left: iconPicker.x }}
          onClick={e => e.stopPropagation()}
        >
          {DOC_ICONS.map(e => (
            <button key={e} onClick={() => { setDocumentIcon(iconPicker.id, e); setIconPicker(null); }} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/8 transition-colors">
              <RenderIcon name={e} size={14} className="text-foreground/75" />
            </button>
          ))}
        </div>
      )}

      {/* Move picker */}
      {movePicker && (
        <div className="fixed z-[80] w-44 p-1.5 rounded-2xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-2xl"
          style={{ top: movePicker.y, left: movePicker.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { moveDocument(movePicker.id, null); setMovePicker(null); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
            <Folder size={12} /> No folder
          </button>
          {folders.map(f => (
            <button key={f.id} onClick={() => { moveDocument(movePicker.id, f.id); setMovePicker(null); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
              <RenderIcon name={f.emoji} size={13} className="text-foreground/60 shrink-0" /> {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DocItem({
  doc, active, onClick, onContextMenu, onIconClick,
}: { doc: any; active: boolean; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void; onIconClick: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'group relative flex flex-col p-2 rounded-xl cursor-pointer transition-all border border-transparent',
        active ? 'bg-black/6 dark:bg-white/10 border-black/5 dark:border-white/8' : 'hover:bg-black/4 dark:hover:bg-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <button
            onClick={onIconClick}
            className="text-sm leading-none hover:scale-110 transition-transform"
          >
            {doc.pinned ? <Pin size={12} className="text-amber-500 mt-0.5" /> : <RenderIcon name={doc.icon} size={13} className="text-foreground/75 mt-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-xs truncate text-foreground/85 leading-relaxed block">
              {doc.title || 'Untitled'}
            </span>
            {doc.preview && <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5 leading-snug">{doc.preview}</p>}
          </div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 transition-all">
          <MoreHorizontal size={12} />
        </button>
      </div>
      <span className="text-[10px] text-muted-foreground/40 mt-1 pl-5">{formatDistanceToNow(doc.updatedAt, { addSuffix: true })}</span>
    </div>
  );
}
