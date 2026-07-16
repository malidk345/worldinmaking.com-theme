import React from 'react'
import {
  Folder, Archive, BookOpen, Notebook, Inbox, Briefcase, Code, Terminal,
  Settings, Compass, Target, Zap, Coffee, FileText, Star, Bookmark, Sparkles, Heart
} from 'lucide-react'

export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Folder / General Icons
  'folder': Folder,
  'archive': Archive,
  'book-open': BookOpen,
  'notebook': Notebook,
  'inbox': Inbox,
  'briefcase': Briefcase,
  'code': Code,
  'terminal': Terminal,
  'settings': Settings,
  'compass': Compass,
  'target': Target,
  'zap': Zap,
  'coffee': Coffee,

  // Document Icons
  'file-text': FileText,
  'star': Star,
  'bookmark': Bookmark,
  'sparkles': Sparkles,
  'heart': Heart,
}

export const FOLDER_ICONS = [
  'folder', 'archive', 'book-open', 'notebook', 'inbox', 'briefcase', 'code', 'terminal', 'settings', 'compass', 'target', 'zap'
]

export const DOC_ICONS = [
  'file-text', 'star', 'bookmark', 'sparkles', 'heart', 'code', 'terminal', 'zap'
]

export function RenderIcon({ name, className, size = 14 }: { name: string; className?: string; size?: number }) {
  const IconComponent = ICON_MAP[name] || (name.startsWith('folder') ? Folder : FileText)
  return <IconComponent className={className} size={size} />
}
