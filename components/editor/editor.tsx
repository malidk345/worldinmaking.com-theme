import { useEditor, EditorContent, Editor as EditorInstance } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Youtube } from '@tiptap/extension-youtube';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorBubbleMenu } from './bubble-menu';
import { SlashCommand, suggestion } from './slash-extension';
import { ImageDialog } from './image-dialog';
import { EmbedDialog } from './embed-dialog';
import { PublishPanel } from './publish-panel';
import { CalloutExtension } from './callout-extension';
import { Document } from '@/hooks/use-documents';
import { EditorSettings } from '@/hooks/use-editor-settings';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ImageIcon, Trash2, CheckCircle2, RefreshCw, Check, Save } from 'lucide-react';
import { LemonButton, LemonTag } from '@/components/LemonUI';

const lowlight = createLowlight(common);

const FONT_MAP = { system: 'font-sans', serif: 'font-serif', mono: 'font-mono' };
const SIZE_MAP = { sm: 'editor-size-sm', md: 'editor-size-md', lg: 'editor-size-lg' };
const LH_MAP = { tight: 'editor-lh-tight', normal: 'editor-lh-normal', relaxed: 'editor-lh-relaxed' };
const WIDTH_MAP = { narrow: 'max-w-xl', normal: 'max-w-2xl', wide: 'max-w-4xl' };

interface EditorProps {
  document: Document | null;
  onChange: (updates: Partial<Document>) => void;
  sidebarOpen: boolean;
  settings: EditorSettings;
  focusMode: boolean;
  onEditorReady?: (editor: EditorInstance) => void;
  onCreateDocument?: () => void;
}

