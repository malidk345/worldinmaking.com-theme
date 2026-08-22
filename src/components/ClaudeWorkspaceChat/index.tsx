import React, { useState, useEffect, useRef } from 'react';
import {
  Chat,
  Message,
  ModelId,
  ModelOption,
  ProjectSpace,
  StylePresetId,
  Artifact,
  ArtifactOrigin,
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
import { getNotebook, createNotebook } from '../../notebook-app/scenes/notebooks/notebookStorage';
import {
  NOTEBOOK_CHAT_BIND_EVENT,
  type NotebookChatBind,
  buildNotebookAgentContext,
  readNotebookChatBind,
  readNotebookSelection,
} from '../../lib/notebook-chat-bind';
import { messageToNotebookMarkdown } from '../../lib/notebook-artifact-block';
import type { OSActionCard as OSActionCardType } from './types';
import { dedupeArtifacts, extractArtifactsFromContent, stripExtractedArtifactMarkup } from './utils/extractArtifacts';
import { processArtifactRevision } from './utils/toolCalling';
import { parseAiSseEvent, type AiArtifact } from 'lib/ai/contracts';
import { parseChartSpec, stripChartArtifactMarkup } from 'lib/ai/chart-artifacts';
import { isAdminNavigationRequest, isUiDesignRequest } from 'lib/ai/design-request';
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
  { label: 'What’s at stake?', prompt: 'What’s actually at stake here? Give me the conflict in plain language, then one implication.' },
  { label: 'Make a table', prompt: 'Make a clear comparison table of the main options, with a short note on each tradeoff.' },
  { label: 'Explain plainly', prompt: 'Explain this as plainly as you can. No jargon unless you define it in one line.' },
  { label: 'Give me a plan', prompt: 'Give me a short practical plan with the next three steps, in order.' },
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

  const insertIntoNotebook = (content: string) => {
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
            notebookId: notebookBind?.notebookId,
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
  const pinToBottomRef = useRef(true);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
  const pendingEditMessageIdRef = useRef<string | null>(null);
  const persistChatIdRef = useRef<string | null>(null);
  const [composerDraft, setComposerDraft] = useState('');
  const [composerDraftNonce, setComposerDraftNonce] = useState(0);

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
    if (chat && chat.messages.some((message) => !message.isStreaming)) {
      void pushChatToRemote(chat)
    }
  }, [chats, isStreaming]);

  // Active chat object — nullable if chats array is empty (e.g. localStorage cleared)
  const activeChat = chats.length > 0
    ? (chats.find((c) => c.id === activeChatId) || chats[0])
    : undefined;

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


  const readGap = () => {
    const scroller = chatScrollRef.current
    if (!scroller) return 0
    return scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
  }

  const updateAwayFromBottom = () => {
    const scroller = chatScrollRef.current
    if (!scroller) {
      pinToBottomRef.current = true
      setIsAwayFromBottom(false)
      return
    }
    const away = readGap() > 120
    pinToBottomRef.current = !away
    setIsAwayFromBottom(away)
  }

  const keepPinnedIfNeeded = () => {
    const scroller = chatScrollRef.current
    if (!scroller) return
    if (pinToBottomRef.current) {
      scroller.scrollTop = scroller.scrollHeight
      setIsAwayFromBottom(false)
      return
    }
    setIsAwayFromBottom(readGap() > 120)
  }

  const scrollChatToBottom = (behavior: ScrollBehavior = 'auto') => {
    const scroller = chatScrollRef.current
    if (!scroller) return
    if (behavior === 'auto') {
      scroller.scrollTop = scroller.scrollHeight
    } else {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    }
    pinToBottomRef.current = true
    setIsAwayFromBottom(false)
  }

  const scrollToBottom = () => {
    scrollChatToBottom('smooth')
  }

  useEffect(() => {
    const scroller = chatScrollRef.current
    if (!scroller) return
    // New assistant rows grow the list. Measuring the gap here would look like
    // the user scrolled away and skip the pin — that jumps the thread on mobile.
    if (pinToBottomRef.current) {
      scroller.scrollTop = scroller.scrollHeight
      setIsAwayFromBottom(false)
    } else {
      updateAwayFromBottom()
    }
    scroller.addEventListener('scroll', updateAwayFromBottom, { passive: true })
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(keepPinnedIfNeeded)
    })
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    return () => {
      scroller.removeEventListener('scroll', updateAwayFromBottom)
      observer.disconnect()
    }
  }, [activeChatId, Boolean(activeChat?.messages.length)])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onViewport = () => {
      if (!pinToBottomRef.current) return
      requestAnimationFrame(() => scrollChatToBottom('auto'))
    }
    vv.addEventListener('resize', onViewport)
    vv.addEventListener('scroll', onViewport)
    return () => {
      vv.removeEventListener('resize', onViewport)
      vv.removeEventListener('scroll', onViewport)
    }
  }, [])

  const lastStreamTick = (() => {
    const last = activeChat?.messages[activeChat.messages.length - 1]
    if (!last) return `${activeChatId}:empty`
    return `${last.id}:${last.content.length}:${last.isStreaming ? 1 : 0}:${last.thinkingProcess?.steps?.length || 0}`
  })()

  // Stay pinned to the latest line unless the user scrolled away
  useEffect(() => {
    if (!pinToBottomRef.current) return
    requestAnimationFrame(() => scrollChatToBottom('auto'))
  }, [lastStreamTick])

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
    pinToBottomRef.current = true
    setIsAwayFromBottom(false)
    requestAnimationFrame(() => scrollChatToBottom('auto'))
    abortControllerRef.current = new AbortController();

    const selectedStyle = STYLE_PRESETS.find((s) => s.id === selectedStylePreset);
    const activeProjectObj = projects.find((p) => p.id === activeProjectId);

    let accumulatedContent = '';
    let currentThinkingProcess = {
      durationSeconds: 0,
      tokenCount: 0,
      steps: [] as any[],
      summary: '',
    };
    let streamedArtifacts: Artifact[] = [];
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

      const conversationHistory = baseMessages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-6)
        .map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content.slice(0, 1200),
        }))
        .filter((message) => message.content.trim().length > 0)

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

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const parsed = parseAiSseEvent(frame);
          if (!parsed) continue;

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
            else currentThinkingProcess.steps.unshift(searchStep);
            currentThinkingProcess.steps = [...currentThinkingProcess.steps];
            currentThinkingProcess.summary = parsed.search.status === 'running' ? searchTitle : '';
            updateAssistantMessage(targetChatId, assistantMessageId, {
              thinkingProcess: { ...currentThinkingProcess },
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
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: sanitizePublicAssistantText(accumulatedContent),
              thinkingProcess: { ...currentThinkingProcess },
            });
          }

          if (parsed.type === 'done') {
            appendStreamedArtifacts(parsed.artifacts);
            accumulatedContent = parsed.fullText || accumulatedContent;
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: sanitizePublicAssistantText(accumulatedContent),
              artifacts: streamedArtifacts,
              citations: streamedCitations,
              thinkingProcess: { ...currentThinkingProcess },
            });
          }
        }
      }

      let finalCleanContent = sanitizePublicAssistantText(accumulatedContent);
      if (!finalCleanContent && !backendError) {
        throw new Error('AI returned no content');
      }

      // OS Intent Detection
      let detectedAction: OSActionCardType | undefined;
      const lowerText = (promptText + ' ' + finalCleanContent).toLowerCase();

      if (lowerText.includes('create notebook') || lowerText.includes('new notebook') || promptText.startsWith('/notebook')) {
        const titleMatch = promptText.match(/(?:notebook|on|about)\s+([a-zA-Z0-9\s]+)/i);
        const title = titleMatch ? titleMatch[1].trim() : 'AI Generated Notes';
        detectedAction = {
          type: 'create_notebook',
          title: `Create Notebook: "${title}"`,
          description: 'Save and open a new workspace notebook',
          payload: { title, content: finalCleanContent },
        };
      } else if (lowerText.includes('forum topic') || lowerText.includes('start debate') || lowerText.includes('community post')) {
        detectedAction = {
          type: 'create_forum_topic',
          title: `Start Forum Topic: "${promptText.slice(0, 30)}..."`,
          description: 'Publish thread to community forum',
          payload: { title: promptText, content: finalCleanContent },
        };
      } else if (isAdminNavigationRequest(promptText) && !isUiDesignRequest(promptText)) {
        detectedAction = {
          type: 'open_window',
          title: 'Open Admin OS Dashboard',
          description: 'Navigate to system moderation dashboard',
          payload: { path: '/admin' },
        };
      }

      let extractedArtifacts: Artifact[] = [];
      try {
        const rawArtifacts = dedupeArtifacts([
          ...streamedArtifacts,
          ...extractArtifactsFromContent(finalCleanContent, promptText),
        ]);
        if (rawArtifacts.length > 0) {
          const existingChatArtifacts = activeChat?.messages.flatMap((m) => m.artifacts || []) || [];
          for (const rawArt of rawArtifacts) {
            const { activeArtifact: revisedArt } = processArtifactRevision(existingChatArtifacts, rawArt);
            extractedArtifacts.push(
              revisedArt.type === 'react'
                ? { ...revisedArt, content: prepareSandpackSource(revisedArt.content) }
                : revisedArt
            );
          }
        }
      } catch (artifactError) {
        console.error('[workspace chat] artifact extract failed', artifactError)
      }

      // Clean chat message text — strip ALL artifact content so it doesn't duplicate inside the chat bubble.
      // This handles both <antArtifact>...</antArtifact> XML tags AND markdown code blocks (```html, ```react, etc.)
      // that were successfully extracted into Artifact objects by extractArtifactsFromContent.
      let visibleMessageText = finalCleanContent;
      if (extractedArtifacts.length > 0) {
        visibleMessageText = stripExtractedArtifactMarkup(visibleMessageText)
      }
      if (!visibleMessageText && extractedArtifacts.length > 0) {
        const first = extractedArtifacts[0]
        const isScreen = first.type === 'react' || first.type === 'html'
        const artifactLabel =
          first.type === 'chart' ? 'chart' : isScreen ? 'screen' : 'document'
        visibleMessageText = isScreen
          ? `Opened **"${first.title}"** in the preview workspace.`
          : `Created **"${first.title}"** (${artifactLabel} v${first.version || 1}). Open the card below to review it.`;
      }

      // If we had a backend error, do not overwrite the assistant message again with empty content!
      if (!backendError) {
        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: visibleMessageText || finalCleanContent || 'Response ready.',
          thinkingProcess: { ...currentThinkingProcess },
          artifacts: extractedArtifacts.length > 0 ? extractedArtifacts : undefined,
          isStreaming: false,
          isTypingDone: true,
          osAction: detectedAction,
        });
      }

      isStreamComplete = true; // successfully reached the end!
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[ClaudeWorkspaceChat] Request aborted by user/system.');
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const executeOSAction = (msgId: string, action: OSActionCardType) => {
    try {
      if (action.type === 'create_notebook') {
        createNotebook(action.payload.title || 'AI Generated Notes', action.payload.content || '');
        if (app?.addWindow) app.addWindow({ path: '/notebooks' });
      } else if (action.type === 'create_forum_topic') {
        if (app?.addWindow) app.addWindow({ path: '/community' });
      } else if (action.type === 'open_window') {
        if (app?.addWindow && action.payload.path) app.addWindow({ path: action.payload.path });
      }

      updateAssistantMessage(activeChatId, msgId, {
        osAction: { ...action, executed: true },
      });
    } catch (e) {
      console.warn('[Ask AI] Action execution error:', e);
    }
  };

  const handleDeleteChat = (id: string) => {
    rememberDeletedChatId(id)
    setChats((prev) => prev.filter((c) => c.id !== id));
    void deleteChatOnRemote(id);
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setActiveChatId(remaining[0]?.id || '');
    }
  };

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
      <div ref={workspaceRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-primary text-primary">
        {/* Top Header Bar */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeChatTitle={activeChat?.title}
        />

        {/* Chat Stream & Conversation Body */}
        <main
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto relative bg-primary overscroll-contain [overflow-anchor:none]"
        >
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 sm:p-6 max-w-3xl mx-auto select-none">
              <div className="mb-5 flex w-full flex-wrap justify-center gap-2">
                {EMPTY_STARTERS.map((starter) => (
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
              <div className="w-full pointer-events-auto">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onStopStreaming={handleStopStreaming}
                  isStreaming={isStreaming}
                  selectedStylePreset={selectedStylePreset}
                  onChangeStylePreset={setSelectedStylePreset}
                  onScrollToBottom={scrollToBottom}
                  showScrollToBottom={false}
                  models={models}
                  selectedModelId={selectedModelId}
                  onSelectModel={handleSelectModel}
                  draftPrompt={composerDraft}
                  draftNonce={composerDraftNonce}
                  menuPlacement="bottom-start"
                />
              </div>
            </div>
          ) : (
            <div className="pt-3 pb-36 space-y-5">
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
              <div ref={chatBottomRef} className="h-4" />
            </div>
          )}
        </main>

        {activeChat && activeChat.messages.length > 0 && (
        <div
          data-writing-dock
          className="absolute inset-x-0 bottom-0 z-20 pointer-events-none bg-gradient-to-t from-primary via-primary/95 to-transparent pt-14 pb-3"
        >
          <ChatInput
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            isStreaming={isStreaming}
            selectedStylePreset={selectedStylePreset}
            onChangeStylePreset={setSelectedStylePreset}
            onScrollToBottom={scrollToBottom}
            showScrollToBottom={isAwayFromBottom}
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={handleSelectModel}
            draftPrompt={composerDraft}
            draftNonce={composerDraftNonce}
            menuPlacement="top-start"
          />
        </div>
        )}

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
