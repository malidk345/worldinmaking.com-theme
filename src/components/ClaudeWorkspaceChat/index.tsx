import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  Chat,
  Message,
  ModelId,
  ModelOption,
  ProjectSpace,
  StylePresetId,
  Artifact,
  ArtifactOrigin,
  ToolTrace,
  WebCitation,
  UserSettings,
  FileAttachment,
} from './types';
import {
  AVAILABLE_MODELS,
  INITIAL_CHATS,
  INITIAL_PROJECTS,
  STYLE_PRESETS,
} from './data/initialData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ArtifactsPanel } from './components/ArtifactsPanel';
import { ArtifactWindowContent } from './components/ArtifactWindowContent';
import { SourcesPanel } from './components/SourcesPanel';
import { SearchModal } from './components/SearchModal';
import { ProjectModal } from './components/ProjectModal';
import { SettingsModal } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { motion, AnimatePresence } from 'framer-motion';
import * as Portal from '@radix-ui/react-portal';
import { useApp, useAppWindows } from '../../context/App';
import { WINDOW_BG } from '../../constants/frostedSurfaces';
import { getNotebook, getNotebooks, createNotebook } from '../../notebook-app/scenes/notebooks/notebookStorage';
import {
  NOTEBOOK_CHAT_BIND_EVENT,
  type NotebookChatBind,
  buildNotebookAgentContext,
  readNotebookChatBind,
  readNotebookSelection,
} from '../../lib/notebook-chat-bind';
import { IconDocument } from '@posthog/icons';
import { messageToNotebookMarkdown } from '../../lib/notebook-artifact-block';
import { finalizeArtifactTurn } from '../../lib/artifacts';
import type { OSActionCard as OSActionCardType } from './types';
import { dedupeArtifacts } from './utils/extractArtifacts';
import { processArtifactRevision } from './utils/toolCalling';
import { parseAiSseEvent, type AiArtifact } from 'lib/ai/contracts';
import { toolStatusLabel } from '../../lib/bots/tools/labels';
import { parseChartSpec, stripChartArtifactMarkup } from 'lib/ai/chart-artifacts';

import { prepareSandpackSource } from './sandbox/reactPreview';
import { stripThinkingBlocks } from 'lib/bots/thinking-tags';
import { ensureLemonStyles, releaseLemonStyles } from 'lib/lemon/ensureLemonStyles';
import {
  chatAuthHeaders,
  claimDeviceAccountOnLogin,
  deleteChatOnRemote,
  getChatStorageKey,
  startWorkspaceChatPolling,
  subscribeToWorkspaceChats,
  mergeChats,
  pullChatsFromRemote,
  pushChatToRemote,
  readLocalChats,
  readLocalDeletedChatIds,
  rememberDeletedChatId,
  setRemoteChatShare,
  setRemoteMessageLiked,
  writeLocalChats,
} from '../../lib/chat-remote';
import { WIM_IDENTITY_EVENT } from '../../lib/wim-identity';

const EMPTY_STARTERS = [
  { label: 'What’s open?', prompt: 'Which windows are open right now, and what can I do next in this OS?' },
  { label: 'Search the site', prompt: 'Search this site for notebooks and writing about unfinished work.' },
  { label: 'Today’s AI news', prompt: 'Bugün yapay zeka haberlerinde öne çıkan 3 gelişmeyi kaynaklarıyla yaz.' },
  { label: 'Draw a flow', prompt: 'Draw a mermaid diagram of a checkout flow: cart, pay, done.' },
]

const NOTEBOOK_STARTERS = [
  { label: 'Add a section', prompt: 'Bu deftere kısa bir saha notları bölümü ekle.' },
  { label: 'Summarize this', prompt: 'Bu notebook’u kısaca özetle ve özeti deftere ekle.' },
  { label: 'Draw the outline', prompt: 'Bu defterin outline’ından bir mermaid diyagramı çiz.' },
]

const CHAT_STORAGE_KEYS = ['claude_workspace_chats_v7', 'claude_workspace_chats_v6', 'claude_workspace_chats_v4'];
const PROJECT_STORAGE_KEYS = ['claude_workspace_projects_v7', 'claude_workspace_projects_v6', 'claude_workspace_projects'];

function readStored<T>(keys: string[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  for (const key of keys) {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
     } catch {
       // Ignore malformed local data and continue with the next migration key.
     }
   }
   return fallback;
}

function toWorkspaceArtifact(artifact: AiArtifact): Artifact {
  const chartSpec = artifact.chartSpec || (artifact.type === 'chart' ? parseChartSpec(artifact.content) || undefined : undefined);
  return {
    id: artifact.id,
    identifier: artifact.identifier,
    title: artifact.title,
    type: artifact.type,
    language: artifact.language,
    content: artifact.content || (chartSpec ? JSON.stringify(chartSpec) : ''),
    chartSpec,
    description: artifact.description,
    version: artifact.version || 1,
    createdAt: artifact.createdAt || new Date().toISOString(),
  };
}

function sanitizePublicAssistantText(value: string): string {
  return stripThinkingBlocks(stripChartArtifactMarkup(value));
}

