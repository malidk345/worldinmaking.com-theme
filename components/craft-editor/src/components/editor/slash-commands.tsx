import { Editor } from '@tiptap/react';
import {
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered,
  Quote, Minus, CodeSquare, ImageIcon, CheckSquare, Table, Youtube,
  Info, AlertTriangle, CheckCircle, XCircle, Lightbulb,
} from 'lucide-react';

export const getSlashCommands = () => [
  {
    title: 'Text',
    description: 'Plain paragraph text.',
    searchTerms: ['p', 'paragraph', 'plain'],
    icon: <Pilcrow size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    searchTerms: ['title', 'large', 'h1'],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    searchTerms: ['subtitle', 'medium', 'h2'],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    searchTerms: ['subtitle', 'small', 'h3'],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a bulleted list.',
    searchTerms: ['unordered', 'point', 'ul'],
    icon: <List size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list.',
    searchTerms: ['ordered', 'ol', 'number'],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with checkboxes.',
    searchTerms: ['todo', 'task', 'checkbox', 'check'],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote or callout.',
    searchTerms: ['blockquote', 'callout'],
    icon: <Quote size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Syntax-highlighted code snippet.',
    searchTerms: ['codeblock', 'code', 'pre'],
    icon: <CodeSquare size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a 3×3 table.',
    searchTerms: ['table', 'grid', 'sheet'],
    icon: <Table size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Image',
    description: 'Insert an image from URL or upload.',
    searchTerms: ['picture', 'photo', 'img', 'upload'],
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent('craft:openImageDialog'));
    },
  },
  {
    title: 'YouTube',
    description: 'Embed a YouTube video.',
    searchTerms: ['youtube', 'video', 'embed'],
    icon: <Youtube size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent('craft:openEmbedDialog'));
    },
  },
  {
    title: 'Info Callout',
    description: 'Blue information box.',
    searchTerms: ['callout', 'info', 'note'],
    icon: <Info size={18} className="text-blue-500" />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'info' }).run();
    },
  },
  {
    title: 'Warning Callout',
    description: 'Yellow warning box.',
    searchTerms: ['callout', 'warning', 'alert'],
    icon: <AlertTriangle size={18} className="text-amber-500" />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'warning' }).run();
    },
  },
  {
    title: 'Success Callout',
    description: 'Green success box.',
    searchTerms: ['callout', 'success', 'done'],
    icon: <CheckCircle size={18} className="text-green-500" />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'success' }).run();
    },
  },
  {
    title: 'Error Callout',
    description: 'Red error box.',
    searchTerms: ['callout', 'error', 'danger'],
    icon: <XCircle size={18} className="text-red-500" />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'error' }).run();
    },
  },
  {
    title: 'Tip Callout',
    description: 'Purple tip box.',
    searchTerms: ['callout', 'tip', 'idea'],
    icon: <Lightbulb size={18} className="text-violet-500" />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'tip' }).run();
    },
  },
  {
    title: 'Divider',
    description: 'Visually separate content.',
    searchTerms: ['line', 'hr', 'separator', 'rule'],
    icon: <Minus size={18} />,
    command: ({ editor, range }: { editor: Editor; range: any }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];
