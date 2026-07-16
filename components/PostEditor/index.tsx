import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Plus, PanelLeft, Moon, Sun, Trash2, SlidersHorizontal } from 'lucide-react';

import { useDocuments } from '@/hooks/use-documents';
import { useEditorSettings } from '@/hooks/use-editor-settings';
import { useTheme } from '@/components/theme-provider';
import { Editor } from '@/components/editor/editor';
import { SettingsPanel } from '@/components/editor/settings-panel';
import { Button } from '@/components/ui/button';
import { NoiseOverlay } from '@/components/noise-overlay';
import { cn } from '@/lib/utils';
import { AppWindow } from 'context/Window';

export default function PostEditor({ postId, item }: { postId?: string, item?: AppWindow }) {
  const { theme, setTheme } = useTheme();
  const {
    documents, activeDocId, setActiveDocId,
    createDocument, updateDocument, deleteDocument,
    activeDocument, isLoaded
  } = useDocuments();
  const { settings, updateSettings, loaded: settingsLoaded } = useEditorSettings();

  // Load initial postId on mount / changes
  useEffect(() => {
    if (postId && isLoaded) {
      setActiveDocId(postId);
    }
  }, [postId, isLoaded, setActiveDocId]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isLoaded || !mounted || !settingsLoaded) return null;

  return (
    <div className="flex w-full h-full overflow-hidden bg-background relative selection:bg-primary/20 font-sans flex-col post-editor-root">
      {item?.key && (
        <aside className="sticky top-0 z-[100] shrink-0 w-full">
          <div id={`window-inner-header-${item.key}`} className="pointer-events-auto" />
        </aside>
      )}
      
      <div className="flex flex-1 w-full overflow-hidden relative">
        <NoiseOverlay />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
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
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'fixed md:relative z-50 h-full w-[260px] shrink-0',
              'glass-panel border-y-0 border-l-0 border-r border-border/40',
              'flex flex-col shadow-2xl md:shadow-none'
            )}
          >
            {/* Sidebar header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-border/25 shrink-0">
              <div className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                <div className="w-5 h-5 rounded-md bg-foreground flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 bg-background rounded-full" />
                </div>
                Notes
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost" size="iconSm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-full w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </Button>
                <Button
                  variant="ghost" size="iconSm"
                  onClick={() => setSettingsOpen(v => !v)}
                  className={cn('rounded-full w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10', settingsOpen && 'bg-black/5 dark:bg-white/10')}
                >
                  <SlidersHorizontal size={14} />
                </Button>
                <Button
                  variant="ghost" size="iconSm"
                  onClick={() => createDocument()}
                  className="rounded-full w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Plus size={15} />
                </Button>
              </div>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar space-y-0.5">
              {documents.length === 0 ? (
                <div className="text-center px-4 py-10 text-xs text-muted-foreground/50">
                  No documents yet.
                  <br />
                  <button
                    onClick={() => createDocument()}
                    className="mt-2 text-primary/70 hover:text-primary underline-offset-2 hover:underline"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc.id}
                    data-testid={`doc-item-${doc.id}`}
                    onClick={() => { setActiveDocId(doc.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                    className={cn(
                      'group relative flex flex-col p-2.5 rounded-xl cursor-pointer transition-all border border-transparent',
                      activeDocId === doc.id
                        ? 'bg-black/6 dark:bg-white/10 border-black/5 dark:border-white/8'
                        : 'hover:bg-black/4 dark:hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-xs truncate flex-1 text-foreground/85 leading-relaxed">
                        {doc.title || 'Untitled'}
                      </span>
                      <button
                        data-testid={`btn-delete-doc-${doc.id}`}
                        onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        aria-label="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground/50 mt-0.5">
                      {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Sidebar toggle */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-30">
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
              <Button
                variant="glass" size="icon"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl shadow-sm h-9 w-9 text-foreground/70 hover:text-foreground"
              >
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
        />
      </div>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
      </div>
    </div>
  );
}
