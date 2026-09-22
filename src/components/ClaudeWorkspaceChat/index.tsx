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
  AgentMode,
  HumanTurn,
  AgentCheckpoint,
} from './types';
import {
  AVAILABLE_MODELS,
  INITIAL_CHATS,
  INITIAL_PROJECTS,
  STYLE_PRESETS,
} from './data/initialData';
import dynamic from 'next/dynamic';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ASK_STARTERS, ChatInput } from './components/ChatInput';
import { motion, AnimatePresence } from 'framer-motion';

// Panels/modals are rare on cold open — keep them out of the Ask AI first paint chunk.
const ArtifactsPanel = dynamic(() => import('./components/ArtifactsPanel').then((m) => m.ArtifactsPanel), { ssr: false });
const ArtifactWindowContent = dynamic(() => import('./components/ArtifactWindowContent').then((m) => m.ArtifactWindowContent), { ssr: false });
const SourcesPanel = dynamic(() => import('./components/SourcesPanel').then((m) => m.SourcesPanel), { ssr: false });
const SearchModal = dynamic(() => import('./components/SearchModal').then((m) => m.SearchModal), { ssr: false });
const ProjectModal = dynamic(() => import('./components/ProjectModal').then((m) => m.ProjectModal), { ssr: false });
const SettingsModal = dynamic(() => import('./components/SettingsModal').then((m) => m.SettingsModal), { ssr: false });
const ShareModal = dynamic(() => import('./components/ShareModal').then((m) => m.ShareModal), { ssr: false });
import * as Portal from '@radix-ui/react-portal';
import { useApp, useAppWindows } from '../../context/App';
import { useUser } from '../../hooks/useUser';
import { isUserPro } from '../../lib/wim-billing';
import { findMatchingWindow } from '../../lib/os/window-finder';
import { WINDOW_BG } from '../../constants/frostedSurfaces';
import { getNotebook, getNotebooks, createNotebook } from '../../notebook-app/scenes/notebooks/notebookStorage';
import { ScratchpadStore } from '../../lib/scratchpad-store';
import { pdfPromptExcerpt } from '../../lib/pdf-pages';
import { StudyDeckStore } from '../../lib/study-deck-store';
import {
  NOTEBOOK_CHAT_BIND_EVENT,
  type NotebookChatBind,
  bindNotebookChat,
  buildNotebookAgentContext,
  readNotebookChatBind,
  readNotebookSelection,
} from '../../lib/notebook-chat-bind';
import { IconDocument } from '@posthog/icons';
import { messageToNotebookMarkdown } from '../../lib/notebook-artifact-block';
import { finalizeArtifactTurn } from '../../lib/artifacts';
import { dedupeArtifacts, visibleStreamingReply } from './utils/extractArtifacts';
import { artifactWindowKey, artifactWindowPath, draftArtifactFromToolEvent, isArtifactBuildTool } from '../../lib/artifacts/draft';
import type { OSActionCard as OSActionCardType } from './types';

import { processArtifactRevision } from './utils/toolCalling';
import { parseAiSseEvent, toPublicProviderLabel, type AiArtifact } from 'lib/ai/contracts';
import { scrubSecretMaterial } from 'lib/ai/scrub';
import {
  activityFromToolEvent,
  applyAgentActivity,
  processItemToThinkingStep,
  type ProcessItem,
} from '../../lib/bots/agent/activity';
import { toolStatusLabel } from '../../lib/bots/tools/labels';
import { parseChartSpec, stripChartArtifactMarkup } from 'lib/ai/chart-artifacts';
import { stripLeakedToolMarkup } from '../../lib/bots/tools/leak';
import { resolveHumanTurn } from '../../lib/human-turn-ux';
import {
  classifyChatStreamError,
  isAbortError,
  shouldSilentRetryChatStream,
  chatStreamErrorTelemetryProps,
  userFacingChatStreamMessage,
} from '../../lib/chat-stream-errors';
import usePostHog from '../../hooks/usePostHog';

import { stripThinkingBlocks } from 'lib/bots/thinking-tags';
import { ensureLemonStyles, releaseLemonStyles } from 'lib/lemon/ensureLemonStyles';
import { LemonScope } from '../LemonScope';
import { writeForumDraft } from 'lib/wim-os-action-drafts';
import { findNotebookWindow } from '../../lib/open-ask-ai-window';
import { extractNotebookId, notebookWindowPath, windowPathMatches } from '../../lib/window-path';
import { dispatchNotebookOsEvent } from '../../lib/notebook-os-dispatch';
import {
  adoptGuestChatsIntoAccount,
  chatAuthHeaders,
  chatAuthHeadersFresh,
  claimDeviceAccountOnLogin,
  deleteChatOnRemote,
  getChatStorageKey,
  startWorkspaceChatPolling,
  subscribeToWorkspaceChats,
  mergeChats,
  pullChatByIdFromRemote,
  pullChatsFromRemote,
  flushChatToRemoteKeepalive,
  pushChatToRemote,
  pushDirtyLocalChats,
  readLocalChats,
  readLocalDeletedChatIds,
  rememberDeletedChatId,
  setRemoteChatShare,
  setRemoteMessageLiked,
  writeLocalChats,
} from '../../lib/chat-remote';
import { WIM_IDENTITY_EVENT } from '../../lib/wim-identity';
import { updateCachedTokenQuota } from '../../lib/chat-usage-client';
import {
  CHAT_PIN_TOP_PADDING_PX,
  applyMinSpacerForScrollTop,
  applyMinSpacerToPreserveScrollTop,
  computePinSpacerHeight,
  elementOffsetInScroller,
  scrollElementToScrollerPin,
} from '../../lib/chat-scroll';
import { getActiveByokPayload } from '../../lib/byok-vault';

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
  return scrubSecretMaterial(
    stripLeakedToolMarkup(stripThinkingBlocks(stripChartArtifactMarkup(value))),
  );
}

/** Reload / crash mid-stream can leave isStreaming:true in localStorage — settle as stopped.
 * Also scrub host/tool artifact leaks left in older assistant bubbles. */
function settleInterruptedStreams(chats: Chat[]): Chat[] {
  let changed = false
  const next = chats.map((chat) => {
    let msgChanged = false
    const messages = (chat.messages || []).map((message) => {
      let nextMessage = message
      if (message.role === 'assistant' && message.content) {
        const cleaned = sanitizePublicAssistantText(message.content)
        if (cleaned !== message.content) {
          nextMessage = { ...nextMessage, content: cleaned }
          msgChanged = true
          changed = true
        }
      }
      if (!nextMessage.isStreaming) return nextMessage
      msgChanged = true
      changed = true
      return {
        ...nextMessage,
        isStreaming: false,
        isTypingDone: true,
        stopped: nextMessage.stopped ?? true,
      }
    })
    return msgChanged ? { ...chat, messages } : chat
  })
  return changed ? next : chats
}

