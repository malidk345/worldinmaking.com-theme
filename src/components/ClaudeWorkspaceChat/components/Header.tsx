import React, { useState, useRef, useEffect } from 'react';
import { ModelId, ModelOption, ProjectSpace, Chat } from '../types';
import {
  PanelLeft,
  ChevronDown,
  Edit2,
  X,
  Plus,
  Globe,
  Sparkles,
  Settings,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  models: ModelOption[];
  selectedModelId: ModelId;
  onSelectModel: (id: ModelId) => void;
  projects?: ProjectSpace[];
  activeProjectId?: string;
  onSelectProject?: (id?: string) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenSearchModal: () => void;
  onOpenShareModal: () => void;
  hasArtifacts: boolean;
  onToggleArtifacts: () => void;
  isArtifactsOpen: boolean;
  activeChatTitle?: string;
  hasMessages?: boolean;
  onOpenSettingsModal: () => void;
  onClose?: () => void;
  /** If a notebook window is focused, this carries its title + path */
  activeNotebookMeta?: { title: string; path: string } | null;
  /** All active chats for browser tab bar */
  chats?: Chat[];
  activeChatId?: string;
  onSelectChat?: (id: string) => void;
  onCloseChat?: (id: string) => void;
  onCloseNotebookContext?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onToggleSidebar,
  onOpenSettingsModal,
  onClose,
  activeNotebookMeta,
  isArtifactsOpen,
  onToggleArtifacts,
  hasArtifacts,
  chats = [],
  activeChatId,
  onSelectChat,
  onCloseChat,
  onNewChat,
  onCloseNotebookContext,
}) => {
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const titleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target as Node)) {
        setShowTitleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const displayChats = chats.slice(0, 6);

  // Format full host url like screenshot e.g. localhost:3000/notebooks#/notebook/xxx
  const getFullUrlPath = (path: string) => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      return `${host}${path.startsWith('/') ? path : '/' + path}`;
    }
    return path;
  };

  return (
    <div className="sticky top-0 z-30 w-full pointer-events-auto select-none">
      <header className="flex h-11 w-full items-center justify-between px-2 bg-[#f0f0f1] dark:bg-[#18181b] border-b border-black/10 dark:border-white/10 gap-1 font-sans shadow-2xs">

        {/* 1:1 Screenshot Left Button: Square white card with Downward Chevron `v` */}
        <div className="flex items-center gap-1 shrink-0 relative">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTitleDropdown((prev) => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-stone-800 border border-black/10 dark:border-white/10 shadow-2xs text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
            title="Sohbet Menüsü & Ayarlar"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showTitleDropdown ? 'rotate-180' : ''}`} />
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Sidebar Aç/Kapat"
          >
            <PanelLeft className="h-4 w-4 stroke-[1.7]" />
          </motion.button>

          <AnimatePresence>
            {showTitleDropdown && (
              <motion.div
                ref={titleDropdownRef}
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-primary bg-bg-primary p-2 shadow-xl text-xs space-y-1 z-50 backdrop-blur-md"
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-primary/40 pb-1 flex items-center justify-between">
                  <span>Sohbet Menüsü</span>
                  <Zap className="h-3 w-3 text-amber-500" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTitleDropdown(false);
                    onOpenSettingsModal();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-secondary hover:bg-accent hover:text-primary transition-colors text-left cursor-pointer font-medium"
                >
                  <Settings className="h-3.5 w-3.5 text-muted" />
                  <span>Model & Görünüm Ayarları</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 1:1 Screenshot Browser Tab Strip Container with framer-motion */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 py-0.5 px-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {/* 🌐 Active Browser Tab (Notebook URL) */}
            {activeNotebookMeta && (
              <motion.div
                key="notebook-tab"
                layout
                initial={{ opacity: 0, scale: 0.92, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl rounded-b-xs bg-white dark:bg-stone-900 border-t border-x border-black/10 dark:border-white/10 text-neutral-800 dark:text-neutral-100 text-xs font-normal shadow-2xs max-w-[220px] sm:max-w-[320px] shrink-0"
                title={getFullUrlPath(activeNotebookMeta.path)}
              >
                {/* Active Indicator Pulse Dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Globe className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300 stroke-[1.7] shrink-0" />
                <span className="truncate text-[12px] font-sans tracking-tight font-medium">
                  {getFullUrlPath(activeNotebookMeta.path)}
                </span>
                {onCloseNotebookContext && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseNotebookContext();
                    }}
                    className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white shrink-0 ml-1 cursor-pointer"
                    title="Kapat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* 💬 Chat Tabs (Matching 1:1 Screenshot visually with motion) */}
            {displayChats.map((chat) => {
              const isActive = chat.id === activeChatId && !activeNotebookMeta;
              return (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: 2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => onSelectChat?.(chat.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl rounded-b-xs text-xs font-normal transition-colors cursor-pointer max-w-[140px] sm:max-w-[200px] shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-stone-900 border-t border-x border-black/10 dark:border-white/10 text-neutral-900 dark:text-neutral-100 shadow-2xs font-medium'
                      : 'bg-transparent hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400'
                  }`}
                  title={chat.title || 'Yeni Sohbet'}
                >
                  <Sparkles className={`h-3.5 w-3.5 shrink-0 stroke-[1.7] ${isActive ? 'text-primary' : 'text-neutral-400'}`} />
                  <span className="truncate text-[12px] tracking-tight">
                    {chat.title || 'Yeni Sohbet'}
                  </span>
                  {chats.length > 1 && onCloseChat && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseChat(chat.id);
                      }}
                      className={`p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white shrink-0 ml-auto cursor-pointer transition-opacity ${
                        isActive ? 'opacity-75' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Kapat"
                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 1:1 Screenshot: Thin Divider `|` and Plus (+) Button */}
          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 shrink-0 mx-1" />
          <motion.button
            type="button"
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onNewChat}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
            title="Yeni Sohbet (+)"
          >
            <Plus className="h-4 w-4 stroke-[2]" />
          </motion.button>
        </div>

        {/* Right Actions: Artifacts & Close */}
        <div className="flex items-center gap-1 shrink-0 pl-1">
          {hasArtifacts && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleArtifacts}
              className={`p-1.5 rounded-lg text-neutral-600 hover:text-black dark:text-neutral-300 transition-colors cursor-pointer text-xs ${
                isArtifactsOpen ? 'bg-white dark:bg-stone-800 shadow-2xs' : 'hover:bg-neutral-200/60'
              }`}
              title="Artifacts Paneli"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
                <path d="M7.5 11c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
                <path d="M7.5 15c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
              </svg>
            </motion.button>
          )}

          {onClose && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Paneli Kapat"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </header>
    </div>
  );
};
