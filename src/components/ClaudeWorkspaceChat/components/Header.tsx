import React, { useState, useRef, useEffect } from 'react';
import { ModelId, ModelOption, ProjectSpace } from '../types';
import {
  PanelLeft,
  ChevronDown,
  Check,
  Edit2,
  X,
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
}

// 1:1 Exact Wavy Document Icon matching screenshot right-side button
export const WavyDocIcon: React.FC<{ className?: string }> = ({
  className = 'h-5 w-5 text-primary',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
    <path d="M7.5 11c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
    <path d="M7.5 15c0.9-0.7 1.8-0.7 2.7 0s1.8 0.7 2.7 0 1.8-0.7 2.7 0" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onToggleSidebar,
  onOpenShareModal,
  onToggleArtifacts,
  isArtifactsOpen,
  activeChatTitle,
  hasMessages,
  onOpenSettingsModal,
  onClose,
}) => {
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const titleDropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];
  const showTitle = Boolean(hasMessages || activeChatTitle);

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


        {/* Center: Active Title */}
        {showTitle ? (
          <div className="relative flex items-center justify-center max-w-[160px] sm:max-w-[300px]" ref={titleDropdownRef}>
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

            {/* Title Options Popover */}
            {showTitleDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-60 rounded-xl border border-primary bg-bg-primary p-2 shadow-xl text-xs space-y-1 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-primary/40 pb-1">
                  Sohbet Seçenekleri
                </div>
                <button
                  onClick={() => {
                    setShowTitleDropdown(false);
                    onOpenShareModal();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-secondary hover:bg-accent hover:text-primary transition-colors text-left"
                >
                  <span>Sohbeti Paylaş</span>
                  <Check className="h-3.5 w-3.5 text-muted" />
                </button>
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

        {/* Right Controls: Wavy Document Icon + White 'Share' Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleArtifacts}
            className={`p-1 rounded-lg text-secondary hover:bg-accent transition-colors cursor-pointer ${
              isArtifactsOpen ? 'bg-accent' : ''
            }`}
            title="Artifacts"
          >
            <WavyDocIcon className="h-4 w-4 text-primary" />
          </button>

          <button
            onClick={onOpenShareModal}
            className="rounded-lg border border-primary bg-bg-primary px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-accent transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 cursor-pointer"
          >
            Share
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted hover:bg-accent hover:text-primary transition-colors cursor-pointer ml-1"
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