// ── Cover image component ──────────────────────────────────────────────
function CoverImage({ src, onRemove, onReplace }: { src: string; onRemove: () => void; onReplace: (s: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = e => onReplace(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onReplace]);

  return (
    <div className="relative group w-full h-52 rounded-2xl overflow-hidden mb-7 border border-border/20 bg-black/5 dark:bg-white/5">
      <img src={src} alt="Cover" className="w-full h-full object-cover" />
      {/* hover controls */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-end justify-end gap-2 p-3 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 hover:bg-black/70 rounded-xl px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          <ImageIcon size={11} /> Replace
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 hover:bg-red-600/80 rounded-xl px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          <Trash2 size={11} /> Remove
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
    </div>
  );
}

// ── "Add cover" prompt ────────────────────────────────────────────────
function AddCoverPrompt({ onAdd }: { onAdd: (src: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = e => onAdd(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onAdd]);

  return (
    <div className="flex items-center gap-1.5 mb-4 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1 rounded-lg"
      >
        <ImageIcon size={12} />
        Add cover image
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────────
export function Editor({ document, onChange, sidebarOpen, settings, focusMode, onEditorReady, onCreateDocument }: EditorProps) {
  const [isSaved, setIsSaved] = useState(true);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const img = () => setShowImageDialog(true);
    const emb = () => setShowEmbedDialog(true);
    window.addEventListener('craft:openImageDialog', img);
    window.addEventListener('craft:openEmbedDialog', emb);
    return () => { window.removeEventListener('craft:openImageDialog', img); window.removeEventListener('craft:openEmbedDialog', emb); };
  }, []);

  // Close publish panel when document changes
  useEffect(() => { setShowPublishPanel(false); }, [document?.id]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: { levels: [1, 2, 3] }, underline: false, link: false }),
      Placeholder.configure({ placeholder: 'Start writing… or type / for commands' }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
      Highlight.configure({ multicolor: true }),
      Typography,
      TextStyle,
      Color,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({ inline: false, allowBase64: true }),
      TaskList, TaskItem.configure({ nested: true }),
      Superscript, Subscript,
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Youtube.configure({ inline: false, modestBranding: true, width: 640, height: 360 }),
      CalloutExtension,
      SlashCommand.configure({ suggestion }),
    ],
    content: document?.content || '',
    editorProps: { attributes: { class: 'craft-prose focus:outline-none' } },
    onUpdate: ({ editor }) => {
      setIsSaved(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onChange({ content: editor.getJSON() });
        setIsSaved(true);
      }, 800);
    },
  });

  const currentDocIdRef = useRef(document?.id);
  const editorRef = useRef<EditorInstance | null>(null);
  useEffect(() => {
    if (editor && document) {
      if (currentDocIdRef.current !== document.id) {
        editor.commands.setContent(document.content || '');
        currentDocIdRef.current = document.id;
        setIsSaved(true);
      }
    }
  }, [editor, document]);

  useEffect(() => {
    if (editor && editor !== editorRef.current) {
      editorRef.current = editor;
      if (onEditorReady) onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }, []);

  const insertImage = (src: string, alt?: string) => editor?.chain().focus().setImage({ src, alt: alt ?? '' }).run();
  const insertEmbed = (id: string) => editor?.chain().focus().setYoutubeVideo({ src: id }).run();

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center space-y-5">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-foreground/5 flex items-center justify-center">
            <div className="w-8 h-12 rounded-md border-2 border-foreground/20" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground/50">No document selected</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Create a new document to start writing.</p>
          </div>
          {onCreateDocument && (
            <button
              type="button"
              onClick={onCreateDocument}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-foreground text-background text-sm font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New document
            </button>
          )}
        </div>
      </div>
    );
  }

  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const goal = settings.wordCountGoal;
  const progress = goal ? Math.min(100, Math.round((wordCount / goal) * 100)) : 0;
  const isPublished = !!document.published;

  return (
    <div className={cn('relative w-full h-full flex flex-col overflow-hidden', FONT_MAP[settings.fontFamily], SIZE_MAP[settings.fontSize], LH_MAP[settings.lineHeight])}>
      {editor && <EditorBubbleMenu editor={editor} onInsertImage={() => setShowImageDialog(true)} />}
      <ImageDialog open={showImageDialog} onClose={() => setShowImageDialog(false)} onInsert={insertImage} />
      <EmbedDialog open={showEmbedDialog} onClose={() => setShowEmbedDialog(false)} onInsert={insertEmbed} />
      <PublishPanel
        open={showPublishPanel}
        onClose={() => setShowPublishPanel(false)}
        document={document}
        onUpdate={onChange}
      />

      {/* Workspace Top Action Bar (No border-b line, container style controls) */}
      <div className={cn(
        'flex-none h-11 flex items-center px-4 md:px-6 gap-3 bg-transparent transition-all duration-300 font-sans',
        focusMode && 'opacity-0 h-0 border-none overflow-hidden',
        !sidebarOpen && !focusMode ? 'pl-16' : ''
      )}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <span className="hidden sm:inline text-[11px]">Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-black/5 dark:bg-white/10 rounded border border-border/30 text-foreground/70">/</kbd> for commands</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* LemonTag for Saved status */}
          <LemonTag
            type="default"
            icon={isSaved ? <Save size={13} className="shrink-0 opacity-80" /> : <RefreshCw size={13} className="animate-spin shrink-0 opacity-60" />}
          >
            {isSaved ? 'Saved' : 'Saving...'}
          </LemonTag>

          {/* LemonButton for Publish */}
          <LemonButton
            type={isPublished ? 'secondary' : 'primary'}
            size="small"
            icon={isPublished ? <Check size={13} /> : <Globe size={13} />}
            onClick={() => setShowPublishPanel(v => !v)}
          >
            {isPublished ? 'Published' : 'Publish'}
          </LemonButton>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className={cn('group/canvas mx-auto pt-10 pb-40 px-6 md:px-10 transition-all duration-300', WIDTH_MAP[settings.contentWidth])}>

          {/* Cover image */}
          {document.coverImage ? (
            <CoverImage
              src={document.coverImage}
              onRemove={() => onChange({ coverImage: undefined })}
              onReplace={src => onChange({ coverImage: src })}
            />
          ) : (
            <AddCoverPrompt onAdd={src => onChange({ coverImage: src })} />
          )}

          <input
            type="text" value={document.title}
            onChange={e => { setIsSaved(false); onChange({ title: e.target.value }); if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(() => setIsSaved(true), 800); }}
            className="w-full text-2xl md:text-3xl font-bold bg-transparent outline-none border-none placeholder:text-muted-foreground/20 text-foreground tracking-tight font-sans mb-6 block"
            placeholder="Untitled" data-testid="input-document-title-canvas"
          />
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Bottom status bar */}
      <div className={cn('absolute bottom-5 right-6 pointer-events-none select-none flex items-center gap-2 transition-all duration-300', focusMode && 'opacity-0')}>
        {goal > 0 && (
          <span className="text-xs text-muted-foreground/50 bg-background/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border/20 flex items-center gap-1.5">
            <span className="w-12 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <span className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </span>
            {wordCount}/{goal}
          </span>
        )}
        <span className="text-xs text-muted-foreground/40 bg-background/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border/20">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        {/* Saved indicator */}
        <AnimatePresence mode="wait">
          <motion.span
            key={isSaved ? 'saved' : 'saving'}
            initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 bg-background/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border/20"
          >
            <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', isSaved ? 'bg-green-400/70' : 'bg-gray-400 animate-pulse')} />
            {isSaved ? 'Saved' : 'Saving…'}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
