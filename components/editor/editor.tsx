/* eslint-disable */
import { useEditor, EditorContent } from '@tiptap/react';
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
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useState } from 'react';
import { EditorBubbleMenu } from './bubble-menu';
import { SlashCommand, suggestion } from './slash-extension';
import { ImageDialog } from './image-dialog';
import { Document } from '@/hooks/use-documents';
import { EditorSettings } from '@/hooks/use-editor-settings';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const lowlight = createLowlight(common);

const FONT_MAP = {
  system: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};
const SIZE_MAP = {
  sm: 'editor-size-sm',
  md: 'editor-size-md',
  lg: 'editor-size-lg',
};
const LH_MAP = {
  tight: 'editor-lh-tight',
  normal: 'editor-lh-normal',
  relaxed: 'editor-lh-relaxed',
};
const WIDTH_MAP = {
  narrow: 'max-w-xl',
  normal: 'max-w-2xl',
  wide: 'max-w-4xl',
};

interface EditorProps {
  document: Document | null;
  onChange: (updates: Partial<Document>) => void;
  sidebarOpen: boolean;
  settings: EditorSettings;
}

export function Editor({ document, onChange, sidebarOpen, settings }: EditorProps) {
  const [isSaved, setIsSaved] = useState(true);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Listen for slash-command image trigger
  useEffect(() => {
    const handler = () => setShowImageDialog(true);
    window.addEventListener('craft:openImageDialog', handler);
    return () => window.removeEventListener('craft:openImageDialog', handler);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        underline: false,
        link: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing… or type / for commands',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Highlight.configure({ multicolor: true }),
      Typography,
      TextStyle,
      Color,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Superscript,
      Subscript,
      CharacterCount,
      SlashCommand.configure({ suggestion }),
    ],
    content: document?.content || '',
    editorProps: {
      attributes: {
        class: 'craft-prose focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setIsSaved(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onChange({ content: editor.getJSON() });
        setIsSaved(true);
      }, 800);
    },
  });

  // Swap content when document changes
  const currentDocIdRef = useRef(document?.id);
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
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  const insertImage = (src: string, alt?: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src, alt: alt ?? '' }).run();
    }
  };

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-foreground/5 flex items-center justify-center">
            <div className="w-8 h-12 rounded-md border-2 border-foreground/20" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground/50">No document selected</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Create a new document to start writing.</p>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  return (
    <div className={cn('relative w-full h-full flex flex-col overflow-hidden', FONT_MAP[settings.fontFamily], SIZE_MAP[settings.fontSize], LH_MAP[settings.lineHeight])}>
      {editor && <EditorBubbleMenu editor={editor} onInsertImage={() => setShowImageDialog(true)} />}

      <ImageDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onInsert={insertImage}
      />

      {/* Slim header — title only */}
      <div className={cn(
        'flex-none h-12 border-b border-border/20 flex items-center px-5 gap-3 bg-background/50 backdrop-blur-sm transition-all',
        !sidebarOpen ? 'pl-16' : ''
      )}>
        <input
          type="text"
          value={document.title}
          onChange={e => {
            setIsSaved(false);
            onChange({ title: e.target.value });
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => setIsSaved(true), 800);
          }}
          className="flex-1 text-sm font-semibold bg-transparent outline-none border-none placeholder:text-muted-foreground/30 text-foreground"
          placeholder="Untitled"
          data-testid="input-document-title"
        />
        <button
          type="button"
          onClick={() => {
            onChange({ published: !document.published });
          }}
          className={cn(
            "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded transition-all select-none hover:opacity-85 shrink-0",
            document.published 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25" 
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
          )}
        >
          {document.published ? 'Live' : 'Draft'}
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={isSaved ? 'saved' : 'saving'}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 shrink-0 select-none"
          >
            <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', isSaved ? 'bg-green-400/80' : 'bg-amber-400 animate-pulse')} />
            {isSaved ? 'Saved' : 'Saving…'}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className={cn('mx-auto pt-10 pb-40 px-6 md:px-10 transition-all duration-300', WIDTH_MAP[settings.contentWidth])}>
          {/* Document title in canvas — compact */}
          <input
            type="text"
            value={document.title}
            onChange={e => {
              setIsSaved(false);
              onChange({ title: e.target.value });
              if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
              saveTimeoutRef.current = setTimeout(() => setIsSaved(true), 800);
            }}
            className="w-full text-2xl md:text-3xl font-bold bg-transparent outline-none border-none placeholder:text-muted-foreground/20 text-foreground tracking-tight font-sans mb-6 block"
            placeholder="Untitled"
            data-testid="input-document-title-canvas"
          />
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Bottom word count */}
      <div className="absolute bottom-5 right-6 pointer-events-none select-none">
        <span className="text-xs text-muted-foreground/40 bg-background/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border/20">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    </div>
  );
}