export default function App({ onClose, layout = 'overlay' }: { onClose?: () => void; layout?: 'overlay' | 'window' }) {
  // Persistence state
  const [chats, setChats] = useState<Chat[]>(() => {
    const stored = readLocalChats<unknown>(readStored<unknown>(CHAT_STORAGE_KEYS, INITIAL_CHATS));
    return Array.isArray(stored) ? (stored as Chat[]) : INITIAL_CHATS;
  });

  const [projects, setProjects] = useState<ProjectSpace[]>(() => {
    const stored = readStored<unknown>(PROJECT_STORAGE_KEYS, INITIAL_PROJECTS);
    return Array.isArray(stored) ? (stored as ProjectSpace[]) : INITIAL_PROJECTS;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaults: UserSettings = {
      typewriterSpeed: 'smooth',
      defaultThinkingBudget: 'balanced',
      defaultModel: 'nietzsche',
      autoOpenArtifacts: false,
      soundEffects: false,
    };
    const stored = readStored<Partial<UserSettings> | null>(['claude_workspace_settings'], null);
    return stored && typeof stored === 'object' ? { ...defaults, ...stored } : defaults;
  });

  // App Context for openNewChat params
  const app = useApp();
  const { chatParams, setChatParams } = app;
  const processedInitialQuestionRef = useRef<string | null>(null);
  // Subscribe to windows via dedicated context so we re-render when windows change
  const { windows: appWindows } = useAppWindows();
  const [notebookBind, setNotebookBind] = useState<NotebookChatBind | null>(null);
  const selectedModelIdRef = useRef<ModelId>(settings.defaultModel);

  // Extract full active notebook text content from open notebook windows
  const activeNotebookContext = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const boundId = notebookBind?.notebookId
    if (boundId) {
      const bound = getNotebook(boundId)
      return buildNotebookAgentContext({
        title: bound?.title || notebookBind?.title,
        content: bound?.content,
        selection: readNotebookSelection(),
      })
    }
    return '';
  }, [appWindows, notebookBind]);

  const insertIntoNotebook = (content: string, notebookId?: string) => {
    const text = String(content || '').trim()
    if (!text) return
    const notebookOpen = appWindows.some(
      (windowItem) => /notebook/i.test(windowItem.path || '') || windowItem.component === 'NotebookApp'
    )
    const insert = () =>
      window.dispatchEvent(
        new CustomEvent('wimNotebookInsertText', {
          detail: {
            text,
            mode: 'append',
            notebookId: notebookId || notebookBind?.notebookId,
          },
        })
      )

    if (!notebookOpen && app?.addWindow) {
      app.addWindow({
        title: 'Notebooks',
        icon: 'DocumentTextIcon',
        component: 'NotebookApp',
        path: '/notebooks',
      })
      window.setTimeout(insert, 350)
      return
    }

    insert()
  }

  // Active chat state
  const [models, setModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0]?.id || '');
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(settings.defaultModel);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePresetId>('default');
  selectedModelIdRef.current = selectedModelId

  useEffect(() => {
    ensureLemonStyles()
    return () => releaseLemonStyles()
  }, [])

  useEffect(() => {
    const applyBind = (bind: NotebookChatBind | null) => {
      setNotebookBind(bind)
      if (!bind) return
      setChats((prev) => {
        const existing = prev.find((chat) => chat.notebookId === bind.notebookId)
        if (existing) {
          setActiveChatId(existing.id)
          return prev
        }
        const boundChat: Chat = {
          id: `chat-nb-${bind.notebookId}`,
          title: bind.title ? `Notebook: ${bind.title}` : 'Notebook editor',
          notebookId: bind.notebookId,
          modelId: selectedModelIdRef.current,
          starred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thinkingBudget: 'extended',
          webSearchEnabled: false,
          messages: [],
        }
        setActiveChatId(boundChat.id)
        return [boundChat, ...prev]
      })
    }
    applyBind(readNotebookChatBind())
    const onBind = (event: Event) => {
      applyBind((event as CustomEvent<NotebookChatBind | null>).detail || readNotebookChatBind())
    }
    window.addEventListener(NOTEBOOK_CHAT_BIND_EVENT, onBind)
    return () => window.removeEventListener(NOTEBOOK_CHAT_BIND_EVENT, onBind)
  }, [])




  // Fetch live philosopher bot profiles from Supabase via /api/philosopher-bots
  useEffect(() => {
    fetch('/api/philosopher-bots')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bots && Array.isArray(data.bots) && data.bots.length > 0) {
          setModels((prevModels) => {
            const botMap = new Map<string, { id: string; username: string; avatar_url: string }>();
            data.bots.forEach((b: any) => {
              if (b?.username) botMap.set(b.username.toLowerCase(), b);
              if (b?.id) botMap.set(b.id.toLowerCase(), b);
            });
            return prevModels.map((m) => {
              const liveBot = botMap.get(m.name.toLowerCase()) || botMap.get(m.id.toLowerCase());
              if (liveBot && liveBot.avatar_url) {
                return { ...m, avatarUrl: liveBot.avatar_url };
              }
              return m;
            });
          });
        }
      })
      .catch(() => {});
  }, []);


  // UI Modals & Drawers state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactsOpen, setIsArtifactsOpen] = useState<boolean>(false);
  const [isArtifactExpanded, setIsArtifactExpanded] = useState(false);
  const [artifactOrigin, setArtifactOrigin] = useState<ArtifactOrigin | null>(null);
  const [activeSources, setActiveSources] = useState<WebCitation[] | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [sourcesOrigin, setSourcesOrigin] = useState<ArtifactOrigin | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const captureOrigin = (rect?: DOMRect | null): ArtifactOrigin => {
    const box = workspaceRef.current?.getBoundingClientRect()
    const height = box?.height ?? 720
    const width = box?.width ?? 416
    if (rect && box) {
      return {
        top: rect.top - box.top,
        left: rect.left - box.left,
        width: rect.width,
        height: rect.height,
        centerY: rect.top + rect.height / 2 - box.top,
      }
    }
    return {
      top: height * 0.42,
      left: 12,
      width: Math.max(width - 24, 200),
      height: 72,
      centerY: height * 0.48,
    }
  }

  const closeSources = () => {
    setIsSourcesOpen(false)
    setActiveSources(null)
  }

  const openSources = (citations: WebCitation[] | undefined, origin?: DOMRect | null) => {
    if (!citations || citations.length === 0) return
    setIsArtifactsOpen(false)
    setIsArtifactExpanded(false)
    setActiveSources(citations)
    setIsSourcesOpen(true)
    setSourcesOrigin(captureOrigin(origin))
  }

  const openArtifact = (art: Artifact, _opts?: { expand?: boolean; keepSize?: boolean; origin?: DOMRect | null }) => {
    closeSources()
    setActiveArtifact(art)

    // Launch artifact exclusively as a native OS Desktop AppWindow
    if (app?.addWindow) {
      app.addWindow({
        key: `artifact-${art.id || encodeURIComponent(art.title)}`,
        title: `${art.title || 'Component'}`,
        path: `/artifact/${art.id || encodeURIComponent(art.title)}`,
        size: {
          width: 860,
          height: 600,
        },
        element: (
          <ArtifactWindowContent
            artifact={art}
            onInsertToNotebook={insertIntoNotebook}
            onHealArtifact={handleHealArtifact}
          />
        ),
      })
    }
  }

  const closeArtifacts = () => {
    setIsArtifactsOpen(false)
    setIsArtifactExpanded(false)
  }

  const handleHealArtifact = (art: Artifact, content: string) => {
    setActiveArtifact((current) => (current && current.id === art.id ? { ...current, content } : current))
    setChats((prev) =>
      prev.map((chat) => ({
        ...chat,
        messages: chat.messages.map((message) => ({
          ...message,
          artifacts: message.artifacts?.map((item) => (item.id === art.id ? { ...item, content } : item)),
        })),
      }))
    )
  }

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLElement>(null);
  const isStreamingRef = useRef(false);
  const pendingEditMessageIdRef = useRef<string | null>(null);
  const persistChatIdRef = useRef<string | null>(null);
  const executedActionsRef = useRef(new Set<string>());
  const [composerDraft, setComposerDraft] = useState('');
  const [composerDraftNonce, setComposerDraftNonce] = useState(0);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [incomingAttachments, setIncomingAttachments] = useState<FileAttachment[]>([]);
  const dragCounterRef = useRef(0);

  const processIncomingFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isCode = /\.(js|ts|tsx|jsx|py|html|css|json|sql|sh|rs|go|c|cpp|md)$/i.test(file.name);
      const type: 'image' | 'text' | 'pdf' | 'code' = isImage ? 'image' : isPdf ? 'pdf' : isCode ? 'code' : 'text';
      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const reader = new FileReader();
      if (isImage) {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setIncomingAttachments((prev) => [...prev, { id, name: file.name, type, size: sizeStr, url: dataUrl, content: dataUrl }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const textContent = reader.result as string;
          setIncomingAttachments((prev) => [...prev, { id, name: file.name, type, size: sizeStr, content: textContent, contentPreview: textContent.slice(0, 200) }]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleWindowDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsWindowDragging(true);
    }
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsWindowDragging(false);
    }
  };

  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsWindowDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const fillComposer = (text: string) => {
    setComposerDraft(text)
    setComposerDraftNonce((value) => value + 1)
  }
  const [shareBusy, setShareBusy] = useState(false);

  const persistOwnerRef = useRef(getChatStorageKey())
  // Save to LocalStorage
  useEffect(() => {
    try {
      const key = getChatStorageKey()
      if (key !== persistOwnerRef.current) {
        persistOwnerRef.current = key
        return
      }
      writeLocalChats(chats);
    } catch {
      // A full localStorage quota must not break an active conversation.
    }
  }, [chats]);

  useEffect(() => {
    try {
      window.localStorage.setItem('claude_workspace_projects_v7', JSON.stringify(projects));
    } catch {
      // Projects are local convenience data; persistence is best effort.
    }
  }, [projects]);

  useEffect(() => {
    try {
      window.localStorage.setItem('claude_workspace_settings', JSON.stringify(settings));
    } catch {
      // Settings persistence is best effort.
    }
  }, [settings]);

  useEffect(() => {
    let cancelled = false
    const syncFromRemote = async (claim = false) => {
      if (claim) await claimDeviceAccountOnLogin()
      if (cancelled) return
      const remote = await pullChatsFromRemote()
      if (cancelled || !remote) return
      const deletedIds = [...readLocalDeletedChatIds(), ...remote.deletedIds]
      for (const id of remote.deletedIds) rememberDeletedChatId(id)
      setChats((prev) => {
        const merged = mergeChats(prev, remote.chats, deletedIds)
        if (merged.length > 0 && !merged.some((chat) => chat.id === activeChatId)) {
          setActiveChatId(merged[0].id)
        }
        if (merged.length === 0) setActiveChatId('')
        return merged
      })
    }
    void syncFromRemote(true)
    let pullTimer: number | undefined
    const schedulePull = () => {
      window.clearTimeout(pullTimer)
      pullTimer = window.setTimeout(() => {
        void syncFromRemote(false)
      }, 350)
    }
    const onIdentity = () => {
      persistOwnerRef.current = getChatStorageKey()
      const stored = readLocalChats<Chat[]>([])
      setChats(Array.isArray(stored) ? stored : [])
      void syncFromRemote(true)
    }
    window.addEventListener(WIM_IDENTITY_EVENT, onIdentity)
    const stopRealtime = subscribeToWorkspaceChats(schedulePull)
    const stopPolling = startWorkspaceChatPolling(schedulePull)
    return () => {
      cancelled = true
      window.clearTimeout(pullTimer)
      window.removeEventListener(WIM_IDENTITY_EVENT, onIdentity)
      stopRealtime()
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isStreaming || !persistChatIdRef.current) return
    const chatId = persistChatIdRef.current
    persistChatIdRef.current = null
    const chat = chats.find((item) => item.id === chatId)
    if (chat && chat.messages.some((message) => !message.isStreaming) && !readLocalDeletedChatIds().includes(chat.id)) {
      void pushChatToRemote(chat)
    }
  }, [chats, isStreaming]);

  const activeChat = chats.find((c) => c.id === activeChatId) || (!activeChatId ? chats[0] : undefined)
  isStreamingRef.current =
    isStreaming || Boolean(activeChat?.messages.at(-1)?.isStreaming)

  // Sync selected model when switching active chat
  useEffect(() => {
    if (activeChat?.modelId) {
      setSelectedModelId(activeChat.modelId);
    }
  }, [activeChatId]);

  // Model switching handler (works both before starting and mid-conversation)
  const handleSelectModel = (newModelId: ModelId) => {
    setSelectedModelId(newModelId);
    if (activeChatId) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, modelId: newModelId } : c))
      );
    }
  };


  const userInteractingRef = useRef(false);
  const autoScrollRef = useRef(true);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);

  const pinChatToBottom = useCallback(() => {
    if (!autoScrollRef.current || userInteractingRef.current) return;
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    const next = scroller.scrollHeight - scroller.clientHeight;
    if (Math.abs(scroller.scrollTop - next) > 1) scroller.scrollTop = next;
  }, []);

  const scrollToBottomInstant = useCallback(() => {
    pinChatToBottom();
  }, [pinChatToBottom]);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    autoScrollRef.current = true;
    userInteractingRef.current = false;
    setIsAwayFromBottom(false);
    if (behavior === 'auto') {
      scroller.scrollTop = scroller.scrollHeight;
    } else {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollChatToBottom('smooth');
  }, [scrollChatToBottom]);

  const handleScroll = useCallback(() => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    const distanceToBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);

    if (!userInteractingRef.current) {
      if (autoScrollRef.current) return;
      if (distanceToBottom <= 25) {
        autoScrollRef.current = true;
        setIsAwayFromBottom(false);
      }
      return;
    }

    if (distanceToBottom > 48) {
      autoScrollRef.current = false;
      setIsAwayFromBottom(true);
    } else if (distanceToBottom <= 25) {
      autoScrollRef.current = true;
      setIsAwayFromBottom(false);
    }
  }, []);

  useEffect(() => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    if (autoScrollRef.current) scrollToBottomInstant();

    let touchTimeout: ReturnType<typeof setTimeout> | undefined;

    const onTouchStart = () => {
      userInteractingRef.current = true;
      if (touchTimeout) clearTimeout(touchTimeout);
    };

    const onTouchMove = () => {
      userInteractingRef.current = true;
      const distanceToBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);
      if (distanceToBottom > 48) {
        autoScrollRef.current = false;
        setIsAwayFromBottom(true);
      }
    };

    const onTouchEnd = () => {
      touchTimeout = setTimeout(() => {
        userInteractingRef.current = false;
        if (autoScrollRef.current) pinChatToBottom();
      }, 280);
    };

    const onWheel = (e: WheelEvent) => {
      userInteractingRef.current = true;
      if (e.deltaY < 0) {
        autoScrollRef.current = false;
        setIsAwayFromBottom(true);
      } else if (e.deltaY > 0) {
        const distanceToBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);
        if (distanceToBottom <= 30) {
          autoScrollRef.current = true;
          setIsAwayFromBottom(false);
        }
      }
      if (touchTimeout) clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        userInteractingRef.current = false;
      }, 300);
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: true });
    scroller.addEventListener('touchend', onTouchEnd, { passive: true });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: true });

    const observer = new ResizeObserver(() => {
      pinChatToBottom();
    });
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
      scroller.removeEventListener('wheel', onWheel);
      if (touchTimeout) clearTimeout(touchTimeout);
      observer.disconnect();
    };
  }, [activeChatId, handleScroll, pinChatToBottom, Boolean(activeChat?.messages.length)]);

  const lastStreamTick = (() => {
    const last = activeChat?.messages[activeChat.messages.length - 1];
    if (!last) return `${activeChatId}:empty`;
    return `${last.id}:${last.content.length}:${last.isStreaming ? 1 : 0}:${last.thinkingProcess?.steps?.length || 0}:${last.toolTrace?.length || 0}:${last.artifacts?.length || 0}:${last.osAction ? 1 : 0}`;
  })();

  useLayoutEffect(() => {
    pinChatToBottom();
  }, [lastStreamTick, pinChatToBottom]);

  useEffect(() => {
    if (!isStreaming) return;
    let frame = 0;
    const tick = () => {
      pinChatToBottom();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const viewport = window.visualViewport;
    const onViewport = () => pinChatToBottom();
    viewport?.addEventListener('resize', onViewport);
    viewport?.addEventListener('scroll', onViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', onViewport);
      viewport?.removeEventListener('scroll', onViewport);
    };
  }, [isStreaming, pinChatToBottom]);

  // Auto-open artifact when switching chats
  useEffect(() => {
    scrollChatToBottom('auto');

    if (activeChat?.messages) {
      const lastArt = [...activeChat.messages].reverse().find((m) => m.artifacts && m.artifacts.length > 0)?.artifacts?.[0];
      if (lastArt && settings.autoOpenArtifacts) {
        openArtifact(lastArt);
      }
    }
  }, [activeChatId, settings.autoOpenArtifacts]);

  // Handle New Chat Creation
  const handleNewChat = (projId?: string) => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: notebookBind?.title ? `Notebook: ${notebookBind.title}` : 'New chat',
      notebookId: notebookBind?.notebookId,
      projectId: projId || activeProjectId,
      modelId: selectedModelId,
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thinkingBudget: 'extended',
      webSearchEnabled: false,
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActiveArtifact(null);
    closeArtifacts();
  };

  // Handle HTML/JSON Chat Import
  const handleImportChat = (importedChat: Chat) => {
    setChats((prev) => [importedChat, ...prev]);
    setActiveChatId(importedChat.id);
    // Auto open artifact if available
    const firstArt = importedChat.messages.find((m) => m.artifacts && m.artifacts.length > 0)?.artifacts?.[0];
    if (firstArt) {
      openArtifact(firstArt);
    }
  };

  // Handle Message Sending with Backend Streaming
  const handleSendMessage = async (
    promptText: string,
    attachments: FileAttachment[],
    options?: { skipUserAppend?: boolean; historyOverride?: Message[] }
  ) => {
    if (!promptText.trim() && attachments.length === 0) return;

    let targetChatId = activeChatId;
    const editMessageId = pendingEditMessageIdRef.current
    pendingEditMessageIdRef.current = null
    const sourceChat = chats.find((c) => c.id === (targetChatId || '')) || activeChat
    let baseMessages = options?.historyOverride || sourceChat?.messages || []
    if (editMessageId) {
      const editIndex = baseMessages.findIndex((message) => message.id === editMessageId)
      if (editIndex >= 0) {
        baseMessages = baseMessages.slice(0, editIndex)
      }
    }

    // Create chat if empty or invalid
    if (!targetChatId || !chats.some((c) => c.id === targetChatId)) {
      baseMessages = [];
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: promptText.slice(0, 30) || attachments[0]?.name || 'New chat',
        notebookId: notebookBind?.notebookId,
        projectId: activeProjectId,
        modelId: selectedModelId,
        starred: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thinkingBudget: 'extended',
        webSearchEnabled: false,
        messages: [],
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      targetChatId = newChat.id;
    }

    const userMessage: Message = {
      id: `m-user-${Date.now()}`,
      role: 'user',
      content: promptText || attachments.map((attachment) => attachment.name).join(', '),
      timestamp: new Date().toISOString(),
      attachments,
    };

    const assistantMessageId = `m-ast-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: selectedModelId,
      isStreaming: true,
      isTypingDone: false,
      thinkingProcess: {
        durationSeconds: 0,
        tokenCount: 0,
        steps: [],
      },
    };

    // Update state with user and pending assistant message
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId) {
          const nextMessages = options?.skipUserAppend
            ? [...baseMessages, assistantMessage]
            : [...baseMessages, userMessage, assistantMessage];
          const isFirstUserMsg = baseMessages.length === 0;
          return {
            ...c,
            title: isFirstUserMsg ? promptText.slice(0, 32) || attachments[0]?.name || 'New chat' : c.title,
            updatedAt: new Date().toISOString(),
            messages: nextMessages,
          };
        }
        return c;
      })
    );

    setIsStreaming(true);
    autoScrollRef.current = true;
    setIsAwayFromBottom(false);
    requestAnimationFrame(() => scrollChatToBottom('auto'));
    abortControllerRef.current = new AbortController();

    const selectedStyle = STYLE_PRESETS.find((s) => s.id === selectedStylePreset);
    const activeProjectObj = projects.find((p) => p.id === activeProjectId);

    let accumulatedContent = '';
    const thinkStartedAt = Date.now();
    let currentThinkingProcess = {
      durationSeconds: 0,
      tokenCount: 0,
      steps: [] as any[],
      summary: '',
    };
    let streamedArtifacts: Artifact[] = [];
    let streamedAction: OSActionCardType | undefined;
    let streamedProvider: string | undefined;
    let streamedToolTrace: ToolTrace[] = [];
    const appendStreamedArtifacts = (incoming: AiArtifact[] | undefined) => {
      if (!incoming || incoming.length === 0) return;
      const next = incoming.map(toWorkspaceArtifact);
      streamedArtifacts = [...streamedArtifacts, ...next].filter((artifact, index, all) =>
        all.findIndex((candidate) =>
          candidate.id === artifact.id ||
          (candidate.identifier && artifact.identifier && candidate.identifier === artifact.identifier) ||
          (candidate.type === artifact.type && candidate.content === artifact.content)
        ) === index
      );
    };

    let isStreamComplete = false;
    let backendError = false;
    try {

      const attachmentContext = attachments
        .map((attachment) => {
          if (attachment.type === 'image') {
            return `[Image attachment: ${attachment.name}. Image bytes are not sent to the text model.]`;
          }
          return `[${attachment.name}]\n${(attachment.content || attachment.contentPreview || '').slice(0, 3500)}`;
        })
        .join('\n\n')
        .slice(0, 8000);
      const effectivePrompt = promptText.trim() || 'Please analyze the attached material and respond with the most useful next step.';

      const conversationHistory: Array<Record<string, unknown>> = []
      for (const message of baseMessages.filter((item) => item.role === 'user' || item.role === 'assistant').slice(-6)) {
        conversationHistory.push({
          role: message.role,
          content: message.content.slice(0, 1200),
          artifacts:
            message.role === 'assistant' && message.artifacts?.length
              ? message.artifacts.slice(0, 2).map((artifact) => ({
                  id: artifact.id,
                  type: artifact.type,
                  title: (artifact.title || 'Untitled').slice(0, 80),
                  content: (artifact.content || '').slice(0, 4000),
                }))
              : undefined,
          tool_calls: message.toolTrace?.length
            ? message.toolTrace.slice(0, 4).map((trace) => ({
                id: trace.id,
                name: trace.name,
                arguments: (trace.arguments || '{}').slice(0, 4000),
                thoughtSignature: trace.thoughtSignature,
              }))
            : undefined,
        })
        for (const trace of message.toolTrace || []) {
          if (trace.status === 'running') continue
          conversationHistory.push({
            role: 'tool',
            tool_call_id: trace.id,
            content: (trace.result || trace.detail || '{"ok":true}').slice(0, 4000),
          })
        }
      }

      const sseRes = await fetch('/api/chat', {
        method: 'POST',
        headers: chatAuthHeaders(true),
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: effectivePrompt,
          modelId: selectedModelId,
          systemPrompt: activeProjectObj?.systemPrompt || '',
          styleSuffix: selectedStyle?.promptSuffix || '',
          attachmentContext,
          messages: conversationHistory,
          notebookContext: activeNotebookContext,
          notebookBound: Boolean(notebookBind?.notebookId),
          conversationId: targetChatId,
          workspace: {
            path: typeof window !== 'undefined' ? window.location.pathname : '/',
            windows: (appWindows || []).slice(0, 12).map((item) => ({
              path: item.path,
              title: item.title || item.meta?.title || item.path,
            })),
            notebookId: notebookBind?.notebookId,
            notebookTitle: notebookBind?.title,
            selection: readNotebookSelection(),
            notebooks: getNotebooks()
              .slice(0, 20)
              .map((notebook) => ({
                id: notebook.id,
                title: notebook.title || 'Untitled',
                content: notebook.content ? notebook.content.slice(0, 10_000) : '',
              })),
            artifactId: activeArtifact?.id,
            artifactTitle: activeArtifact?.title,
            artifactType: activeArtifact?.type,
          },
        }),
      });

      if (!sseRes.ok || !sseRes.body) {
        let errorMessage = `Chat API ${sseRes.status}`;
        try {
          const errBody = await sseRes.json();
          if (errBody?.error) errorMessage = String(errBody.error);
        } catch {
          /* use status text */
        }
        throw new Error(errorMessage);
      }

      const reader = sseRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedCitations: Message['citations'] = [];

      let lastTokenFlushTime = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const parsed = parseAiSseEvent(frame);
          if (!parsed) continue;

          if (parsed.type === 'tool') {
            const toolTitle = toolStatusLabel(parsed.tool.name, parsed.tool.status);
            const toolStep = {
              id: `tool-${parsed.tool.id}`,
              stepNumber: 0,
              title: toolTitle,
              detail: parsed.tool.detail || '',
              completed: parsed.tool.status !== 'running',
              source: 'system_event' as const,
            };
            const existingIdx = currentThinkingProcess.steps.findIndex((s: any) => s.id === toolStep.id);
            if (existingIdx >= 0) currentThinkingProcess.steps[existingIdx] = toolStep;
            else currentThinkingProcess.steps.push(toolStep);
            currentThinkingProcess.steps = [...currentThinkingProcess.steps];
            if (parsed.tool.status === 'running') currentThinkingProcess.summary = toolTitle;
            const nextTrace: ToolTrace = {
              id: parsed.tool.id,
              name: parsed.tool.name,
              status: parsed.tool.status,
              arguments: parsed.tool.arguments,
              result: parsed.tool.result,
              detail: parsed.tool.detail,
              thoughtSignature: parsed.tool.thoughtSignature,
            };
            const traceIdx = streamedToolTrace.findIndex((item) => item.id === nextTrace.id);
            if (traceIdx >= 0) {
              streamedToolTrace[traceIdx] = {
                ...streamedToolTrace[traceIdx],
                ...nextTrace,
                thoughtSignature: nextTrace.thoughtSignature || streamedToolTrace[traceIdx].thoughtSignature,
              }
            } else streamedToolTrace.push(nextTrace);
            streamedToolTrace = [...streamedToolTrace];
            updateAssistantMessage(targetChatId, assistantMessageId, {
              thinkingProcess: { ...currentThinkingProcess },
              toolTrace: streamedToolTrace,
            });
          }

          if (parsed.type === 'search') {
            const searchTitle =
              parsed.search.status === 'running'
                ? `Searching the web for “${parsed.search.query}”`
                : parsed.search.status === 'error'
                ? `Web search failed for “${parsed.search.query}”`
                : `Searched the web for “${parsed.search.query}”`;
            const searchStep = {
              id: 'search-step',
              stepNumber: 0,
              title: searchTitle,
              detail: parsed.search.results || '',
              completed: parsed.search.status === 'done',
              source: 'system_event' as const,
            };
            const existingIdx = currentThinkingProcess.steps.findIndex((s: any) => s.id === 'search-step');
            if (existingIdx >= 0) currentThinkingProcess.steps[existingIdx] = searchStep;
            else currentThinkingProcess.steps.push(searchStep);
            currentThinkingProcess.steps = [...currentThinkingProcess.steps];
            currentThinkingProcess.summary = parsed.search.status === 'running' ? searchTitle : '';
            const searchTrace: ToolTrace = {
              id: 'host-search',
              name: 'web_search',
              status: parsed.search.status === 'error' ? 'error' : parsed.search.status === 'done' ? 'done' : 'running',
              detail: searchTitle,
              result: parsed.search.results || undefined,
            };
            const searchTraceIdx = streamedToolTrace.findIndex((item) => item.id === searchTrace.id);
            if (searchTraceIdx >= 0) streamedToolTrace[searchTraceIdx] = { ...streamedToolTrace[searchTraceIdx], ...searchTrace };
            else streamedToolTrace.push(searchTrace);
            streamedToolTrace = [...streamedToolTrace];
            updateAssistantMessage(targetChatId, assistantMessageId, {
              thinkingProcess: { ...currentThinkingProcess },
              toolTrace: streamedToolTrace,
            });
          }

          if (parsed.type === 'citations') {
            streamedCitations = parsed.citations;
            updateAssistantMessage(targetChatId, assistantMessageId, {
              citations: streamedCitations,
            });
          }

          if (parsed.type === 'thinking_start') {
            currentThinkingProcess.durationSeconds = parsed.durationSeconds || 0;
            currentThinkingProcess.tokenCount = parsed.tokenCount || 0;
          }

          if (parsed.type === 'action') {
            const applied = executeOSAction(assistantMessageId, parsed.action, targetChatId);
            streamedAction = { ...parsed.action, executed: applied };
            if (!applied) {
              updateAssistantMessage(targetChatId, assistantMessageId, { osAction: streamedAction });
            }
          }

          if (parsed.type === 'artifacts') {
            appendStreamedArtifacts(parsed.artifacts);
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: sanitizePublicAssistantText(accumulatedContent),
              artifacts: streamedArtifacts,
            });
          }

          if (parsed.type === 'thinking_step') {
            const existingIdx = currentThinkingProcess.steps.findIndex((step: any) => step.id === parsed.step.id);
            if (existingIdx >= 0) currentThinkingProcess.steps[existingIdx] = parsed.step;
            else currentThinkingProcess.steps.push(parsed.step);
            currentThinkingProcess.steps = [...currentThinkingProcess.steps];
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: sanitizePublicAssistantText(accumulatedContent),
              thinkingProcess: { ...currentThinkingProcess },
            });
          }

          if (parsed.type === 'error') {
            console.error('[workspace chat] backend error:', parsed.message);
            backendError = true;
            if (!accumulatedContent.trim()) {
              updateAssistantMessage(targetChatId, assistantMessageId, {
                content: parsed.message || 'Philosopher network unavailable.',
              });
            }
            continue;
          }

          if (parsed.type === 'token') {
            accumulatedContent += parsed.text;
            const now = Date.now();
            if (now - lastTokenFlushTime > 24 || accumulatedContent.length < 40) {
              lastTokenFlushTime = now;
              updateAssistantMessage(targetChatId, assistantMessageId, {
                content: sanitizePublicAssistantText(accumulatedContent),
                thinkingProcess: { ...currentThinkingProcess },
              });
            }
          }

          if (parsed.type === 'done') {
            appendStreamedArtifacts(parsed.artifacts);
            accumulatedContent = parsed.fullText || accumulatedContent;
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: sanitizePublicAssistantText(accumulatedContent),
              artifacts: streamedArtifacts,
              citations: streamedCitations,
              thinkingProcess: { ...currentThinkingProcess },
              provider: parsed.provider,
            });
            if (parsed.provider) streamedProvider = parsed.provider;
          }
        }
      }

      let finalCleanContent = sanitizePublicAssistantText(accumulatedContent);
      if (!finalCleanContent && !backendError && streamedArtifacts.length === 0) {
        throw new Error('AI returned no content');
      }

      let extractedArtifacts: Artifact[] = [];
      let visibleMessageText = finalCleanContent;
      try {
        const turn = finalizeArtifactTurn(promptText, finalCleanContent, streamedArtifacts, { scrape: false })
        const rawArtifacts = dedupeArtifacts([...streamedArtifacts, ...turn.artifacts]);
        if (rawArtifacts.length > 0) {
          const existingChatArtifacts = activeChat?.messages.flatMap((m) => m.artifacts || []) || [];
          for (const rawArt of rawArtifacts) {
            const { activeArtifact: revisedArt } = processArtifactRevision(existingChatArtifacts, rawArt, {
              preferId: activeArtifact?.id,
            });
            extractedArtifacts.push(
              revisedArt.type === 'react'
                ? { ...revisedArt, content: prepareSandpackSource(revisedArt.content) }
                : revisedArt
            );
          }
        }
        visibleMessageText = turn.visibleText || finalCleanContent
      } catch (artifactError) {
        console.error('[workspace chat] artifact extract failed', artifactError)
      }

      // If we had a backend error, do not overwrite the assistant message again with empty content!
      if (!backendError) {
        currentThinkingProcess.durationSeconds = Math.max(
          currentThinkingProcess.durationSeconds,
          (Date.now() - thinkStartedAt) / 1000
        );
        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: visibleMessageText || finalCleanContent || 'Response ready.',
          thinkingProcess: { ...currentThinkingProcess },
          toolTrace: streamedToolTrace.length > 0 ? streamedToolTrace : undefined,
          artifacts: extractedArtifacts.length > 0 ? extractedArtifacts : undefined,
          isStreaming: false,
          isTypingDone: true,
          osAction: streamedAction,
          provider: streamedProvider,
        });
      }

      isStreamComplete = true; // successfully reached the end!
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const stoppedText = sanitizePublicAssistantText(accumulatedContent)
        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: stoppedText,
          thinkingProcess: { ...currentThinkingProcess },
          toolTrace: streamedToolTrace.length > 0 ? streamedToolTrace : undefined,
          isStreaming: false,
          isTypingDone: true,
          stopped: true,
        })
      } else if (!isStreamComplete) {
        console.error('[ClaudeWorkspaceChat] Error during streaming:', err);
        
        const displayContent = sanitizePublicAssistantText(accumulatedContent);
        const rawError = String(err?.message || '');
        const shortReason = rawError.replace(/\s+/g, ' ').trim().slice(0, 220)
        const errorMessage = displayContent
          ? displayContent
          : rawError === 'AI returned no content'
            ? 'The model finished thinking but did not produce a public answer. Please try again.'
            : shortReason
              ? shortReason
              : 'The reply could not be completed because of a connection error.';

        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: errorMessage,
          thinkingProcess: { ...currentThinkingProcess },
          isStreaming: false,
          isTypingDone: true,
        });
      }
    } finally {
      persistChatIdRef.current = targetChatId;
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Helper to update specific assistant message in chat
  const updateAssistantMessage = (chatId: string, msgId: string, patch: Partial<Message>) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
          };
        }
        return c;
      })
    );
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    const chatId = activeChat?.id
    const last = activeChat?.messages.at(-1)
    if (chatId && last?.role === 'assistant' && last.isStreaming) {
      updateAssistantMessage(chatId, last.id, {
        isStreaming: false,
        isTypingDone: true,
        stopped: true,
      })
    }
  }

  const executeOSAction = (msgId: string, action: OSActionCardType, chatId = activeChatId) => {
    const key = `${chatId}:${msgId}:${action.type}:${JSON.stringify(action.payload || {}).slice(0, 200)}`;
    if (action.executed || executedActionsRef.current.has(key)) {
      if (!action.executed) {
        updateAssistantMessage(chatId, msgId, { osAction: { ...action, executed: true } });
      }
      return true;
    }
    executedActionsRef.current.add(key);
    try {
      if (action.type === 'create_notebook') {
        createNotebook(action.payload.title || 'AI Generated Notes', action.payload.content || '');
        if (app?.addWindow) app.addWindow({ path: '/notebooks' });
      } else if (action.type === 'insert_notebook_block') {
        insertIntoNotebook(action.payload.content || '', action.payload.notebookId);
        if (app?.addWindow) app.addWindow({ path: '/notebooks' });
      } else if (action.type === 'rewrite_notebook_document') {
        window.dispatchEvent(
          new CustomEvent('wimNotebookInsertText', {
            detail: {
              text: action.payload.content || '',
              mode: 'replace',
              notebookId: action.payload.notebookId || notebookBind?.notebookId,
            },
          })
        );
        if (app?.addWindow) app.addWindow({ path: '/notebooks' });
      } else if (action.type === 'replace_notebook_selection') {
        window.dispatchEvent(
          new CustomEvent('wimNotebookReplaceSelection', {
            detail: {
              text: action.payload.content || '',
              notebookId: action.payload.notebookId || notebookBind?.notebookId,
            },
          })
        );
        if (app?.addWindow) app.addWindow({ path: '/notebooks' });
      } else if (action.type === 'update_notebook_title') {
        window.dispatchEvent(
          new CustomEvent('wimNotebookSetTitle', {
            detail: {
              title: action.payload.title || '',
              notebookId: action.payload.notebookId || notebookBind?.notebookId,
            },
          })
        );
        if (app?.addWindow) app.addWindow({ path: '/notebooks' });
      } else if (action.type === 'create_forum_topic') {
        if (app?.addWindow) app.addWindow({ path: '/community' });
      } else if (action.type === 'open_window') {
        if (app?.addWindow && action.payload.path) app.addWindow({ path: action.payload.path });
      }

      updateAssistantMessage(chatId, msgId, {
        osAction: { ...action, executed: true },
      });
      return true;
    } catch (e) {
      executedActionsRef.current.delete(key);
      console.warn('[Ask AI] Action execution error:', e);
      return false;
    }
  };

  const handleDeleteChat = (id: string) => {
    rememberDeletedChatId(id)
    if (persistChatIdRef.current === id) persistChatIdRef.current = null
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id)
      writeLocalChats(next)
      if (activeChatId === id) setActiveChatId(next[0]?.id || '')
      return next
    })
    void deleteChatOnRemote(id)
  }

  const handleEditPrompt = (text: string, messageId: string) => {
    if (isStreaming) return;
    pendingEditMessageIdRef.current = messageId;
    setComposerDraft(text);
    setComposerDraftNonce((value) => value + 1);
  };

  const handleRetry = (assistantMessageId: string) => {
    if (isStreaming || !activeChat) return;
    const assistantIndex = activeChat.messages.findIndex((message) => message.id === assistantMessageId);
    if (assistantIndex < 0) return;
    let userIndex = assistantIndex - 1;
    while (userIndex >= 0 && activeChat.messages[userIndex].role !== 'user') userIndex -= 1;
    if (userIndex < 0) return;
    const userMessage = activeChat.messages[userIndex];
    const kept = activeChat.messages.slice(0, userIndex + 1);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id ? { ...chat, messages: kept, updatedAt: new Date().toISOString() } : chat
      )
    );
    void handleSendMessage(userMessage.content, userMessage.attachments || [], {
      skipUserAppend: true,
      historyOverride: kept,
    });
  };

  const handleMessageFeedback = (messageId: string, liked: boolean | null) => {
    if (!activeChatId) return;
    updateAssistantMessage(activeChatId, messageId, { liked });
    void setRemoteMessageLiked(activeChatId, messageId, liked);
  };

  const handleEnableShare = async () => {
    if (!activeChat) return;
    setShareBusy(true);
    try {
      await pushChatToRemote(activeChat);
      const shared = await setRemoteChatShare(activeChat.id, true);
      if (shared) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChat.id
              ? { ...chat, shareToken: shared.shareToken, isShared: true, updatedAt: shared.updatedAt }
              : chat
          )
        );
      }
    } finally {
      setShareBusy(false);
    }
  };

  const handleDisableShare = async () => {
    if (!activeChat) return;
    setShareBusy(true);
    try {
      const shared = await setRemoteChatShare(activeChat.id, false);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChat.id
            ? { ...chat, isShared: false, shareToken: shared?.shareToken || chat.shareToken, updatedAt: new Date().toISOString() }
            : chat
        )
      );
    } finally {
      setShareBusy(false);
    }
  };

  // Handle incoming ChatParams (initialQuestion, context, quickQuestions) from openNewChat
  useEffect(() => {
    if (!chatParams || !chatParams.initialQuestion) return;
    if (processedInitialQuestionRef.current === chatParams.initialQuestion) return;

    const q = chatParams.initialQuestion;
    processedInitialQuestionRef.current = q;

    const attachments: FileAttachment[] = [];

    if (chatParams.codeSnippet) {
      attachments.push({
        id: `code-${Date.now()}`,
        name: `Snippet (${chatParams.codeSnippet.language || 'code'})`,
        size: `${chatParams.codeSnippet.code.length} bytes`,
        type: 'code',
        content: chatParams.codeSnippet.code,
      });
    }

    if (chatParams.context && chatParams.context.length > 0) {
      const pageCtx = chatParams.context.find((c) => c.type === 'page');
      if (pageCtx && pageCtx.value) {
        attachments.push({
          id: `ctx-${Date.now()}`,
          name: `Page Context (${pageCtx.value.label || 'Page'})`,
          size: 'Context',
          type: 'text',
          content: `Page Path: ${pageCtx.value.path || ''}\nPage Title: ${pageCtx.value.label || ''}`,
        });
      }
    }

    setChatParams((prev) => (prev ? { ...prev, initialQuestion: undefined } : null));
    handleSendMessage(q, attachments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatParams?.initialQuestion]);

  const handleRenameChat = (id: string, newTitle: string) => {
    setChats((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c));
      const chat = next.find((item) => item.id === id);
      if (chat) void pushChatToRemote(chat);
      return next;
    });
  };

  const handleToggleStarChat = (id: string) => {
    setChats((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, starred: !c.starred, updatedAt: new Date().toISOString() } : c));
      const chat = next.find((item) => item.id === id);
      if (chat) void pushChatToRemote(chat);
      return next;
    });
  };

  const handleCreateProject = (newProj: Omit<ProjectSpace, 'id' | 'chatCount' | 'createdAt'>) => {
    const proj: ProjectSpace = {
      ...newProj,
      id: `proj-${Date.now()}`,
      chatCount: 0,
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, proj]);
    setActiveProjectId(proj.id);
  };

  const handleResetData = () => {
    if (typeof window !== 'undefined') {
      [...CHAT_STORAGE_KEYS, ...PROJECT_STORAGE_KEYS, 'claude_workspace_settings'].forEach((key) => {
        window.localStorage.removeItem(key);
      });
    }
    setChats(INITIAL_CHATS);
    setProjects(INITIAL_PROJECTS);
    setActiveChatId(INITIAL_CHATS[0]?.id || '');
    setActiveArtifact(null);
    closeArtifacts();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (event.key === 'Escape') {
        if (isSourcesOpen) {
          event.preventDefault()
          event.stopPropagation()
          closeSources()
          return
        }
        if (isArtifactsOpen) {
          event.preventDefault()
          event.stopPropagation()
          closeArtifacts()
          return
        }
        if (searchModalOpen) {
          event.preventDefault()
          setSearchModalOpen(false)
          return
        }
      }
      if (meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleNewChat()
        return
      }
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchModalOpen((open) => !open)
        return
      }
      if (meta && event.key === '.' && isStreaming) {
        event.preventDefault()
        handleStopStreaming()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSourcesOpen, isArtifactsOpen, searchModalOpen, isStreaming])

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 bg-primary text-primary font-sans overflow-hidden antialiased">
      {/* Left Collapsible Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={() => handleNewChat()}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onToggleStarChat={handleToggleStarChat}
      />

      {/* Main Workspace Area */}
      <div
        ref={workspaceRef}
        onDragEnter={handleWindowDragEnter}
        onDragLeave={handleWindowDragLeave}
        onDragOver={handleWindowDragOver}
        onDrop={handleWindowDrop}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-primary text-primary"
      >
        {/* Full Window Drag & Drop Overlay */}
        {isWindowDragging && (
          <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/90 backdrop-blur-sm transition-all animate-fadeIn border-2 border-dashed border-[#1E3A8A] m-2 rounded-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3A8A]/15 text-[#1E3A8A] dark:text-blue-400 mb-2.5 shadow-inner">
              <IconDocument className="size-7" />
            </div>
            <p className="text-sm font-semibold text-primary m-0">Drop files to add to conversation</p>
            <p className="text-xs text-muted m-0 mt-0.5">Documents, PDFs, code files, and images supported</p>
          </div>
        )}

        {/* Top Header Bar */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeChatTitle={activeChat?.title}
          boundNotebookTitle={notebookBind?.title}
        />

        {/* Chat Stream & Conversation Body */}
        <main
          ref={chatScrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-primary [touch-action:pan-y] [overflow-anchor:none] [-webkit-overflow-scrolling:touch]"
        >
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="flex min-h-full w-full max-w-3xl mx-auto flex-col items-center justify-center p-4 sm:p-6 pb-36 select-none">
              <h1 className="m-0 mb-1 text-center text-[22px] font-semibold tracking-tight text-primary">
                How can I help?
              </h1>
              <p className="m-0 mb-5 max-w-sm text-center text-[13px] leading-snug text-muted">
                {notebookBind?.title
                  ? `Writing in ${notebookBind.title}. You ask; it chooses the tools.`
                  : 'Looks at this OS and the web. You ask; it chooses the tools.'}
              </p>
              <div className="flex w-full flex-wrap justify-center gap-2">
                {(notebookBind?.notebookId ? NOTEBOOK_STARTERS : EMPTY_STARTERS).map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => fillComposer(starter.prompt)}
                    className="rounded-full border border-primary bg-primary px-3 py-1.5 text-[13px] text-primary hover:bg-accent transition-colors cursor-pointer"
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 px-0 pt-3 pb-36 sm:pb-40">
              {activeChat.messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  targetChatId={activeChat.id}
                  modelOptions={models}
                  onOpenArtifact={(art, origin) => {
                    if (isArtifactsOpen && activeArtifact?.id === art.id && !isArtifactExpanded) {
                      setIsArtifactExpanded(true)
                    } else {
                      openArtifact(art, { origin })
                    }
                  }}
                  onOpenSources={openSources}
                  onEditPrompt={handleEditPrompt}
                  onRetry={handleRetry}
                  onFeedback={handleMessageFeedback}
                  onUpdateMessage={updateAssistantMessage}
                  onExecuteOSAction={executeOSAction}
                  onAddToNotebook={(message) => insertIntoNotebook(messageToNotebookMarkdown(message))}
                  typewriterSpeed={settings.typewriterSpeed}
                />
              ))}
              <div ref={chatBottomRef} className="h-px w-full" />
            </div>
          )}
        </main>

        {/* Floating Input Dock with smooth fade allowing messages to flow underneath */}
        <div
          data-writing-dock
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-primary via-primary/85 to-transparent pt-10 pb-2.5 [padding-bottom:calc(0.65rem+var(--keyboard-inset,0px)+env(safe-area-inset-bottom,0px))]"
        >
          <div className="pointer-events-auto mx-auto w-full max-w-3xl px-3 sm:px-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              isStreaming={isStreaming}
              selectedStylePreset={selectedStylePreset}
              onChangeStylePreset={setSelectedStylePreset}
              onScrollToBottom={scrollToBottom}
              showScrollToBottom={Boolean(activeChat?.messages.length) && isAwayFromBottom && !isStreaming}
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={handleSelectModel}
              draftPrompt={composerDraft}
              draftNonce={composerDraftNonce}
              incomingAttachments={incomingAttachments}
              menuPlacement="top-start"
            />
          </div>
        </div>

      {isSourcesOpen && activeSources && (
        <SourcesPanel
          citations={activeSources}
          origin={sourcesOrigin}
          onClose={closeSources}
        />
      )}

      {isArtifactsOpen && (
        <ArtifactsPanel
          artifact={activeArtifact}
          expanded={isArtifactExpanded}
          contained={layout === 'window'}
          origin={artifactOrigin}
          onToggleExpand={() => setIsArtifactExpanded((value) => !value)}
          onClose={closeArtifacts}
          allArtifacts={
            activeChat?.messages
              ? activeChat.messages.flatMap((m) => m.artifacts || [])
              : []
          }
          onSelectArtifact={(art) => openArtifact(art, { keepSize: true })}
          onHealArtifact={handleHealArtifact}
          onInsertToNotebook={insertIntoNotebook}
        />
      )}
      </div>

      {/* Modals */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        chats={chats}
        onSelectChat={(id) => setActiveChatId(id)}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSt) => setSettings((prev) => ({ ...prev, ...newSt }))}
        onResetData={handleResetData}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        chat={activeChat || null}
        shareBusy={shareBusy}
        onEnableShare={handleEnableShare}
        onDisableShare={handleDisableShare}
      />
    </div>
  );
}

export function ClaudeWorkspaceChatPanel() {
  const app = useApp();
  const { isClaudeChatOpen, setIsClaudeChatOpen, taskbarRef } = app;
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closePanel = () => {
    setIsClaudeChatOpen(false);
  };

  useEffect(() => {
    if (!isClaudeChatOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (document.querySelector('[data-wim-artifact-stage]')) return;
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (
          target.closest?.('[data-wim-artifact-stage]') ||
          target.closest?.('[data-radix-popper-content-wrapper]') ||
          target.closest?.('[role="menu"]') ||
          target.closest?.('[role="listbox"]') ||
          target.closest?.('[data-lemon-popover]') ||
          target.closest?.('.LemonMenu') ||
          target.closest?.('.LemonSelect') ||
          target.closest?.('.LemonSelect__dropdown') ||
          target.closest?.('.LemonDropdown__overlay') ||
          target.closest?.('.Popover') ||
          target.closest?.('.LemonButton')
        ) {
          return;
        }
        closePanel();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
      if (document.querySelector('[data-wim-artifact-stage]')) return;
      closePanel();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isClaudeChatOpen]);

  const taskbarRect = taskbarRef?.current?.getBoundingClientRect();
  const padding = taskbarRect?.left ?? 8;
  const panelStyle =
    typeof window === 'undefined'
      ? undefined
      : {
          top: padding,
          right: padding,
          height: window.innerHeight - padding - (taskbarRect?.top ?? padding),
        };

  return (
    <Portal.Root>
      <AnimatePresence>
        {isClaudeChatOpen && (
          <motion.div
            ref={panelRef}
            initial={{ translateX: '100%' }}
            animate={{ translateX: 0 }}
            exit={{ translateX: '100%' }}
            transition={{ duration: 0.3, type: 'tween' }}
            style={panelStyle}
            data-scheme="primary"
             data-skin="classic"
            className={`fixed w-[min(calc(100vw-1rem),26rem)] max-w-[calc(100vw-1rem)] bg-primary text-primary border border-primary rounded shadow-xl z-50 flex flex-col font-sans overflow-hidden antialiased ${WINDOW_BG}`}
          >
            <App onClose={closePanel} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal.Root>
  );
}
