import React, { useState, useRef, useEffect } from 'react';
import { ModelId, ModelOption, ProjectSpace } from '../types';
import {
  PanelLeft,
  ChevronDown,
  Edit2,
  X,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { TASKBAR_BG } from '../../../constants/frostedSurfaces';

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
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onToggleSidebar,
  onOpenSettingsModal,
  onClose,
  activeChatTitle,
  hasMessages,
  activeNotebookMeta,
  isArtifactsOpen,
  onToggleArtifacts,
  hasArtifacts,
}) => {
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const titleDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];
  const showChatTitle = Boolean(hasMessages || activeChatTitle) && !activeNotebookMeta;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target as Node)) {
        setShowTitleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="sticky top-0 z-30 p-1 w-full pointer-events-auto">
      <header className={`flex h-10 w-full items-center justify-between px-3 text-primary select-none border border-primary rounded-xl shadow-2xs ${TASKBAR_BG}`}>

        {/* Left: Sidebar Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded-lg text-secondary hover:bg-accent transition-colors cursor-pointer focus:outline-none"
            title="Toggle Sidebar"
          >
            <PanelLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[1.7]" />
          </button>
        </div>

        {/* Center: Dynamic Context Bar */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-2">
          {activeNotebookMeta ? (
            /* ── Notebook Context: show notebook title as a link ── */
            <a
              href={activeNotebookMeta.path}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg hover:bg-accent transition-all group max-w-[280px]"
              title={`Notebook: ${activeNotebookMeta.title}`}
            >
              <BookOpen className="h-3.5 w-3.5 text-secondary shrink-0" />
              <span className="truncate text-xs sm:text-[13px] font-medium text-primary tracking-tight">
                {activeNotebookMeta.title}
              </span>
              <ExternalLink className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          ) : showChatTitle ? (
            /* ── Chat Title with settings dropdown ── */
            <div className="relative flex items-center justify-center max-w-[200px] sm:max-w-[320px]" ref={titleDropdownRef}>
              <button
                onClick={() => setShowTitleDropdown((prev) => !prev)}
                className="group flex items-center gap-1.5 hover:bg-accent px-2 py-0.5 rounded-lg transition-all cursor-pointer focus:outline-none"
                title={activeChatTitle}
              >
                <span className="truncate text-xs sm:text-sm font-medium text-primary tracking-tight">
                  {activeChatTitle || 'Yeni Sohbet'}
                </span>
                <ChevronDown className={`h-3 w-3 text-muted shrink-0 stroke-[2] transition-transform duration-200 ${showTitleDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showTitleDropdown && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-52 rounded-xl border border-primary bg-bg-primary p-2 shadow-xl text-xs space-y-1 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-primary/40 pb-1">
                    Sohbet
                  </div>
                  <button
                    onClick={() => {
                      setShowTitleDropdown(false);
                      onOpenSettingsModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-secondary hover:bg-accent hover:text-primary transition-colors text-left"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted" />
                    <span>Ayarlar</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right: Artifacts toggle + Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasArtifacts && (
            <button
              onClick={onToggleArtifacts}
              className={`p-1.5 rounded-lg text-secondary hover:bg-accent transition-colors cursor-pointer text-xs font-medium ${isArtifactsOpen ? 'bg-accent text-primary' : ''}`}
              title="Artifacts Paneli"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
                <path d="M7.5 11c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
                <path d="M7.5 15c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
              </svg>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted hover:bg-accent hover:text-primary transition-colors cursor-pointer"
              title="Paneli Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>
    </div>
  );
};