export default function App({ onClose, layout = 'overlay' }: { onClose?: () => void; layout?: 'overlay' | 'window' }) {
  // Persistence state
  const [chats, setChats] = useState<Chat[]>(() => {
    const stored = readLocalChats<unknown>(readStored<unknown>(CHAT_STORAGE_KEYS, INITIAL_CHATS));
    const list = Array.isArray(stored) ? (stored as Chat[]) : INITIAL_CHATS;
    return settleInterruptedStreams(list);
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
  const { user } = useUser();
  const posthog = usePostHog();
  const { chatParams, setChatParams } = app;
  const processedInitialQuestionRef = useRef<string | null>(null);
  // Subscribe to windows via dedicated context so we re-render when windows change
  const { windows: appWindows } = useAppWindows();
  const [notebookBind, setNotebookBind] = useState<NotebookChatBind | null>(null);
  const [dismissedNotebookId, setDismissedNotebookId] = useState<string | null>(null);
  const selectedModelIdRef = useRef<ModelId>(settings.defaultModel);

  // Extract active open notebook or explicitly bound notebook
  const activeNotebookInfo = React.useMemo(() => {
    if (notebookBind?.notebookId) {
      if (dismissedNotebookId === notebookBind.notebookId) return null;
      return { id: notebookBind.notebookId, title: notebookBind.title || 'Notebook' };
    }
    const openNb = findNotebookWindow(appWindows);
    if (!openNb?.path) return null;
    const nbId = extractNotebookId(openNb.path);
    if (!nbId || dismissedNotebookId === nbId) return null;
    const bound = getNotebook(nbId);
    return {
      id: nbId,
      title: bound?.title || openNb.title || 'Notebook',
    };
  }, [appWindows, notebookBind, dismissedNotebookId]);

  // Extract full active notebook text content from open notebook windows
  const activeNotebookContext = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const boundId = activeNotebookInfo?.id;
    if (boundId) {
      const bound = getNotebook(boundId);
      return buildNotebookAgentContext({
        title: bound?.title || activeNotebookInfo?.title || 'Notebook',
        content: bound?.content,
        selection: readNotebookSelection(),
      });
    }
    return '';
  }, [activeNotebookInfo]);

  const insertIntoNotebook = (content: string, notebookId?: string) => {
    const text = String(content || '').trim()
    if (!text) return Promise.resolve(false)
    const targetNbId = notebookId || notebookBind?.notebookId;
    const notebookPath = targetNbId ? notebookWindowPath(targetNbId) : '/notebooks'
    return dispatchNotebookOsEvent(
      'wimNotebookInsertText',
      {
        text,
        mode: 'append',
        notebookId: targetNbId,
      },
      {
        notebookId: targetNbId,
        path: notebookPath,
        open: () => {
          if (app?.addWindow) {
            app.addWindow({
              title: 'Notebooks',
              icon: 'DocumentTextIcon',
              component: 'NotebookApp',
              path: notebookPath,
            })
          }
        },
      }
    )
  }

  // Active chat state
  const [models, setModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0]?.id || '');
  /** Only pin-to-bottom on intentional chat switches (sidebar/new/search/delete), not rehydrate flicker. */
  const pinBottomOnNextChatRef = useRef(true);
  /** Keep last known open chat so metadata sync / hydrate gaps do not flash empty and reset scrollTop to 0. */
  const stickyActiveChatRef = useRef<Chat | undefined>(undefined);
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
          setActiveChatId((current) => {
            if (existing.id === current) return current
            pinBottomOnNextChatRef.current = true
            return existing.id
          })
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
        pinBottomOnNextChatRef.current = true
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
    import('../../notebook-app/lib/philosophers').then(({ fetchPhilosopherRosterWithAvatars }) => {
      fetchPhilosopherRosterWithAvatars()
        .then((roster) => {
          setModels((prevModels) => {
            return prevModels.map((m) => {
              if (m.id === 'claude-3-7-sonnet') return m;
              const liveBot = roster.find((bot) => bot.id === m.id);
              if (liveBot && liveBot.avatarUrl) {
                return { ...m, avatarUrl: liveBot.avatarUrl };
              }
              return m;
            });
          });
        })
        .catch(() => { /* ignore */ });
    }).catch(() => { /* ignore */ });
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
        key: artifactWindowKey(art),
        title: `${art.title || 'Component'}`,
        path: artifactWindowPath(art),
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
  const [streamStatus, setStreamStatus] = useState<'thinking' | 'quality' | 'answering' | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Monotonic turn id so an aborted turn's finally cannot clear a newer in-flight stream. */
  const streamEpochRef = useRef(0);
  const resumeAbortRef = useRef(false);
  /** Prevent double Answer/Run from racing two resumes before pending clears. */
  const humanRespondInFlightRef = useRef(false);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLElement>(null);
  const isStreamingRef = useRef(false);
  const pendingEditMessageIdRef = useRef<string | null>(null);
  const persistChatIdRef = useRef<string | null>(null);
  const executedActionsRef = useRef(new Set<string>());
  const [composerDraft, setComposerDraft] = useState('');
  const [composerDraftNonce, setComposerDraftNonce] = useState(0);
  const [lockShakeNonce, setLockShakeNonce] = useState(0);
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

  const [shareBusy, setShareBusy] = useState(false);

  const persistOwnerRef = useRef(getChatStorageKey())
  const lastWrittenChatsStrRef = useRef<string>('')
  const chatsRef = useRef(chats)
  chatsRef.current = chats
  const isStreamingRefForPersist = useRef(isStreaming)
  isStreamingRefForPersist.current = isStreaming

  const flushLocalChats = useCallback((next: Chat[] = chatsRef.current) => {
    try {
      const key = getChatStorageKey()
      if (key !== persistOwnerRef.current) {
        persistOwnerRef.current = key
        return
      }
      const serialized = JSON.stringify(next)
      if (serialized !== lastWrittenChatsStrRef.current) {
        writeLocalChats(next)
        lastWrittenChatsStrRef.current = serialized
      }
    } catch {
      // A full localStorage quota must not break an active conversation.
    }
  }, [])

  // Save to LocalStorage — debounce during streaming so every token does not sync I/O.
  useEffect(() => {
    if (isStreaming) {
      const timer = window.setTimeout(() => flushLocalChats(chats), 400)
      return () => window.clearTimeout(timer)
    }
    flushLocalChats(chats)
  }, [chats, isStreaming, flushLocalChats]);

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

  const knownChatIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    knownChatIdsRef.current = new Set(chats.map((c) => c.id))
  }, [chats])

  const activeChatIdRef = useRef(activeChatId)
  activeChatIdRef.current = activeChatId

  useEffect(() => {
    let cancelled = false
    let isSyncing = false
    let syncPending = false

    const hydrateChatById = async (chatId: string) => {
      if (!chatId || cancelled) return
      const full = await pullChatByIdFromRemote(chatId)
      if (cancelled || !full) return
      setChats((prev) => mergeChats(prev, [full], readLocalDeletedChatIds()))
    }

    const syncFromRemote = async (claim = false) => {
      if (isSyncing) {
        syncPending = true
        return
      }
      isSyncing = true
      try {
        if (claim) await claimDeviceAccountOnLogin()
        if (cancelled) return
        const remote = await pullChatsFromRemote()
        if (cancelled || !remote) return
        const deletedIds = [...readLocalDeletedChatIds(), ...remote.deletedIds]
        for (const id of remote.deletedIds) rememberDeletedChatId(id)
        let nextActive = activeChatIdRef.current
        setChats((prev) => {
          const merged = mergeChats(prev, remote.chats, deletedIds)
          if (merged.length > 0 && !merged.some((chat) => chat.id === nextActive)) {
            nextActive = merged[0].id
            pinBottomOnNextChatRef.current = true
            setActiveChatId(merged[0].id)
          }
          if (merged.length === 0) {
            nextActive = ''
            pinBottomOnNextChatRef.current = true
            setActiveChatId('')
          }
          return merged
        })
        // List is metadata-only — load messages for the open chat (egress).
        if (nextActive) await hydrateChatById(nextActive)
        // Push local drafts the other device has not seen yet (cap inside helper).
        if (!cancelled) {
          void pushDirtyLocalChats(chatsRef.current, 6)
        }
      } finally {
        isSyncing = false
        if (syncPending && !cancelled) {
          syncPending = false
          void syncFromRemote(false)
        }
      }
    }
    void syncFromRemote(true)

    let pullTimer: number | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedulePull = (payload?: any) => {
      if (payload?.table === 'wim_chat_messages' && payload.new?.chat_id) {
         const chatId = String(payload.new.chat_id)
         if (!knownChatIdsRef.current.has(chatId)) return
         window.clearTimeout(pullTimer)
         pullTimer = window.setTimeout(() => {
           void hydrateChatById(chatId)
         }, 350)
         return
      }
      window.clearTimeout(pullTimer)
      pullTimer = window.setTimeout(() => {
        void syncFromRemote(false)
      }, 350)
    }

    let isRealtimeActive = false
    const onIdentity = () => {
      adoptGuestChatsIntoAccount()
      persistOwnerRef.current = getChatStorageKey()
      const stored = readLocalChats<Chat[]>([])
      // Keep sticky messages mounted across owner-key swap; do not pin-to-bottom unless chat id changes.
      setChats(settleInterruptedStreams(Array.isArray(stored) ? stored : []))
      void syncFromRemote(true)
    }

    window.addEventListener(WIM_IDENTITY_EVENT, onIdentity)
    const stopRealtime = subscribeToWorkspaceChats(schedulePull, (status) => {
      isRealtimeActive = status === 'SUBSCRIBED'
    })
    const stopPolling = startWorkspaceChatPolling(() => {
      if (!isRealtimeActive) schedulePull()
    })

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

  const abortActiveStream = useCallback(() => {
    const controller = abortControllerRef.current
    abortControllerRef.current = null
    if (controller && typeof controller.abort === 'function') {
      try {
        if (!controller.signal?.aborted) {
          controller.abort()
        }
      } catch {
        /* already aborted or closed */
      }
    }
    const reader = streamReaderRef.current
    streamReaderRef.current = null
    if (reader && typeof reader.cancel === 'function') {
      try {
        reader.cancel('client-stop').catch(() => {
          /* already closed or aborted */
        })
      } catch {
        /* already closed */
      }
    }
  }, [])

  // Unmount / window close must cancel in-flight /api/chat work and flush pending chat saves.
  useEffect(() => {
    const flushPendingRemote = () => {
      const pendingId = persistChatIdRef.current
      const list = chatsRef.current
      const target = pendingId
        ? list.find((item) => item.id === pendingId)
        : list.find((item) => item.id === activeChatIdRef.current)
      if (!target) return
      if (readLocalDeletedChatIds().includes(target.id)) return
      if (!target.messages.some((message) => !message.isStreaming)) return
      persistChatIdRef.current = null
      flushLocalChats(list)
      flushChatToRemoteKeepalive(target)
    }
    const onPageHide = () => {
      flushPendingRemote()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      flushPendingRemote()
      abortActiveStream()
    }
  }, [abortActiveStream, flushLocalChats])

  const resolvedActiveChat = chats.find((c) => c.id === activeChatId) || (!activeChatId ? chats[0] : undefined)
  if (resolvedActiveChat) {
    stickyActiveChatRef.current = resolvedActiveChat
  } else if (!activeChatId) {
    stickyActiveChatRef.current = undefined
  }
  // While remote list/hydrate briefly omits the open chat, keep prior messages mounted so scrollTop stays put.
  const activeChat =
    resolvedActiveChat ||
    (activeChatId && stickyActiveChatRef.current?.id === activeChatId ? stickyActiveChatRef.current : undefined)
  isStreamingRef.current =
    isStreaming || Boolean(activeChat?.messages.at(-1)?.isStreaming)

  // Cross-device / reload: chats persist notebookId; session bind does not. Rehydrate bind so tools keep working.
  useEffect(() => {
    const notebookId = activeChat?.notebookId
    if (!notebookId) return
    const current = readNotebookChatBind()
    if (current?.notebookId === notebookId) return
    bindNotebookChat({ notebookId, title: activeChat?.title })
  }, [activeChat?.id, activeChat?.notebookId, activeChat?.title])

  // Sync selected model when switching active chat
  useEffect(() => {
    if (activeChat?.modelId) {
      setSelectedModelId(activeChat.modelId);
    }
  }, [activeChatId]);

  // Load full messages for the open chat (list endpoint is metadata-only).
  useEffect(() => {
    if (!activeChatId) return
    let cancelled = false
    void pullChatByIdFromRemote(activeChatId).then((full) => {
      if (cancelled || !full) return
      setChats((prev) => mergeChats(prev, [full], readLocalDeletedChatIds()))
    })
    return () => {
      cancelled = true
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


  const pinSpacerRef = useRef<HTMLDivElement>(null);
  const [pinSpacerHeight, setPinSpacerHeight] = useState(0);
  /** While set, hold this user message near the scroller top — only while the reply streams. */
  const pinnedMessageIdRef = useRef<string | null>(null);
  /** Suppress scroll-event pin release while we programmatically re-assert the pin. */
  const applyingPinScrollRef = useRef(false);
  /** scrollTop captured at settle — one-shot restore after Thought collapse (post-clamp). */
  const settleScrollTopRef = useRef<number | null>(null);
  /** Sticky post-settle view Y until the user scrolls — covers AppWindow clientHeight growth. */
  const stickyViewScrollTopRef = useRef<number | null>(null);

  const clearMessagePin = useCallback(() => {
    pinnedMessageIdRef.current = null;
  }, []);

  /**
   * Sync min spacer for current scrollTop (DOM first, then React state).
   * Used when scrollTop has not been clamped yet (e.g. AppWindow resize RO).
   */
  const preserveViewWithMinSpacer = useCallback(() => {
    const scroller = chatScrollRef.current;
    const spacerEl = pinSpacerRef.current;
    if (!scroller) {
      if (spacerEl) spacerEl.style.height = '0px';
      setPinSpacerHeight(0);
      return;
    }
    applyingPinScrollRef.current = true;
    const nextSpacer = applyMinSpacerToPreserveScrollTop(scroller, spacerEl);
    setPinSpacerHeight((prev) => (prev === nextSpacer ? prev : nextSpacer));
    requestAnimationFrame(() => {
      applyingPinScrollRef.current = false;
    });
  }, []);

  /**
   * After Thought/tool collapse the browser may already have clamped scrollTop.
   * Grow spacer for the *saved* settle scrollTop and write it back (layout-safe).
   */
  const restoreSettledScrollTop = useCallback(() => {
    const scroller = chatScrollRef.current;
    const saved = settleScrollTopRef.current;
    if (!scroller || saved == null) return;
    if (pinnedMessageIdRef.current) {
      settleScrollTopRef.current = null;
      return;
    }
    applyingPinScrollRef.current = true;
    const nextSpacer = applyMinSpacerForScrollTop(scroller, pinSpacerRef.current, saved);
    setPinSpacerHeight((prev) => (prev === nextSpacer ? prev : nextSpacer));
    if (Math.abs(scroller.scrollTop - saved) > 1) {
      scroller.scrollTop = saved;
    }
    settleScrollTopRef.current = null;
    requestAnimationFrame(() => {
      applyingPinScrollRef.current = false;
    });
  }, []);

  /**
   * Drop the pin (no idle RO re-pin). Capture scrollTop *before* React paints the
   * settled (collapsed Thought) UI. #795's immediate minSpacer undershot because it
   * measured while Thought was still tall; RO then ran after the clamp and could
   * not restore. Restore via useLayoutEffect + rAF using the saved scrollTop.
   */
  const clearMessagePinPreservingView = useCallback(() => {
    const scroller = chatScrollRef.current;
    if (scroller) {
      settleScrollTopRef.current = scroller.scrollTop;
      stickyViewScrollTopRef.current = scroller.scrollTop;
    }
    pinnedMessageIdRef.current = null;
    // Keep current spacer this frame — collapse may need a larger one after paint.
    const spacerEl = pinSpacerRef.current;
    const keep = spacerEl?.offsetHeight ?? 0;
    if (spacerEl) spacerEl.style.height = `${keep}px`;
    setPinSpacerHeight((prev) => (prev === keep ? prev : keep));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreSettledScrollTop();
      });
    });
  }, [restoreSettledScrollTop]);

  const findPinnedMessageEl = useCallback((messageId: string): HTMLElement | null => {
    const scroller = chatScrollRef.current;
    if (!scroller || !messageId) return null;
    const escapeId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(messageId)
        : messageId.replace(/"/g, '\\"');
    return scroller.querySelector(`[data-message-id="${escapeId}"]`) as HTMLElement | null;
  }, []);

  /**
   * Re-assert scrollTop so the pinned user bubble keeps a stable Y as the
   * assistant reply grows. No React state — ResizeObserver-safe.
   */
  const maintainPinnedScroll = useCallback(() => {
    const messageId = pinnedMessageIdRef.current;
    if (!messageId) return;
    const scroller = chatScrollRef.current;
    const el = findPinnedMessageEl(messageId);
    if (!scroller || !el) return;
    applyingPinScrollRef.current = true;
    scrollElementToScrollerPin(scroller, el, CHAT_PIN_TOP_PADDING_PX);
    // Release on next frame so the synthetic scroll event from scrollTop assign is ignored.
    requestAnimationFrame(() => {
      applyingPinScrollRef.current = false;
    });
  }, [findPinnedMessageEl]);

  /**
   * Establish the pin: bottom spacer + scrollTop so the message sits near the
   * top with a small inset. Call once on send (retries until DOM is ready).
   */
  const establishMessagePin = useCallback((messageId: string) => {
    const scroller = chatScrollRef.current;
    const el = findPinnedMessageEl(messageId);
    if (!scroller || !el) return false;

    const currentSpacer = pinSpacerRef.current?.offsetHeight ?? 0;
    const contentExcludingSpacer = scroller.scrollHeight - currentSpacer;
    const messageOffset = elementOffsetInScroller(scroller, el);
    const nextSpacer = computePinSpacerHeight(
      scroller.clientHeight,
      contentExcludingSpacer,
      messageOffset,
      CHAT_PIN_TOP_PADDING_PX
    );
    // Apply spacer synchronously so scrollTop can reach the pin target this frame.
    // Hold the suppress flag across spacer + scrollTop so a synthetic scroll event
    // cannot immediately release the pin we just established.
    applyingPinScrollRef.current = true;
    if (pinSpacerRef.current) {
      pinSpacerRef.current.style.height = `${nextSpacer}px`;
    }
    setPinSpacerHeight(nextSpacer);
    scrollElementToScrollerPin(scroller, el, CHAT_PIN_TOP_PADDING_PX);
    requestAnimationFrame(() => {
      applyingPinScrollRef.current = false;
    });
    return true;
  }, [findPinnedMessageEl]);

  /** Pin a user bubble near the top of the chat AppWindow scroller (not page). */
  const pinUserMessageToTop = useCallback((messageId: string) => {
    pinnedMessageIdRef.current = messageId;

    const attemptPin = (attempt: number) => {
      if (pinnedMessageIdRef.current !== messageId) return;
      if (establishMessagePin(messageId)) return;
      if (attempt < 8) requestAnimationFrame(() => attemptPin(attempt + 1));
    };

    attemptPin(0);
  }, [establishMessagePin]);


  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    pinnedMessageIdRef.current = null;
    settleScrollTopRef.current = null;
    stickyViewScrollTopRef.current = null;
    setPinSpacerHeight(0);
    if (behavior === 'auto') {
      scroller.scrollTop = scroller.scrollHeight;
    } else {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;

    /** User intentionally moved the viewport after settle — stop sticky restore. */
    const clearStickyForUserScroll = () => {
      settleScrollTopRef.current = null;
      stickyViewScrollTopRef.current = null;
    };

    const releasePinForManualScroll = () => {
      if (!pinnedMessageIdRef.current) return;
      clearMessagePinPreservingView();
    };

    const onTouchMove = () => {
      if (pinnedMessageIdRef.current) {
        releasePinForManualScroll();
        return;
      }
      // After settle: touch is user intent — clear sticky so RO does not yank back.
      // Do not clear sticky from clamp-generated `scroll` (mobile race).
      if (stickyViewScrollTopRef.current != null || settleScrollTopRef.current != null) {
        clearStickyForUserScroll();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 2 || Math.abs(e.deltaX) > 2) {
        if (pinnedMessageIdRef.current) {
          releasePinForManualScroll();
        } else if (
          stickyViewScrollTopRef.current != null ||
          settleScrollTopRef.current != null
        ) {
          clearStickyForUserScroll();
        }
      }
    };

    // Mid-stream: scrollbar / keyboard / PageUp release the pin (wheel/touch alone miss these).
    // Post-settle: do NOT clear sticky/settle refs here — Thought collapse and soft-keyboard
    // hide clamp scrollTop and fire `scroll`, which would wipe the saved Y before
    // useLayoutEffect/RO restore (mobile race: jump into older history). User intent
    // clears sticky via wheel/touchmove above.
    const onScroll = () => {
      if (applyingPinScrollRef.current) return;
      if (!pinnedMessageIdRef.current) return;
      releasePinForManualScroll();
    };

    scroller.addEventListener('touchmove', onTouchMove, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: true });
    scroller.addEventListener('scroll', onScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      // Pin is stream-only: never re-assert after the turn settles (idle image/font/layout
      // changes were yanking scrollTop back to the user bubble — upward jumps).
      if (pinnedMessageIdRef.current && isStreamingRef.current) {
        maintainPinnedScroll();
        return;
      }
      // Post-settle: Thought/tool collapse or AppWindow clientHeight change can drop
      // maxScroll under scrollTop. Grow spacer for sticky/saved Y and restore — do not re-pin.
      if (!pinnedMessageIdRef.current) {
        const desired = stickyViewScrollTopRef.current;
        if (desired != null) {
          applyingPinScrollRef.current = true;
          const nextSpacer = applyMinSpacerForScrollTop(
            scroller,
            pinSpacerRef.current,
            desired
          );
          setPinSpacerHeight((prev) => (prev === nextSpacer ? prev : nextSpacer));
          if (Math.abs(scroller.scrollTop - desired) > 1) {
            scroller.scrollTop = desired;
          }
          requestAnimationFrame(() => {
            applyingPinScrollRef.current = false;
          });
        } else {
          preserveViewWithMinSpacer();
        }
      }
    });
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);

    return () => {
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [activeChatId, clearMessagePinPreservingView, maintainPinnedScroll, preserveViewWithMinSpacer, Boolean(activeChat?.messages.length)]);

  // After settle: React commits Thought/tool collapse in the same turn as pin clear.
  // useLayoutEffect runs after that DOM update and restores saved scrollTop before paint.
  useLayoutEffect(() => {
    if (settleScrollTopRef.current == null) return;
    restoreSettledScrollTop();
  }, [
    isStreaming,
    activeChat?.messages.at(-1)?.isStreaming,
    activeChat?.messages.at(-1)?.thinkingProcess,
    restoreSettledScrollTop,
  ]);

  // Scroll chat to bottom only on intentional chat switches (not identity/sync rehydrate of same thread).
  useEffect(() => {
    if (!pinBottomOnNextChatRef.current) return;
    pinBottomOnNextChatRef.current = false;
    pinnedMessageIdRef.current = null;
    setPinSpacerHeight(0);
    scrollChatToBottom('auto');
  }, [activeChatId, scrollChatToBottom]);

  // Handle New Chat Creation
  const handleNewChat = (projId?: string) => {
    if (isStreamingRef.current) {
      abortActiveStream()
      setIsStreaming(false)
      setStreamStatus(null)
    }
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
    pinBottomOnNextChatRef.current = true;
    setActiveChatId(newChat.id);
    setActiveArtifact(null);
    closeArtifacts();
    setComposerDraftNonce((n) => n + 1);
  };

  // Handle HTML/JSON Chat Import
  const handleImportChat = (importedChat: Chat) => {
    setChats((prev) => [importedChat, ...prev]);
    pinBottomOnNextChatRef.current = true;
    setActiveChatId(importedChat.id);
  };

  // Handle Message Sending with Backend Streaming
  const handleSendMessage = async (
    promptText: string,
    attachments: FileAttachment[],
    options?: {
      skipUserAppend?: boolean
      historyOverride?: Message[]
      agentMode?: AgentMode
      resume?: AgentCheckpoint
      resumeAction?: 'run' | 'revise' | 'answer'
      resumePayload?: string
      continueMessageId?: string
    }
  ) => {
    if (!promptText.trim() && attachments.length === 0 && !options?.resume) return;
    humanRespondInFlightRef.current = false

    if (!options?.resume && !options?.skipUserAppend) {
      const pendingAsk = [...((chats.find((c) => c.id === (activeChatId || '')) || activeChat)?.messages || [])]
        .reverse()
        .find((item) => item.humanTurn?.kind === 'ask_user' && item.humanTurn.status === 'pending')
      if (pendingAsk && promptText.trim()) {
        handleHumanRespond(pendingAsk.id, 'answer', promptText.trim())
        return
      }
    }

    let targetChatId = activeChatId;
    const editMessageId = pendingEditMessageIdRef.current
    pendingEditMessageIdRef.current = null
    const sourceChat = chats.find((c) => c.id === (targetChatId || '')) || activeChat
    const turnAgentMode = options?.agentMode || sourceChat?.agentMode || 'ask'
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
        agentMode: turnAgentMode,
        messages: [],
      };
      setChats((prev) => [newChat, ...prev]);
      // New chat created by send: top-align the user bubble (pin-only; no stick mode).
      setActiveChatId(newChat.id);
      targetChatId = newChat.id;
    }

    const continued = options?.continueMessageId
      ? baseMessages.find((message) => message.id === options.continueMessageId)
      : undefined

    const userMessage: Message = {
      id: `m-user-${Date.now()}`,
      role: 'user',
      content: promptText || attachments.map((attachment) => attachment.name).join(', '),
      timestamp: new Date().toISOString(),
      attachments,
    };

    const assistantMessageId = continued?.id || `m-ast-${Date.now()}`;
    const assistantMessage: Message = continued
      ? {
          ...continued,
          isStreaming: true,
          isTypingDone: false,
          stopped: false,
          humanTurn:
            options?.resume && continued.humanTurn
              ? {
                  ...continued.humanTurn,
                  status:
                    options.resumeAction === 'run'
                      ? 'approved'
                      : options.resumeAction === 'answer'
                        ? 'answered'
                        : options.resumeAction === 'revise'
                          ? 'revised'
                          : continued.humanTurn.status,
                  ...(options.resumeAction === 'answer' && options.resumePayload
                    ? { answer: String(options.resumePayload).slice(0, 2000) }
                    : {}),
                }
              : continued.humanTurn,
        }
      : {
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
            steps:
              attachments.length > 0
                ? [
                    {
                      id: `doc-read-${Date.now()}`,
                      stepNumber: 1,
                      title: 'Reading Document',
                      detail: `Extracted and indexed: ${attachments.map((a) => a.name).join(', ')}`,
                      completed: false,
                    },
                  ]
                : [],
          },
        };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId) {
          if (continued) {
            return {
              ...c,
              agentMode: turnAgentMode,
              updatedAt: new Date().toISOString(),
              messages: c.messages.map((message) => (message.id === assistantMessageId ? assistantMessage : message)),
            }
          }
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
    setStreamStatus('thinking');
    // On a new user send: pin that user bubble near the top. ResizeObserver
    // holds the pin only while streaming. Manual scroll (wheel/touch/scrollbar)
    // releases the lock; stream settle always clears it (no idle re-pin).
    // skipUserAppend (Continue / resume): one-shot jump to bottom, no stick mode.
    if (!options?.skipUserAppend) {
      pinBottomOnNextChatRef.current = false;
      const pinId = userMessage.id;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => pinUserMessageToTop(pinId));
      });
    } else {
      clearMessagePin();
      setPinSpacerHeight(0);
      requestAnimationFrame(() => scrollChatToBottom('auto'));
    }
    abortActiveStream();
    const streamEpoch = ++streamEpochRef.current;
    const activeController = new AbortController();
    abortControllerRef.current = activeController;
    streamReaderRef.current = null;

    const selectedStyle = STYLE_PRESETS.find((s) => s.id === selectedStylePreset);
    const activeProjectObj = projects.find((p) => p.id === activeProjectId);

    let accumulatedContent = continued?.content || '';
    const thinkStartedAt = Date.now();
    let thinkSeq = 0
    let liveThinkId = 'stream-think-0'
    let processItems: ProcessItem[] = (continued?.thinkingProcess?.steps || []).map((step) => ({
      id: step.id,
      kind: step.kind === 'reasoning' ? 'thought' : step.kind === 'plan' ? 'plan' : step.kind === 'node' ? 'node' : 'tool',
      title: step.title,
      detail: step.detail,
      status: step.status || (step.completed ? 'done' : 'running'),
      toolName: step.toolName,
      args: step.arguments,
      result: step.result,
      seq: step.stepNumber,
    }))
    let currentThinkingProcess = {
      durationSeconds: continued?.thinkingProcess?.durationSeconds || 0,
      tokenCount: continued?.thinkingProcess?.tokenCount || 0,
      steps: (continued?.thinkingProcess?.steps ||
        (attachments.length > 0
          ? [
              {
                id: `doc-read-${Date.now()}`,
                stepNumber: 1,
                title: 'Reading Document',
                detail: `Extracted and indexed: ${attachments.map((a) => a.name).join(', ')}`,
              },
            ]
          : [])) as any[],
      summary: continued?.thinkingProcess?.summary || '',
    };
    let streamedArtifacts: Artifact[] = continued?.artifacts ? [...continued.artifacts] : [];
    let streamedAction: OSActionCardType | undefined;
    let streamedHumanTurn: HumanTurn | undefined = continued?.humanTurn;
    let streamedCheckpoint: AgentCheckpoint | undefined = continued?.checkpoint;
    let streamedProvider: 'groq' | 'gemini' | 'openai' | undefined;
    let streamedToolTrace: ToolTrace[] = continued?.toolTrace ? [...continued.toolTrace] : [];
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
    let streamErrorKind: Message["errorKind"] | undefined;
    let streamedQualityGate: Message["qualityGate"] | undefined;
    const streamStartedAt = Date.now();
    let streamChunkCount = 0;
    let streamByteLength = 0;
    /** No meaningful SSE (token/activity/tool/error/done) for this long → treat as hung stream. */
    const STREAM_STALL_MS = 70_000;
    let lastMeaningfulAt = streamStartedAt;
    let stallTimer: ReturnType<typeof setInterval> | null = null;
    let stalledByWatchdog = false;
    let hadMeaningfulStreamProgress = false;
    let networkRetryUsed = false;
    const markStreamProgress = () => {
      hadMeaningfulStreamProgress = true;
      lastMeaningfulAt = Date.now();
    };
    try {

      // Resolve active turn attachments or preserve active session document memory
      const effectiveAttachments = attachments.length > 0
        ? attachments
        : [...baseMessages]
            .reverse()
            .find((m) => m.role === 'user' && m.attachments && m.attachments.length > 0)?.attachments || [];

      const attachmentContext = effectiveAttachments
        .map((attachment) => {
          if (attachment.type === 'image') {
            return `User uploaded image this turn: ${attachment.name}. URL: ${attachment.url || ''}. Call analyze_image if you need to look at it.`;
          }
          if (attachment.type === 'audio') {
            return `User uploaded audio this turn: ${attachment.name}. URL: ${attachment.url || ''}.`;
          }
          if (attachment.type === 'pdf' || attachment.name.toLowerCase().endsWith('.pdf')) {
            return pdfPromptExcerpt(attachment.name, attachment.content || attachment.contentPreview || '')
          }
          const body = (attachment.content || attachment.contentPreview || '').slice(0, 4000)
          return `User uploaded document this turn: ${attachment.name}\n${body || '(no extractable text — say so if you cannot read it)'}`;
        })
        .join('\n\n')
        .slice(0, 12000);
      const effectivePrompt = promptText.trim() || 'Please analyze the attached material and respond with the most useful next step.';

      const conversationHistory: Array<Record<string, unknown>> = []
      for (const message of baseMessages.filter((item) => item.role === 'user' || item.role === 'assistant').slice(-6)) {
        let msgContent =
          message.role === 'assistant' ? sanitizePublicAssistantText(message.content) : message.content;
        if (message.role === 'user' && message.attachments && message.attachments.length > 0) {
          const docSnippet = message.attachments
            .filter((a) => a.type !== 'image' && (a.content || a.contentPreview))
            .map((a) => `[Document: ${a.name}]\n${(a.content || a.contentPreview || '').slice(0, 3000)}`)
            .join('\n\n');
          if (docSnippet && !msgContent.includes(docSnippet.slice(0, 50))) {
            msgContent = `${msgContent}\n\n${docSnippet}`;
          }
        }
        conversationHistory.push({
          role: message.role,
          content: msgContent.slice(0, 4000),
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

      const authHeaders = await chatAuthHeadersFresh(true);
      if (activeController.signal.aborted || abortControllerRef.current !== activeController) {
        return;
      }
      const chatRequestBody = JSON.stringify({
          prompt: effectivePrompt,
          byok: getActiveByokPayload(),
          modelId: selectedModelId,
          systemPrompt: activeProjectObj?.systemPrompt || '',
          styleSuffix: selectedStyle?.promptSuffix || '',
          attachmentContext,
          messages: conversationHistory,
          notebookContext: activeNotebookContext,
          notebookBound: Boolean(notebookBind?.notebookId || activeNotebookInfo?.id),
          conversationId: targetChatId,
          agentMode: turnAgentMode,
          checkpoint: options?.resume,
          resumeAction: options?.resumeAction,
          resumePayload: options?.resumePayload,
          workspace: {
            path: typeof window !== 'undefined' ? window.location.pathname : '/',
            user: user
              ? {
                  id: String(user.id),
                  name: user.profile?.firstName
                    ? `${user.profile.firstName}${user.profile.lastName ? ` ${user.profile.lastName}` : ''}`.trim()
                    : user.profile?.username || user.username || user.email?.split('@')[0],
                  username: user.profile?.username || user.username,
                  bio: user.profile?.biography || (user.profile as any)?.bio,
                  location: user.profile?.location,
                  pronouns: user.profile?.pronouns,
                  role: isUserPro(user) ? (user.role?.type || (user.isModerator ? 'moderator' : 'pro')) : (user.role?.type || 'member'),
                  plan: isUserPro(user) ? 'pro' : 'free',
                }
              : undefined,
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
            artifactVersion: activeArtifact?.version,
            artifacts: (activeChat?.messages || [])
              .flatMap((message) => message.artifacts || [])
              .slice(-12)
              .map((item) => ({
                id: item.id,
                title: item.title,
                type: item.type,
                version: item.version,
              })),
            attachments: effectiveAttachments
              .filter((item) => item.type !== 'image' && item.type !== 'audio' && (item.content || item.contentPreview))
              .slice(0, 4)
              .map((item) => ({
                name: item.name,
                content: (item.content || item.contentPreview || '').slice(0, 350_000),
              })),
            scratchpad: {
              documents: (() => {
                let budget = 350_000
                return ScratchpadStore.getState().documents.slice(0, 8).map((d) => {
                  const raw = d.content || ''
                  const take = raw.slice(0, budget)
                  budget = Math.max(0, budget - take.length)
                  return {
                    name: d.name,
                    size: d.size ? String(d.size) : undefined,
                    type: d.type,
                    pageCount: d.pageCount,
                    content: take || undefined,
                  }
                })
              })(),
              nodes: ScratchpadStore.getState().nodes.map((n) => ({ type: n.type, title: n.title, content: n.content, source: n.source })),
              tasks: ScratchpadStore.getState().tasks.map((t) => ({ title: t.title, status: t.status })),
              memories: ScratchpadStore.getState().memories.map((m) => ({ fact: m.fact, category: m.category })),
            },
          },
      });
      let sseRes: Response | undefined;
      for (let fetchAttempt = 0; ; fetchAttempt += 1) {
        try {
          sseRes = await fetch('/api/chat', {
            method: 'POST',
            headers: authHeaders,
            signal: activeController.signal,
            body: chatRequestBody,
          });
          break;
        } catch (fetchErr) {
          if (isAbortError(fetchErr)) throw fetchErr;
          const classifiedFetch = classifyChatStreamError({ err: fetchErr });
          if (
            shouldSilentRetryChatStream({
              classified: classifiedFetch,
              hadPublicText: Boolean(accumulatedContent.trim()),
              // Fetch-only retry site: progress flags are always false here; keep gate for safety.
              hadStreamProgress: hadMeaningfulStreamProgress || streamChunkCount > 0,
              attempt: fetchAttempt,
            }) &&
            !activeController.signal.aborted
          ) {
            networkRetryUsed = true;
            continue;
          }
          const fail = new Error(
            String((fetchErr as { message?: unknown } | undefined)?.message || classifiedFetch.userMessage || 'Failed to fetch')
          ) as Error & { kind?: Message['errorKind'] };
          if (classifiedFetch.kind !== 'abort') fail.kind = classifiedFetch.kind;
          throw fail;
        }
      }
      if (!sseRes) {
        const fail = new Error('Failed to fetch') as Error & { kind?: Message['errorKind'] };
        fail.kind = 'network';
        throw fail;
      }

      if (!sseRes.ok || !sseRes.body) {
        let errorMessage = `Chat API ${sseRes.status}`;
        let errCode = "";
        try {
          const errBody = await sseRes.json();
          if (errBody?.error) errorMessage = String(errBody.error);
          if (typeof errBody?.code === "string") errCode = errBody.code;
        } catch {
          /* use status text */
        }
        const classifiedHttp = classifyChatStreamError({
          httpStatus: sseRes.status,
          code: errCode,
          message: errorMessage,
        });
        const fail = new Error(errorMessage) as Error & {
          kind?: Message["errorKind"];
          httpStatus?: number;
          code?: string;
        };
        if (classifiedHttp.kind !== "abort") fail.kind = classifiedHttp.kind;
        fail.httpStatus = sseRes.status;
        if (errCode) fail.code = errCode;
        throw fail;
      }

      const reader = sseRes.body.getReader();
      streamReaderRef.current = reader;
      stallTimer = setInterval(() => {
        if (Date.now() - lastMeaningfulAt < STREAM_STALL_MS) return;
        stalledByWatchdog = true;
        try {
          activeController.abort();
        } catch {
          /* ignore */
        }
      }, 5_000);
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedCitations: Message['citations'] = [];

      let lastTokenFlushTime = 0;
      const streamSignal = activeController.signal;

      while (true) {
        if (streamSignal.aborted) {
          const abortErr = new DOMException('The operation was aborted.', 'AbortError')
          throw abortErr
        }
        let readResult: ReadableStreamReadResult<Uint8Array>
        try {
          readResult = await reader.read();
        } catch (readErr) {
          if (streamSignal.aborted || isAbortError(readErr)) {
            throw new DOMException('The operation was aborted.', 'AbortError')
          }
          throw readErr
        }
        const { value, done } = readResult;
        if (done) break;
        if (value) {
          streamChunkCount += 1;
          streamByteLength += value.byteLength;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const parsed = parseAiSseEvent(frame);
          if (!parsed) continue;
          // Keep-alive comments never parse; any real event means the turn left pre-stream.
          if (
            parsed.type === 'activity' ||
            parsed.type === 'phase' ||
            parsed.type === 'token' ||
            parsed.type === 'tool' ||
            parsed.type === 'human' ||
            parsed.type === 'error' ||
            parsed.type === 'thinking_start' ||
            parsed.type === 'search' ||
            parsed.type === 'done'
          ) {
            markStreamProgress();
          }

          if (parsed.type === 'activity') {
            const scrubbedActivity = {
              ...parsed.activity,
              title:
                typeof parsed.activity.title === 'string'
                  ? scrubSecretMaterial(parsed.activity.title)
                  : parsed.activity.title,
              detail:
                typeof parsed.activity.detail === 'string'
                  ? scrubSecretMaterial(parsed.activity.detail)
                  : parsed.activity.detail,
              delta:
                typeof parsed.activity.delta === 'string'
                  ? scrubSecretMaterial(parsed.activity.delta)
                  : parsed.activity.delta,
              arguments:
                typeof parsed.activity.arguments === 'string'
                  ? scrubSecretMaterial(parsed.activity.arguments)
                  : parsed.activity.arguments,
              result:
                typeof parsed.activity.result === 'string'
                  ? scrubSecretMaterial(parsed.activity.result)
                  : parsed.activity.result,
            }
            processItems = applyAgentActivity(processItems, scrubbedActivity)
            currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
            currentThinkingProcess.steps = [...currentThinkingProcess.steps]
            updateAssistantMessage(targetChatId, assistantMessageId, {
              thinkingProcess: { ...currentThinkingProcess },
            })
            continue
          }

          if (parsed.type === 'tool') {
            if (parsed.tool.status === 'running' && !streamedToolTrace.some((item) => item.id === parsed.tool.id)) {
              thinkSeq += 1
              liveThinkId = `stream-think-${thinkSeq}`
              currentThinkingProcess.steps = currentThinkingProcess.steps.map((step: any) =>
                typeof step.id === 'string' && step.id.startsWith('stream-think')
                  ? { ...step, completed: true, status: 'done' }
                  : step
              )
            }
            const toolTitle = toolStatusLabel(parsed.tool.name, parsed.tool.status);
            const safeToolDetail =
              typeof parsed.tool.detail === 'string'
                ? scrubSecretMaterial(parsed.tool.detail)
                : parsed.tool.detail
            const safeToolArguments =
              typeof parsed.tool.arguments === 'string'
                ? scrubSecretMaterial(parsed.tool.arguments)
                : parsed.tool.arguments
            const safeToolResult =
              typeof parsed.tool.result === 'string'
                ? scrubSecretMaterial(parsed.tool.result)
                : parsed.tool.result
            processItems = applyAgentActivity(
              processItems,
              activityFromToolEvent(
                {
                  ...parsed.tool,
                  detail: safeToolDetail,
                  arguments: safeToolArguments,
                  result: safeToolResult,
                },
                processItems.length + 1
              )
            )
            currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
            currentThinkingProcess.steps = [...currentThinkingProcess.steps]
            if (parsed.tool.status === 'running') currentThinkingProcess.summary = toolTitle;
            const nextTrace: ToolTrace = {
              id: parsed.tool.id,
              name: parsed.tool.name,
              status: parsed.tool.status,
              arguments: safeToolArguments,
              result: safeToolResult,
              detail: safeToolDetail,
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

            if (isArtifactBuildTool(parsed.tool.name) && parsed.tool.status === 'running') {
              const draft = draftArtifactFromToolEvent(parsed.tool)
              if (draft) {
                const existingPending = streamedArtifacts.find(
                  (item) => item.pending && (item.toolCallId === draft.toolCallId || item.id === draft.id)
                )
                const existing = [
                  ...((activeChat?.messages || []).flatMap((message) => message.artifacts || [])),
                  ...streamedArtifacts,
                ]
                const { activeArtifact: next } = processArtifactRevision(existing, draft, {
                  preferId: existingPending?.id,
                })
                const merged = { ...next, pending: true, toolCallId: draft.toolCallId }
                streamedArtifacts = [merged, ...streamedArtifacts.filter((item) => item.id !== merged.id)]
                openArtifact(merged)
                updateAssistantMessage(targetChatId, assistantMessageId, {
                  artifacts: streamedArtifacts,
                })
              }
            }
            if (isArtifactBuildTool(parsed.tool.name) && parsed.tool.status === 'error') {
              streamedArtifacts = streamedArtifacts.map((item) =>
                item.pending
                  ? { ...item, pending: false, error: String(parsed.tool.detail || 'Could not build artifact') }
                  : item
              )
              const failed = streamedArtifacts.find((item) => item.error)
              if (failed) openArtifact(failed)
              updateAssistantMessage(targetChatId, assistantMessageId, { artifacts: streamedArtifacts })
            }

            // Sync tool notes into Scratchpad store. Do not auto-open the window.
            if (
              parsed.tool.name === 'write_scratchpad' ||
              parsed.tool.name === 'scratchpad' ||
              parsed.tool.name === 'take_notes'
            ) {
              try {
                const args = JSON.parse(parsed.tool.arguments || '{}');
                if (args.content || args.note) {
                  ScratchpadStore.addNode({
                    content: args.content || args.note,
                    type: args.type,
                    title: args.title,
                    source: args.source || parsed.tool.detail,
                    tags: args.tags,
                  });
                }
              } catch {
                /* ignore */
              }
            }
            if (
              (parsed.tool.name === 'generate_flashcards' ||
                parsed.tool.name === 'create_flashcards' ||
                parsed.tool.name === 'flashcards' ||
                parsed.tool.name === 'study_flashcards' ||
                parsed.tool.name === 'make_flashcards') &&
              parsed.tool.status === 'done'
            ) {
              try {
                const parsedResult = JSON.parse(parsed.tool.result || '{}') as Record<string, unknown>
                StudyDeckStore.upsertFromToolResult(parsedResult)
              } catch {
                /* ignore */
              }
            }
            if (parsed.tool.name === 'todo_write' && parsed.tool.status === 'done') {
              try {
                const row = JSON.parse(parsed.tool.result || '{}') as { tasks?: Chat['activePlan'] }
                if (Array.isArray(row.tasks) && row.tasks.length) {
                  setChats((prev) =>
                    prev.map((chat) => (chat.id === targetChatId ? { ...chat, activePlan: row.tasks } : chat))
                  )
                }
              } catch {
                /* ignore */
              }
            }
            if (parsed.tool.name === 'remember' && parsed.tool.status === 'done') {
              try {
                const parsedResult = JSON.parse(parsed.tool.result || '{}') as { fact?: string; category?: string }
                const args = JSON.parse(parsed.tool.arguments || '{}') as { fact?: string; category?: string }
                const fact = parsedResult.fact || args.fact
                if (fact) ScratchpadStore.addMemory({ fact, category: parsedResult.category || args.category })
              } catch {
                /* ignore */
              }
            }
            if (parsed.tool.name === 'todo_write' && parsed.tool.status === 'done') {
              try {
                const parsedResult = JSON.parse(parsed.tool.result || parsed.tool.arguments || '{}') as {
                  tasks?: Array<{ id?: string; title?: string; status?: string }>
                }
                if (Array.isArray(parsedResult.tasks)) {
                  ScratchpadStore.setTasks(
                    parsedResult.tasks.map((task, index) => ({
                      id: String(task.id || index + 1),
                      title: String(task.title || ''),
                      status:
                        task.status === 'completed' || task.status === 'in_progress' ? task.status : 'pending',
                    }))
                  )
                }
              } catch {
                /* ignore */
              }
            }
          }

          if (parsed.type === 'search') {
            const searchStatus =
              parsed.search.status === 'error' ? ('error' as const) : parsed.search.status === 'done' ? ('done' as const) : ('running' as const)
            const searchTitle = toolStatusLabel('web_search', searchStatus)
            const safeSearchQuery =
              typeof parsed.search.query === 'string'
                ? scrubSecretMaterial(parsed.search.query)
                : parsed.search.query
            const safeSearchResults =
              typeof parsed.search.results === 'string'
                ? scrubSecretMaterial(parsed.search.results)
                : parsed.search.results
            processItems = applyAgentActivity(
              processItems,
              activityFromToolEvent(
                {
                  id: 'host-search',
                  name: 'web_search',
                  status: searchStatus,
                  detail: safeSearchQuery,
                  arguments: JSON.stringify({ query: safeSearchQuery }),
                  result: safeSearchResults || undefined,
                },
                processItems.length + 1
              )
            )
            currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
            currentThinkingProcess.steps = [...currentThinkingProcess.steps]
            currentThinkingProcess.summary = parsed.search.status === 'running' ? searchTitle : '';
            const searchTrace: ToolTrace = {
              id: 'host-search',
              name: 'web_search',
              status: parsed.search.status === 'error' ? 'error' : parsed.search.status === 'done' ? 'done' : 'running',
              detail: searchTitle,
              result: safeSearchResults || undefined,
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

          if (parsed.type === 'phase') {
            const phaseName = parsed.phase?.phase
            const phaseStatus = parsed.phase?.status
            const phaseDetailRaw =
              typeof parsed.phase?.detail === 'string'
                ? scrubSecretMaterial(parsed.phase.detail.trim())
                : ''
            const safeDetail =
              phaseDetailRaw.length > 0 && phaseDetailRaw.length < 120 ? phaseDetailRaw : undefined

            if (phaseName === 'generation') {
              if (phaseStatus === 'started') setStreamStatus('thinking')
              else if (phaseStatus !== 'failed') setStreamStatus('answering')
              const genId = 'lifecycle-generation'
              const status =
                phaseStatus === 'started' ? 'running' : phaseStatus === 'failed' ? 'error' : 'done'
              const providerLabel = toPublicProviderLabel(parsed.phase?.provider)
              processItems = applyAgentActivity(processItems, {
                seq: processItems.length + 1,
                kind: 'node',
                id: genId,
                status,
                title: 'Generating reply',
                detail:
                  status === 'error'
                    ? safeDetail || 'Generation failed'
                    : status === 'done'
                      ? providerLabel
                        ? `Reply ready (${providerLabel})`
                        : 'Reply ready'
                      : undefined,
              })
              currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
              currentThinkingProcess.steps = [...currentThinkingProcess.steps]
              if (status === 'running') currentThinkingProcess.summary = 'Generating reply'
              updateAssistantMessage(targetChatId, assistantMessageId, {
                thinkingProcess: { ...currentThinkingProcess },
              })
            }

            if (phaseName === 'quality_gate') {
              if (phaseStatus === 'started') setStreamStatus('quality')
              const qgId = 'lifecycle-quality-gate'
              const status =
                phaseStatus === 'started' ? 'running' : phaseStatus === 'failed' ? 'error' : 'done'
              const skipped = status === 'done' && /skipped/i.test(phaseDetailRaw)
              processItems = applyAgentActivity(processItems, {
                seq: processItems.length + 1,
                kind: 'node',
                id: qgId,
                status,
                title: skipped ? 'Quality check skipped' : 'Checking reply quality',
                detail:
                  status === 'error'
                    ? safeDetail || 'Quality check flagged issues'
                    : status === 'done'
                      ? safeDetail || (skipped ? 'Checker unavailable — reply shown ungated' : 'Reply quality verified')
                      : undefined,
              })
              currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
              currentThinkingProcess.steps = [...currentThinkingProcess.steps]
              if (status === 'running') currentThinkingProcess.summary = 'Checking reply quality'
              updateAssistantMessage(targetChatId, assistantMessageId, {
                thinkingProcess: { ...currentThinkingProcess },
              })
            }
            continue
          }

          if (parsed.type === 'node') {
            continue
          }

          if (parsed.type === 'mode') {
            setChats((prev) =>
              prev.map((chat) => (chat.id === targetChatId ? { ...chat, agentMode: parsed.mode } : chat))
            );
          }

          if (parsed.type === 'human') {
            streamedHumanTurn = { ...parsed.human, status: parsed.human.status || 'pending' }
            // Unlock composer immediately: interrupt means the turn is waiting on the user.
            // Remaining SSE (checkpoint/done) may still drain; Answer must not hide behind Stop.
            updateAssistantMessage(targetChatId, assistantMessageId, {
              humanTurn: streamedHumanTurn,
              isStreaming: false,
              isTypingDone: true,
            })
            if (streamEpochRef.current === streamEpoch) {
              setIsStreaming(false)
              setStreamStatus(null)
              // Unlock ends the pin hold — preserve scroll when shrinking spacer.
              clearMessagePinPreservingView()
            }
            humanRespondInFlightRef.current = false
            if (streamedHumanTurn.plan && streamedHumanTurn.plan.length) {
              setChats((prev) =>
                prev.map((chat) =>
                  chat.id === targetChatId ? { ...chat, activePlan: streamedHumanTurn!.plan } : chat
                )
              )
            }
          }

          if (parsed.type === 'checkpoint') {
            streamedCheckpoint = parsed.checkpoint
            updateAssistantMessage(targetChatId, assistantMessageId, {
              checkpoint: streamedCheckpoint,
            })
          }

          if (parsed.type === 'thinking_start') {
            currentThinkingProcess.durationSeconds = parsed.durationSeconds || 0;
            currentThinkingProcess.tokenCount = parsed.tokenCount || 0;
          }

          if (parsed.type === 'action') {
            const isDestructive = ['rewrite_notebook_document', 'replace_notebook_selection', 'insert_notebook_block', 'annotate_notebook', 'add_notebook_footnote'].includes(parsed.action.type);
            const applied = isDestructive ? false : executeOSAction(assistantMessageId, parsed.action, targetChatId);
            streamedAction = { ...parsed.action, executed: applied };
            if (!applied) {
              updateAssistantMessage(targetChatId, assistantMessageId, { osAction: streamedAction });
            }
          }

          if (parsed.type === 'artifacts') {
            for (const incoming of parsed.artifacts || []) {
              const next = toWorkspaceArtifact(incoming)
              const pendingByType =
                streamedArtifacts.find((item) => item.pending && item.type === next.type) ||
                streamedArtifacts.find((item) => item.pending)
              const pendingList = streamedArtifacts.filter((item) => item.pending)
              const pendingMatch = pendingByType || (pendingList.length === 1 ? pendingList[0] : undefined)
              const existing = [
                ...((activeChat?.messages || []).flatMap((message) => message.artifacts || [])),
                ...streamedArtifacts,
              ]
              const { activeArtifact: revised } = processArtifactRevision(
                existing,
                { ...next, toolCallId: pendingMatch?.toolCallId },
                { preferId: pendingMatch?.id }
              )
              streamedArtifacts = [
                { ...revised, pending: false, error: undefined, toolCallId: pendingMatch?.toolCallId || revised.toolCallId },
                ...streamedArtifacts.filter((item) => item.id !== revised.id && !(item.pending && item.id === pendingMatch?.id)),
              ]
              openArtifact({
                ...revised,
                pending: false,
                toolCallId: pendingMatch?.toolCallId || revised.toolCallId,
              })
            }
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: sanitizePublicAssistantText(accumulatedContent),
              artifacts: streamedArtifacts,
            });
          }

          if (parsed.type === 'thinking_step') {
            continue
          }

          if (parsed.type === 'error') {
            console.error('[workspace chat] backend error:', parsed.message);
            backendError = true;
            const errCode = (parsed as { code?: string }).code || '';
            const classifiedSse = classifyChatStreamError({
              code: errCode,
              message: String(parsed.message || ''),
            });
            streamErrorKind =
              classifiedSse.kind === 'abort' ? undefined : classifiedSse.kind;
            // Prefer scrubbed backend copy when present (pre-#772). Only fall back to
            // product-safe defaults so unknown SSE errors are not forced into a blank
            // generic "Connection" body after thinking has already started.
            const rawSseMessage = String(parsed.message || '').trim();
            const preferredSseCopy = rawSseMessage || classifiedSse.userMessage;
            const safeMessage =
              scrubSecretMaterial(preferredSseCopy) || classifiedSse.userMessage;
            const hasPublicReply = Boolean(accumulatedContent.trim());
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: hasPublicReply
                ? sanitizePublicAssistantText(accumulatedContent)
                : safeMessage,
              // Keep markdown bubble when tokens already streamed; InquiryStatusCard would wipe it.
              ...(hasPublicReply ? {} : { errorKind: streamErrorKind }),
            });
            continue;
          }

          if (parsed.type === 'token') {
            accumulatedContent += parsed.text;
            setStreamStatus((prev) => (prev === 'quality' ? prev : 'answering'))
            const now = Date.now();
            if (now - lastTokenFlushTime > 24 || accumulatedContent.length < 40) {
              lastTokenFlushTime = now;
              updateAssistantMessage(targetChatId, assistantMessageId, {
                content: visibleStreamingReply(sanitizePublicAssistantText(accumulatedContent)),
                thinkingProcess: { ...currentThinkingProcess },
              });
            }
          }

          if (parsed.type === 'token_usage' && parsed.snapshot) {
            updateCachedTokenQuota(parsed.snapshot as Parameters<typeof updateCachedTokenQuota>[0]);
          }

          if (parsed.type === 'done') {
            appendStreamedArtifacts(parsed.artifacts);
            accumulatedContent = parsed.fullText || accumulatedContent;
            const qgId = 'lifecycle-quality-gate'
            const gate = (parsed as { qualityGate?: Message['qualityGate'] }).qualityGate
            if (gate === 'passed' || gate === 'failed' || gate === 'skipped') {
              streamedQualityGate = gate
            }
            if (gate === 'failed') {
              // Keep failed status — never rewrite to success after a hard gate flag.
              processItems = applyAgentActivity(processItems, {
                seq: processItems.length + 1,
                kind: 'node',
                id: qgId,
                status: 'error',
                title: 'Checking reply quality',
                detail: 'Quality issues remain — reply shown with caveats',
              })
              currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
              currentThinkingProcess.steps = [...currentThinkingProcess.steps]
            } else if (parsed.corrected && gate === 'passed') {
              processItems = applyAgentActivity(processItems, {
                seq: processItems.length + 1,
                kind: 'node',
                id: qgId,
                status: 'done',
                title: 'Checking reply quality',
                detail: 'Reply revised for quality',
              })
              currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
              currentThinkingProcess.steps = [...currentThinkingProcess.steps]
            } else if (gate === 'skipped') {
              processItems = applyAgentActivity(processItems, {
                seq: processItems.length + 1,
                kind: 'node',
                id: qgId,
                status: 'done',
                title: 'Quality check skipped',
                detail: 'Checker unavailable — reply shown ungated',
              })
              currentThinkingProcess.steps = processItems.map(processItemToThinkingStep)
              currentThinkingProcess.steps = [...currentThinkingProcess.steps]
            }
            const publicProvider = toPublicProviderLabel(parsed.provider);
            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: visibleStreamingReply(sanitizePublicAssistantText(accumulatedContent)),
              artifacts: streamedArtifacts,
              citations: streamedCitations,
              thinkingProcess: { ...currentThinkingProcess },
              provider: publicProvider,
              // Soft flag only — never map qualityGate onto errorKind (keeps reply bubble).
              ...(streamedQualityGate ? { qualityGate: streamedQualityGate } : {}),
            });
            if (publicProvider) streamedProvider = publicProvider;
          }
        }
      }

      let finalCleanContent = sanitizePublicAssistantText(accumulatedContent);
      if (!finalCleanContent && !backendError && streamedArtifacts.length === 0 && !streamedHumanTurn) {
        throw new Error('AI returned no content');
      }

      let extractedArtifacts: Artifact[] = [];
      let visibleMessageText = finalCleanContent;
      try {
        const turn = finalizeArtifactTurn(promptText, finalCleanContent, streamedArtifacts, { scrape: false })
        const rawArtifacts = dedupeArtifacts([...streamedArtifacts, ...turn.artifacts]);
        if (rawArtifacts.length > 0) {
          const existingChatArtifacts = activeChat?.messages.flatMap((m) => m.artifacts || []) || [];
          let prepareSandpackSource: ((source: string) => string) | null = null
          for (const rawArt of rawArtifacts) {
            const { activeArtifact: revisedArt } = processArtifactRevision(existingChatArtifacts, rawArt, {
              preferId: activeArtifact?.id,
            });
            if (revisedArt.type === 'react') {
              if (!prepareSandpackSource) {
                prepareSandpackSource = (await import('./sandbox/reactPreview')).prepareSandpackSource
              }
              extractedArtifacts.push({ ...revisedArt, content: prepareSandpackSource(revisedArt.content) })
            } else {
              extractedArtifacts.push(revisedArt)
            }
          }
        }
        visibleMessageText = turn.visibleText || finalCleanContent
      } catch (artifactError) {
        console.error('[workspace chat] artifact extract failed', artifactError)
      }

      // SSE error event already painted the bubble — still record fail telemetry (kind accurate).
      if (backendError && streamErrorKind) {
        try {
          posthog?.capture?.(
            'wim chat stream fail',
            chatStreamErrorTelemetryProps({
              kind: streamErrorKind,
              hadPublicText: Boolean(accumulatedContent.trim()),
              hadStreamProgress: hadMeaningfulStreamProgress || streamChunkCount > 0,
              durationMs: Date.now() - streamStartedAt,
              chunkCount: streamChunkCount,
              byteLength: streamByteLength,
              agentMode: turnAgentMode,
              retried: networkRetryUsed,
            })
          );
        } catch {
          /* telemetry must never break chat */
        }
      }

      // If we had a backend error, do not overwrite the assistant message again with empty content!
      if (!backendError) {
        currentThinkingProcess.durationSeconds = Math.max(
          currentThinkingProcess.durationSeconds,
          (Date.now() - thinkStartedAt) / 1000
        );
        currentThinkingProcess.steps = currentThinkingProcess.steps.map((step: any) =>
          step.kind === 'reasoning' || (typeof step.id === 'string' && step.id.startsWith('stream-think'))
            ? { ...step, completed: true, status: 'done' }
            : step.kind === 'node' && step.status === 'running'
            ? { ...step, completed: true, status: 'done' }
            : step
        )
        currentThinkingProcess.steps = [...currentThinkingProcess.steps]
        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: visibleMessageText || finalCleanContent || (streamedHumanTurn ? '' : 'Response ready.'),
          thinkingProcess: { ...currentThinkingProcess },
          toolTrace: streamedToolTrace.length > 0 ? streamedToolTrace : undefined,
          artifacts: extractedArtifacts.length > 0 ? extractedArtifacts : undefined,
          isStreaming: false,
          isTypingDone: true,
          osAction: streamedAction,
          provider: streamedProvider,
          ...(streamedHumanTurn ? { humanTurn: streamedHumanTurn } : {}),
          ...(streamedCheckpoint ? { checkpoint: streamedCheckpoint } : {}),
          ...(streamedQualityGate ? { qualityGate: streamedQualityGate } : {}),
        });
      }

      isStreamComplete = true; // successfully reached the end!
    } catch (err: any) {
      if (isAbortError(err)) {
        const stoppedText = visibleStreamingReply(sanitizePublicAssistantText(accumulatedContent))
        const resumeAbort = resumeAbortRef.current
        resumeAbortRef.current = false
        if (stalledByWatchdog && !resumeAbort) {
          updateAssistantMessage(targetChatId, assistantMessageId, {
            content: stoppedText.trim()
              ? stoppedText
              : 'Taking too long — the stream stalled before an answer arrived. Please try again.',
            thinkingProcess: { ...currentThinkingProcess },
            toolTrace: streamedToolTrace.length > 0 ? streamedToolTrace : undefined,
            isStreaming: false,
            isTypingDone: true,
            ...(stoppedText.trim() ? {} : { errorKind: 'timeout' }),
            ...(streamedHumanTurn ? { humanTurn: streamedHumanTurn } : {}),
            ...(streamedCheckpoint ? { checkpoint: streamedCheckpoint } : {}),
          })
        } else {
        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: stoppedText,
          thinkingProcess: { ...currentThinkingProcess },
          toolTrace: streamedToolTrace.length > 0 ? streamedToolTrace : undefined,
          isStreaming: false,
          isTypingDone: true,
          stopped: !resumeAbort && !streamedHumanTurn,
          ...(resumeAbort
            ? {}
            : {
                ...(streamedHumanTurn ? { humanTurn: streamedHumanTurn } : {}),
                ...(streamedCheckpoint ? { checkpoint: streamedCheckpoint } : {}),
              }),
        })
        }
      } else if (!isStreamComplete) {
        console.error('[ClaudeWorkspaceChat] Error during streaming:', err);

        const displayContent = visibleStreamingReply(sanitizePublicAssistantText(accumulatedContent));
        const scrubbedError = scrubSecretMaterial(String(err?.message || '')).replace(/\s+/g, ' ').trim();
        const httpStatus =
          typeof (err as { httpStatus?: unknown })?.httpStatus === 'number'
            ? (err as { httpStatus: number }).httpStatus
            : undefined;
        const errCode =
          typeof (err as { code?: unknown })?.code === 'string'
            ? (err as { code: string }).code
            : undefined;
        const classified = classifyChatStreamError({
          err,
          httpStatus,
          code: errCode,
          message: scrubbedError,
        });
        const stampedKind = (err as { kind?: Message['errorKind'] })?.kind;
        const errKind = (stampedKind ||
          streamErrorKind ||
          (classified.kind !== 'abort' ? classified.kind : undefined)) as
          | Message['errorKind']
          | undefined;
        // Prefer product-safe inquiry copy over raw fetch/network dumps; keep no-content special-case.
        const productSafeFallback = errKind
          ? userFacingChatStreamMessage(errKind, { message: scrubbedError })
          : classified.userMessage;
        const errorMessage = displayContent
          ? displayContent
          : scrubbedError === 'AI returned no content'
            ? 'The model finished thinking but did not produce a public answer. Please try again.'
            : scrubbedError.startsWith('[app]')
              ? scrubbedError.slice(0, 220)
              : productSafeFallback;

        // Pending ask_user / plan_approval already unlocked — do not replace with Connection card.
        const preserveHumanInterrupt = streamedHumanTurn?.status === 'pending';
        const failPatch: Partial<Message> = {
          thinkingProcess: { ...currentThinkingProcess },
          isStreaming: false,
          isTypingDone: true,
          ...(streamedHumanTurn ? { humanTurn: streamedHumanTurn } : {}),
          ...(streamedCheckpoint ? { checkpoint: streamedCheckpoint } : {}),
        };
        if (displayContent.trim()) {
          failPatch.content = displayContent;
        } else if (!preserveHumanInterrupt) {
          failPatch.content = errorMessage;
          if (errKind) failPatch.errorKind = errKind;
        }
        updateAssistantMessage(targetChatId, assistantMessageId, failPatch);

        // Best-effort PostHog — never block UX; no prompt/email/message body.
        try {
          const telemetryKind =
            errKind || (classified.kind !== 'abort' ? classified.kind : 'provider');
          posthog?.capture?.(
            'wim chat stream fail',
            chatStreamErrorTelemetryProps({
              kind: telemetryKind,
              httpStatus,
              hadPublicText: Boolean(displayContent.trim()),
              hadStreamProgress: hadMeaningfulStreamProgress || streamChunkCount > 0,
              durationMs: Date.now() - streamStartedAt,
              chunkCount: streamChunkCount,
              byteLength: streamByteLength,
              agentMode: turnAgentMode,
              retried: networkRetryUsed,
            })
          );
        } catch {
          /* telemetry must never break chat */
        }
      }
    } finally {
      if (stallTimer) {
        clearInterval(stallTimer);
        stallTimer = null;
      }
      // Always queue a remote persist for this chat's settled rows.
      persistChatIdRef.current = targetChatId;
      // Only the latest turn may clear shared streaming UI / AbortController refs.
      if (abortControllerRef.current === activeController) {
        abortControllerRef.current = null;
      }
      if (streamEpochRef.current === streamEpoch) {
        setIsStreaming(false);
        setStreamStatus(null);
        streamReaderRef.current = null;
        // Clear pin (no idle RO re-pin) but keep min spacer so settle does not
        // clamp scrollTop into older history (short-reply post-#794 yank).
        clearMessagePinPreservingView();
      }
    }
  };

  // Helper to update specific assistant message in chat
  const updateAssistantMessage = (chatId: string, msgId: string, patch: Partial<Message>) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== msgId) return m
              const next: Message = { ...m, ...patch }
              // Late stream flush must not revive a settled ask_user / plan_approval as pending
              if ('humanTurn' in patch) {
                next.humanTurn = resolveHumanTurn(m.humanTurn, patch.humanTurn)
              }
              return next
            }),
          };
        }
        return c;
      })
    );
  };

  const handleStopStreaming = () => {
    abortActiveStream()
    setIsStreaming(false)
    setStreamStatus(null)
    // Release pin; keep min spacer so Stop does not yank into older history.
    clearMessagePinPreservingView()
    const chatId = activeChat?.id
    const last = activeChat?.messages.at(-1)
    if (chatId && last?.role === 'assistant' && last.isStreaming) {
      updateAssistantMessage(chatId, last.id, {
        isStreaming: false,
        isTypingDone: true,
        stopped: true,
      })
    }
    // Stop used to skip remote persist (only stream finally set the ref) — mark for save.
    if (chatId) persistChatIdRef.current = chatId
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

    const isNotebookAction = [
      'create_notebook',
      'insert_notebook_block',
      'rewrite_notebook_document',
      'replace_notebook_selection',
      'update_notebook_title',
      'annotate_notebook',
      'add_notebook_footnote',
    ].includes(action.type);

    let handleAck: ((e: Event) => void) | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const failClosedNotebookMount = () => {
      if (handleAck) window.removeEventListener('wimNotebookAck', handleAck)
      if (timeout) clearTimeout(timeout)
      updateAssistantMessage(chatId, msgId, { osAction: { ...action, executed: false } })
      executedActionsRef.current.delete(key)
    }

    if (isNotebookAction) {
      handleAck = (e: Event) => {
        const customEvent = e as CustomEvent<{ notebookId?: string; ok?: boolean; error?: string }>;
        const targetId =
          action.type === 'create_notebook'
            ? customEvent.detail?.notebookId
            : action.payload.notebookId || notebookBind?.notebookId;

        // If it's create_notebook, we grab the new ID from the ack if possible, or just accept the ack.
        // For others, we only ack if the ID matches or if we didn't specify one.
        if (!targetId || !customEvent.detail?.notebookId || customEvent.detail.notebookId === targetId) {
          if (customEvent.detail?.ok === false) {
            updateAssistantMessage(chatId, msgId, { osAction: { ...action, executed: false } });
            executedActionsRef.current.delete(key);
          } else {
            updateAssistantMessage(chatId, msgId, { osAction: { ...action, executed: true } });
          }
          if (handleAck) window.removeEventListener('wimNotebookAck', handleAck);
          if (timeout) clearTimeout(timeout);
        }
      };
      window.addEventListener('wimNotebookAck', handleAck);
      timeout = setTimeout(() => {
        if (handleAck) window.removeEventListener('wimNotebookAck', handleAck);
        // Fail the card after a reasonable wait
        updateAssistantMessage(chatId, msgId, { osAction: { ...action, executed: false } });
        executedActionsRef.current.delete(key);
      }, 5000);
    }

    try {
      if (action.type === 'create_notebook') {
        const nb = createNotebook(action.payload.title || 'AI Generated Notes', action.payload.content || '');
        if (app?.addWindow) app.addWindow({ path: notebookWindowPath(nb.id) });
        // Manually fire the ack since createNotebook doesn't via the event listener paths in App.tsx
        window.dispatchEvent(new CustomEvent('wimNotebookAck', { detail: { notebookId: nb.id } }));
      } else if (action.type === 'insert_notebook_block') {
        void Promise.resolve(insertIntoNotebook(action.payload.content || '', action.payload.notebookId)).then((ok) => {
          if (ok === false) failClosedNotebookMount();
        });
      } else if (action.type === 'rewrite_notebook_document') {
        const nbId = action.payload.notebookId || notebookBind?.notebookId;
        const notebookPath = nbId ? notebookWindowPath(nbId) : '/notebooks';
        void dispatchNotebookOsEvent(
          'wimNotebookInsertText',
          {
            text: action.payload.content || '',
            mode: 'replace',
            notebookId: nbId,
          },
          {
            notebookId: nbId,
            path: notebookPath,
            open: () => {
              if (app?.addWindow) app.addWindow({ path: notebookPath });
            },
          }
        ).then((ok) => {
          if (!ok) failClosedNotebookMount();
        });
      } else if (action.type === 'replace_notebook_selection') {
        const nbId = action.payload.notebookId || notebookBind?.notebookId;
        const notebookPath = nbId ? notebookWindowPath(nbId) : '/notebooks';
        void dispatchNotebookOsEvent(
          'wimNotebookReplaceSelection',
          {
            text: action.payload.content || '',
            spanText: action.payload.span_text || '',
            notebookId: nbId,
          },
          {
            notebookId: nbId,
            path: notebookPath,
            open: () => {
              if (app?.addWindow) app.addWindow({ path: notebookPath });
            },
          }
        ).then((ok) => {
          if (!ok) failClosedNotebookMount();
        });
      } else if (action.type === 'update_notebook_title') {
        const nbId = action.payload.notebookId || notebookBind?.notebookId;
        const notebookPath = nbId ? notebookWindowPath(nbId) : '/notebooks';
        void dispatchNotebookOsEvent(
          'wimNotebookSetTitle',
          {
            title: action.payload.title || '',
            notebookId: nbId,
          },
          {
            notebookId: nbId,
            path: notebookPath,
            open: () => {
              if (app?.addWindow) app.addWindow({ path: notebookPath });
            },
          }
        ).then((ok) => {
          if (!ok) failClosedNotebookMount();
        });
      } else if (action.type === 'create_forum_topic' || action.type === 'publish_to_forum') {
        const detail = {
          title: action.payload.title || '',
          content: action.payload.content || '',
          category: action.payload.category || 'discussion',
        };
        writeForumDraft(detail);
        window.dispatchEvent(
          new CustomEvent('wimForumCreateTopicDraft', {
            detail,
          })
        );
        if (app?.addWindow) app.addWindow({ path: '/community/new' });
      } else if (action.type === 'manage_windows') {
        const act = action.payload.action || 'tile';
        if ((act === 'tile' || act === 'split') && action.payload.left_path && action.payload.right_path) {
          if (app?.addWindow) {
            app.addWindow({ path: action.payload.left_path, snapped: 'left' });
            app.addWindow({ path: action.payload.right_path, snapped: 'right' });
          }
        } else if (act === 'snap_left' && action.payload.path && app?.addWindow) {
          app.addWindow({ path: action.payload.path, snapped: 'left' });
        } else if (act === 'snap_right' && action.payload.path && app?.addWindow) {
          app.addWindow({ path: action.payload.path, snapped: 'right' });
        } else if (act === 'close' && action.payload.path && app?.closeWindow) {
          const target = findMatchingWindow(appWindows, action.payload.path, windowPathMatches);
          if (target) app.closeWindow(target);
        } else if (act === 'minimize' && action.payload.path && app?.updateWindow) {
          const target = findMatchingWindow(appWindows, action.payload.path, windowPathMatches);
          if (target) app.updateWindow(target, { minimized: true });
        } else if (act === 'focus' && action.payload.path) {
          const target = findMatchingWindow(appWindows, action.payload.path, windowPathMatches);
          if (target && app?.bringToFront) {
            if (target.minimized && app?.updateWindow) {
              app.updateWindow(target, { minimized: false });
            }
            app.bringToFront(target);
          } else if (app?.addWindow) {
            app.addWindow({ path: action.payload.path });
          }
        } else if (act === 'close_all' && app?.closeWindow) {
          appWindows.forEach((w) => app.closeWindow(w));
        } else if (action.payload.path && app?.addWindow) {
          app.addWindow({ path: action.payload.path });
        }
      } else if (action.type === 'set_system_appearance') {
        if (action.payload.theme && typeof window !== 'undefined') {
          if ((window as any).__setPreferredTheme) {
            (window as any).__setPreferredTheme(action.payload.theme);
          }
          window.dispatchEvent(
            new CustomEvent('wimThemeChanged', { detail: { theme: action.payload.theme } })
          );
        }
        if (action.payload.wallpaper && (app as any)?.updateSiteSettings) {
          (app as any).updateSiteSettings({ wallpaper: action.payload.wallpaper });
        }
        if (typeof action.payload.reduce_transparency === 'boolean' && (app as any)?.updateSiteSettings) {
          (app as any).updateSiteSettings({ reduceTransparency: action.payload.reduce_transparency });
        }
      } else if (action.type === 'annotate_notebook') {
        const nbId = action.payload.notebookId || notebookBind?.notebookId;
        const notebookPath = nbId ? notebookWindowPath(nbId) : '/notebooks';
        void dispatchNotebookOsEvent(
          'wimNotebookAddAnnotation',
          {
            notebookId: nbId,
            spanText: action.payload.span_text || '',
            note: action.payload.note || '',
          },
          {
            notebookId: nbId,
            path: notebookPath,
            open: () => {
              if (app?.addWindow) app.addWindow({ path: notebookPath });
            },
          }
        ).then((ok) => {
          if (!ok) failClosedNotebookMount();
        });
      } else if (action.type === 'add_notebook_footnote') {
        const nbId = action.payload.notebookId || notebookBind?.notebookId;
        const notebookPath = nbId ? notebookWindowPath(nbId) : '/notebooks';
        void dispatchNotebookOsEvent(
          'wimNotebookAddFootnote',
          {
            notebookId: nbId,
            marker: action.payload.marker,
            text: action.payload.text || action.payload.content || '',
            spanText: action.payload.span_text,
          },
          {
            notebookId: nbId,
            path: notebookPath,
            open: () => {
              if (app?.addWindow) app.addWindow({ path: notebookPath });
            },
          }
        ).then((ok) => {
          if (!ok) failClosedNotebookMount();
        });
      } else if (action.type === 'open_window') {
        if (app?.addWindow && action.payload.path) app.addWindow({ path: action.payload.path });
      }

      if (!isNotebookAction) {
        updateAssistantMessage(chatId, msgId, {
          osAction: { ...action, executed: true },
        });
      }
      return true;
    } catch (e) {
      executedActionsRef.current.delete(key);
      console.warn('[Ask AI] Action execution error:', e);
      return false;
    }
  };

  const handleHumanRespond = (messageId: string, action: 'run' | 'revise' | 'answer', payload?: string) => {
    if (humanRespondInFlightRef.current) return
    if (isStreaming) {
      resumeAbortRef.current = true
      abortActiveStream()
      setIsStreaming(false)
      setStreamStatus(null)
    }
    const chat = chats.find((item) => item.id === (activeChatId || '')) || activeChat
    if (!chat) return
    const message =
      chat.messages.find((item) => item.id === messageId && item.humanTurn?.status === 'pending') ||
      [...chat.messages].reverse().find((item) => item.humanTurn?.status === 'pending')
    if (!message?.humanTurn || message.humanTurn.status !== 'pending') return
    const trimmed = (payload || '').trim()
    // ask_user: never continue on empty/whitespace — old path fell back to "Yes"
    if (action === 'answer' && !trimmed) return
    humanRespondInFlightRef.current = true
    const nextStatus = action === 'run' ? 'approved' : action === 'answer' ? 'answered' : 'revised'
    updateAssistantMessage(chat.id, message.id, {
      humanTurn: {
        ...message.humanTurn,
        status: nextStatus,
        ...(action === 'answer' ? { answer: trimmed.slice(0, 2000) } : {}),
        ...(action === 'revise' && trimmed ? { revisionNote: trimmed.slice(0, 800) } : {}),
      },
    })
    const nextMode = action === 'run' ? 'execute' : action === 'revise' ? 'plan' : (chat.agentMode || 'ask')
    setChats((prev) => prev.map((row) => (row.id === chat.id ? { ...row, agentMode: nextMode } : row)))
    // inFlight stays true until handleSendMessage starts (or a new human interrupt arrives)
    if (message.checkpoint) {
      void handleSendMessage('', [], {
        skipUserAppend: true,
        continueMessageId: message.id,
        agentMode: nextMode,
        resume: message.checkpoint,
        resumeAction: action,
        resumePayload: action === 'answer' ? trimmed : payload,
      })
      return
    }
    if (action === 'run') {
      void handleSendMessage('Run the plan.', [], { agentMode: 'execute', skipUserAppend: false })
      return
    }
    if (action === 'answer') {
      void handleSendMessage(trimmed, [], { agentMode: chat.agentMode || 'ask' })
      return
    }
    void handleSendMessage(trimmed ? `Revise the plan: ${trimmed}` : 'Revise the plan.', [], { agentMode: 'plan' })
  }

  const handleDeleteChat = (id: string) => {
    rememberDeletedChatId(id)
    if (persistChatIdRef.current === id) persistChatIdRef.current = null
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id)
      writeLocalChats(next)
      if (activeChatId === id) {
        pinBottomOnNextChatRef.current = true
        setActiveChatId(next[0]?.id || '')
      }
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

  const handleAgentModeChange = useCallback((mode: AgentMode) => {
    if (!activeChatId) return;
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, agentMode: mode, updatedAt: new Date().toISOString() } : c)));
  }, [activeChatId]);

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
    pinBottomOnNextChatRef.current = true;
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
      if (meta && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        handleNewChat()
        return
      }
      if (meta && event.key === '.' && isStreaming) {
        event.preventDefault()
        handleStopStreaming()
        return
      }
      if (meta && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        document.querySelector<HTMLTextAreaElement>('textarea[data-composer]')?.focus()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSourcesOpen, isArtifactsOpen, searchModalOpen, isStreaming, handleNewChat])

  return (
    <LemonScope fill>
    <div className="relative flex h-full min-h-0 w-full min-w-0 text-primary font-sans overflow-hidden antialiased">
      {/* Left Collapsible Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          if (id !== activeChatId && isStreamingRef.current) {
            abortActiveStream()
            setIsStreaming(false)
            setStreamStatus(null)
            pinnedMessageIdRef.current = null
            setPinSpacerHeight(0)
          }
          if (id !== activeChatId) {
            pinBottomOnNextChatRef.current = true
            pinnedMessageIdRef.current = null
            setPinSpacerHeight(0)
          }
          setActiveChatId(id)
          setComposerDraftNonce((n) => n + 1)
        }}
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
        className="relative flex min-h-0 min-w-0 flex-1 flex-col text-primary"
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
          onOpenScratchpad={() => app.addWindow({ path: '/scratchpad', title: 'Scratchpad' })}
        />

        {/* Chat Stream & Conversation Body */}
        <main
          ref={chatScrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-primary pt-9 [touch-action:pan-y] [overflow-anchor:none] [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_bottom,transparent_0,black_2.25rem)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_2.25rem)]"
        >
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="flex min-h-full w-full max-w-3xl mx-auto flex-col items-center justify-center p-4 sm:p-6 pb-36 select-none">
              <h1 className="m-0 text-center text-[22px] sm:text-[24px] font-medium tracking-tight text-primary">
                How can I help?
              </h1>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {ASK_STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    title={starter.preview}
                    onClick={() => {
                      const mutating = 'mutating' in starter && starter.mutating
                      if (mutating && (activeChat?.agentMode || 'ask') === 'plan') {
                        setLockShakeNonce((n) => n + 1)
                      }
                      setComposerDraft(starter.prompt)
                      setComposerDraftNonce((n) => n + 1)
                    }}
                    className="group/starter relative rounded-full border border-primary/50 bg-primary/80 px-3 py-1 text-[12.5px] text-primary hover:bg-accent cursor-pointer"
                  >
                    {starter.label === 'Write to notebook' && notebookBind?.title
                      ? `Write to ${notebookBind.title}`
                      : starter.label}
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 hidden w-max max-w-[220px] -translate-x-1/2 rounded border border-primary bg-primary px-2 py-1 text-[11px] leading-snug text-secondary shadow-sm group-hover/starter:block">
                      {starter.preview}
                    </span>
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
                  livePhase={msg.isStreaming ? streamStatus : null}
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
                  onHumanRespond={handleHumanRespond}
                  onAddToNotebook={(message) => insertIntoNotebook(messageToNotebookMarkdown(message))}
                  onOpenByok={() => setSidebarOpen(true)}
                  typewriterSpeed={settings.typewriterSpeed}
                  onStop={handleStopStreaming}
                  onContinue={
                    (activeChat?.agentMode || 'ask') === 'execute' &&
                    (activeChat.activePlan || []).some(
                      (item) => item.status === 'in_progress' || item.status === 'pending'
                    )
                      ? undefined
                      : () => {
                          void handleSendMessage('Continue.', [])
                        }
                  }
                />
              ))}
              <div
                ref={pinSpacerRef}
                aria-hidden
                className="pointer-events-none w-full shrink-0"
                style={{ height: pinSpacerHeight }}
              />
              <div ref={chatBottomRef} className="h-px w-full" />
            </div>
          )}
        </main>

        {/* Floating Input Dock with smooth fade allowing messages to flow underneath */}
        <div
          data-writing-dock
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-primary via-primary/85 to-transparent pt-10 pb-1 [padding-bottom:calc(0.2rem+var(--keyboard-inset,0px)+env(safe-area-inset-bottom,0px))] will-change-[padding-bottom]"
        >
          <div className="pointer-events-auto mx-auto w-full max-w-3xl px-3 sm:px-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              isStreaming={isStreaming}
              selectedStylePreset={selectedStylePreset}
              onChangeStylePreset={setSelectedStylePreset}
              pendingHumanTurn={
                [...(activeChat?.messages || [])].reverse().find((item) => item.humanTurn?.status === 'pending')
                  ?.humanTurn
              }
              onHumanRespond={(action, payload) => {
                const pending = [...(activeChat?.messages || [])]
                  .reverse()
                  .find((item) => item.humanTurn?.status === 'pending')
                if (pending) handleHumanRespond(pending.id, action, payload)
              }}
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={handleSelectModel}
              draftPrompt={composerDraft}
              draftNonce={composerDraftNonce}
              incomingAttachments={incomingAttachments}
              boundNotebookTitle={activeNotebookInfo?.title}
              agentMode={activeChat?.agentMode || 'ask'}
              onAgentModeChange={handleAgentModeChange}
              lockShakeNonce={lockShakeNonce}
              nextSectionTitle={
                !isStreaming &&
                ((activeChat?.agentMode || 'ask') === 'execute' || (activeChat?.agentMode || 'ask') === 'plan') &&
                activeChat?.messages.at(-1)?.role === 'assistant' &&
                activeChat.messages.at(-1)?.isTypingDone &&
                !(activeChat?.messages || []).some((item) => item.humanTurn?.status === 'pending')
                  ? (activeChat.activePlan || []).find((item) => item.status === 'in_progress')?.title ||
                    (activeChat.activePlan || []).find((item) => item.status === 'pending')?.title
                  : undefined
              }
              nextSectionLabel={(activeChat?.agentMode || 'ask') === 'plan' ? 'Next step' : 'Next section'}
              onNextSection={() => {
                const step =
                  (activeChat?.activePlan || []).find((item) => item.status === 'in_progress') ||
                  (activeChat?.activePlan || []).find((item) => item.status === 'pending')
                if (!step) return
                const mode = (activeChat?.agentMode || 'ask') === 'plan' ? 'plan' : 'execute'
                const prompt =
                  mode === 'plan'
                    ? `Continue with the next plan step: "${step.title}". Do only that step. Do not ask me for next steps. When it is done, stop so I can continue.`
                    : `Continue with the next plan step: "${step.title}". Write that section into the notebook. Do not skip ahead.`
                void handleSendMessage(prompt, [], { agentMode: mode })
              }}

              onDismissNotebookContext={() => {
                if (activeNotebookInfo?.id) {
                  setDismissedNotebookId(activeNotebookInfo.id);
                }
                setNotebookBind(null);
              }}
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
        onSelectChat={(id) => {
          if (id !== activeChatId) pinBottomOnNextChatRef.current = true
          setActiveChatId(id)
        }}
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
    </LemonScope>
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