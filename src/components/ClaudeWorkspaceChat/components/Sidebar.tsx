import React, { useState, useRef } from 'react';
import { PANEL_BG } from '../../../constants/frostedSurfaces';
import { Chat, ProjectSpace } from '../types';
import { parseHtmlChatExport } from '../utils/importHtmlChat';
import {
  Plus,
  Search,
  MessageSquare,
  Package,
  Layers,
  Code,
  Briefcase,
  Palette,
  ChevronsUpDown,
  PanelLeft,
  Star,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Upload,
  FileCode,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  activeChatId?: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onToggleStarChat: (id: string) => void;
  onExportChat: (id: string) => void;
  onImportChat?: (chat: Chat) => void;
  projects: ProjectSpace[];
  activeProjectId?: string;
  onSelectProject: (id?: string) => void;
  onCreateProjectClick: () => void;
  onOpenSearchModal: () => void;
  onOpenSettingsModal: () => void;
  artifacts?: import('../types').Artifact[];
  activeArtifactId?: string;
  onSelectArtifact?: (art: import('../types').Artifact) => void;
  onToggleArtifacts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onToggleStarChat,
  onExportChat,
  onImportChat,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProjectClick,
  onOpenSearchModal,
  onOpenSettingsModal,
  artifacts = [],
  activeArtifactId,
  onSelectArtifact,
  onToggleArtifacts,
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && onImportChat) {
        const importedChat = parseHtmlChatExport(content, file.name);
        onImportChat(importedChat);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStartRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingChatId(null);
  };

  // Filter chats by project
  const filteredChats = activeProjectId
    ? chats.filter((c) => c.projectId === activeProjectId)
    : chats;

  return (
    <>
      {/* Container-scoped Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="absolute inset-0 z-20 bg-stone-950/20 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container - Scoped strictly to window container */}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex h-full w-72 shrink-0 flex-col border-r border-primary transition-all duration-300 md:relative md:translate-x-0 ${PANEL_BG} ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:-ml-72 opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Header Row: Claude title + Search + Close Sidebar */}
        <div className="flex items-center justify-between p-4 pb-2">
          <span className="font-serif text-xl font-medium text-primary tracking-tight">wim's ai bots</span>
          <div className="flex items-center gap-2 text-muted">
            <button
              onClick={onOpenSearchModal}
              className="p-1.5 rounded-lg hover:bg-light-3 hover:text-primary transition-colors"
              title="Search"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-light-3 hover:text-primary transition-colors"
              title="Close Sidebar"
            >
              <PanelLeft className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Navigation List (Exact Screenshot 2 Items) */}
        <div className="px-3 py-2 space-y-1">
          {/* Hidden File Input for HTML/JSON Chat Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".html,.htm,.json,.txt"
            className="hidden"
          />

          {/* + New chat */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
          >
            <Plus className="h-4 w-4 text-secondary" />
            <span>New chat</span>
          </button>

          {/* Import Chat (HTML / File) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
            title="import singlefile html or chat backup"
          >
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 text-amber-700" />
              <span>Import Chat</span>
            </div>
            <span className="rounded bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium">.html</span>
          </button>

          {/* Chats */}
          <button
            onClick={() => onSelectProject(undefined)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-normal transition-colors ${
              !activeProjectId ? 'bg-light-3 text-primary font-medium' : 'text-secondary hover:bg-light-3'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-secondary" />
              <span>Chats</span>
            </div>
            {chats.length > 0 && <span className="text-xs text-muted font-mono">{chats.length}</span>}
          </button>

          {/* Projects */}
          <button
            onClick={onCreateProjectClick}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-secondary" />
              <span>Projects</span>
            </div>
            {projects.length > 0 && (
              <span className="text-xs font-mono text-muted">{projects.length}</span>
            )}
          </button>

          {/* Artifacts */}
          <button
            onClick={() => onToggleArtifacts?.()}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4 text-secondary" />
              <span>Artifacts</span>
            </div>
            {artifacts.length > 0 && (
              <span className="text-xs font-mono text-muted">{artifacts.length}</span>
            )}
          </button>

          {/* Code with Upgrade Badge */}
          <button
            onClick={onOpenSettingsModal}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code className="h-4 w-4 text-secondary" />
              <span>Code</span>
            </div>
            <span className="rounded-md border border-primary bg-accent px-1.5 py-0.5 text-[10px] font-medium text-secondary">
              Upgrade
            </span>
          </button>

          {/* Customize */}
          <button
            onClick={onOpenSettingsModal}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
          >
            <Briefcase className="h-4 w-4 text-secondary" />
            <span>Customize</span>
          </button>

          {/* Section: Products */}
          <div className="pt-4 pb-1">
            <div className="px-3 text-[11px] font-normal text-muted tracking-wide">
              Products
            </div>
          </div>

          {/* Product Item: Design */}
          <button
            onClick={() => {
              /* Design product action */
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary hover:bg-light-3 transition-colors"
          >
            <Palette className="h-4 w-4 text-secondary" />
            <span>Design</span>
          </button>
        </div>

        {/* Scrollable Chat History & Generated Documents/Artifacts List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Active Chat History */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-medium text-muted uppercase tracking-wider">
              Recents
            </div>
            {filteredChats.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted font-normal">
                Your chats will show up here
              </div>
            ) : (
              filteredChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  isEditing={editingChatId === chat.id}
                  editTitle={editTitle}
                  onEditTitleChange={setEditTitle}
                  onSelect={() => {
                    onSelectChat(chat.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  onStartRename={(e) => handleStartRename(e, chat)}
                  onSaveRename={(e) => handleSaveRename(e, chat.id)}
                  onCancelRename={(e) => {
                    e.stopPropagation();
                    setEditingChatId(null);
                  }}
                  onToggleStar={(e) => {
                    e.stopPropagation();
                    onToggleStarChat(chat.id);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  onExport={(e) => {
                    e.stopPropagation();
                    onExportChat(chat.id);
                  }}
                />
              ))
            )}
          </div>

          {/* Generated Documents / Artifacts Under Sidebar Navigation */}
          {artifacts.length > 0 && (
            <div className="pt-2 space-y-1 border-t border-primary/40">
              <div className="flex items-center justify-between px-3 py-1 text-[11px] font-medium text-muted uppercase tracking-wider">
                <span>Documents & artifacts</span>
                <span className="font-mono text-[10px] text-muted">{artifacts.length}</span>
              </div>
              {artifacts.map((art) => {
                const isSelected = activeArtifactId === art.id;
                return (
                  <button
                    key={art.id}
                    onClick={() => {
                      onSelectArtifact?.(art);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-normal transition-colors text-left truncate ${
                      isSelected
                        ? 'bg-accent text-primary font-medium border border-primary/50'
                        : 'text-secondary hover:bg-light-3 hover:text-primary'
                    }`}
                    title={art.title}
                  >
                    <FileCode className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate flex-1">{art.title}</span>
                    <span className="text-[10px] font-mono uppercase text-muted bg-light-3 px-1 py-0.2 rounded shrink-0">
                      {art.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom User Profile Section (Exact Screenshot 2) */}
        <div
          onClick={onOpenSettingsModal}
          className="border-t border-primary p-3 bg-bg-primary flex items-center justify-between cursor-pointer hover:bg-light-3 transition-colors"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-700 text-white text-xs font-semibold">
              A
            </div>
            <div className="truncate text-left">
              <div className="text-sm font-medium text-primary truncate">ali</div>
              <div className="text-xs text-muted truncate">Free plan</div>
            </div>
          </div>

          <ChevronsUpDown className="h-4 w-4 text-muted shrink-0" />
        </div>
      </aside>
    </>
  );
};

// Subcomponent for chat row item
interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (v: string) => void;
  onSelect: () => void;
  onStartRename: (e: React.MouseEvent) => void;
  onSaveRename: (e: React.MouseEvent) => void;
  onCancelRename: (e: React.MouseEvent) => void;
  onToggleStar: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  isActive,
  isEditing,
  editTitle,
  onEditTitleChange,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onToggleStar,
  onDelete,
  onExport,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-normal transition-all ${
        isActive
          ? 'bg-light-3 text-primary font-medium'
          : 'text-secondary hover:bg-light-3'
      }`}
    >
      {isEditing ? (
        <div className="flex w-full items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="w-full rounded border border-primary bg-white px-1.5 py-0.5 text-xs text-primary focus:outline-none focus:border-primary"
            autoFocus
          />
          <button onClick={onSaveRename} className="text-emerald-600 hover:text-emerald-800">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCancelRename} className="text-muted hover:text-secondary">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="truncate pr-10">{chat.title}</span>

          {/* Action buttons on hover */}
          <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/90 rounded-md p-0.5">
            <button
              onClick={onToggleStar}
              className="p-1 text-muted hover:text-amber-500"
              title="Star"
            >
              <Star className={`h-3 w-3 ${chat.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
            <button onClick={onStartRename} className="p-1 text-muted hover:text-primary" title="Rename">
              <Edit2 className="h-3 w-3" />
            </button>
            <button onClick={onExport} className="p-1 text-muted hover:text-primary" title="Export">
              <Download className="h-3 w-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-muted hover:text-rose-600" title="Delete">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
