import React, { useRef } from 'react';
import { ModelId, ModelOption, ProjectSpace, Chat } from '../types';
import {
  PanelLeft,
  X,
  Plus,
  Globe,
  Sparkles,
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
  onToggleSidebar,
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayChats = chats.slice(0, 8);

  // Format full host url like screenshot e.g. localhost:3000/notebooks#/notebook/xxx
  const getFullUrlPath = (path: string) => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      return `${host}${path.startsWith('/') ? path : '/' + path}`;
    }
    return path;
  };

  // Mouse wheel horizontal scroll handler for tab bar
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="sticky top-0 z-30 w-full pointer-events-auto select-none">
      {/* Clean header with no heavy bottom border */}
      <header className="flex h-10 w-full items-center justify-between px-2 bg-[#f4f4f5] dark:bg-[#18181b] gap-1 font-sans">

        {/* Clean Sidebar Toggle on Far Left */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4 stroke-[1.6]" />
          </button>
        </div>

        {/* Tab Strip Container — Wheel & Touch Drag Scrollable */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 py-1 px-1 touch-pan-x scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {/* 🌐 Active Browser Tab (Notebook URL) */}
            {activeNotebookMeta && (
              <motion.div
                key="notebook-tab"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-stone-900 border border-black/10 dark:border-white/10 text-neutral-800 dark:text-neutral-100 text-xs font-normal shadow-2xs max-w-[200px] sm:max-w-[280px] shrink-0"
                title={getFullUrlPath(activeNotebookMeta.path)}
              >
                <Globe className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 stroke-[1.6] shrink-0" />
                <span className="truncate text-[11px] font-sans tracking-tight">
                  {getFullUrlPath(activeNotebookMeta.path)}
                </span>
                {onCloseNotebookContext && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseNotebookContext();
                    }}
                    className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white shrink-0 ml-1 cursor-pointer"
                    title="Close"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </motion.div>
            )}

            {/* 💬 Chat Tabs (Slightly Rounded, Clean Separation) */}
            {displayChats.map((chat) => {
              const isActive = chat.id === activeChatId && !activeNotebookMeta;
              return (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onSelectChat?.(chat.id)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-normal transition-colors cursor-pointer max-w-[130px] sm:max-w-[180px] shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-stone-900 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-neutral-100 shadow-2xs font-medium'
                      : 'bg-neutral-200/40 hover:bg-neutral-200/80 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 border border-transparent'
                  }`}
                  title={chat.title || 'New chat'}
                >
                  <Sparkles className={`h-3.5 w-3.5 shrink-0 stroke-[1.6] ${isActive ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400'}`} />
                  <span className="truncate text-[11px] tracking-tight">
                    {chat.title || 'New chat'}
                  </span>
                  {chats.length > 1 && onCloseChat && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseChat(chat.id);
                      }}
                      className={`p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white shrink-0 ml-auto cursor-pointer ${
                        isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Close"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Plus (+) Button for Opening New Chat */}
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer ml-0.5"
            title="New chat"
          >
            <Plus className="h-3.5 w-3.5 stroke-[1.8]" />
          </button>
        </div>

        {/* Right Actions: Artifacts & Close */}
        <div className="flex items-center gap-1 shrink-0 pl-1">
          {hasArtifacts && (
            <button
              type="button"
              onClick={onToggleArtifacts}
              className={`p-1.5 rounded-md text-neutral-600 hover:text-black dark:text-neutral-300 transition-colors cursor-pointer text-xs ${
                isArtifactsOpen ? 'bg-white dark:bg-stone-800 shadow-2xs' : 'hover:bg-neutral-200/60'
              }`}
              title="Artifacts"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
                <path d="M7.5 11c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
                <path d="M7.5 15c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
              </svg>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>
    </div>
  );
};
