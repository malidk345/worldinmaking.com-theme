import React, { useState, useEffect, useRef } from 'react';
import {
  Chat,
  Message,
  ModelId,
  ModelOption,
  ProjectSpace,
  ThinkingBudget,
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
import type { OSActionCard as OSActionCardType } from './types';
import { dedupeArtifacts, extractArtifactsFromContent } from './utils/extractArtifacts';
import { processArtifactRevision } from './utils/toolCalling';
import { parseAiSseEvent, type AiArtifact } from 'lib/ai/contracts';
import { parseChartSpec, stripChartArtifactMarkup } from 'lib/ai/chart-artifacts';
import { stripThinkingBlocks } from 'lib/bots/thinking-tags';
import {
  chatAuthHeaders,
  deleteChatOnRemote,
  mergeChats,
  pullChatsFromRemote,
  pushChatToRemote,
  setRemoteChatShare,
  setRemoteMessageLiked,
} from '../../lib/chat-remote';

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

export default function App({ onClose }: { onClose?: () => void }) {
  // Persistence state
  const [chats, setChats] = useState<Chat[]>(() => {
    const stored = readStored<unknown>(CHAT_STORAGE_KEYS, INITIAL_CHATS);
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

  // Extract full active notebook text content from open notebook windows
  const activeNotebookContext = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const notebookWindows = appWindows.filter(w => w.path?.startsWith('/notebooks'));
    if (notebookWindows.length === 0) return '';
    const top = notebookWindows.reduce((prev, cur) =>
      (cur.zIndex ?? 0) > (prev.zIndex ?? 0) ? cur : prev
    );
    const idMatch = top.path.match(/[?&]id=([^&]+)/) || top.path.match(/\/notebooks\/([^?#]+)/);
    const notebookId = idMatch?.[1] || '';
    if (notebookId) {
      const nb = getNotebook(notebookId);
      if (nb?.content) {
        return nb.content.slice(0, 8000);
      }
    }
    return '';
  }, [appWindows]);

  const activeNotebookMeta = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const notebookWindows = appWindows.filter(w => w.path?.startsWith('/notebooks'));
    if (notebookWindows.length === 0) return null;
    const top = notebookWindows.reduce((prev, cur) =>
      (cur.zIndex ?? 0) > (prev.zIndex ?? 0) ? cur : prev
    );
    // Extract id from /notebooks?id=xxx or hash #/notebook/xxx
    const idMatch = top.path.match(/[?&]id=([^&]+)/) || top.path.match(/\/notebooks\/([^?#]+)/);
    const notebookId = idMatch?.[1] || '';
    if (notebookId) {
      const nb = getNotebook(notebookId);
      if (nb?.title) return { title: nb.title, path: top.path };
    }
    // Fallback to window title (App.tsx sets it as the notebook title)
    if (top.title && top.title !== 'Notebooks' && top.title !== 'Notebook') {
      return { title: top.title, path: top.path };
    }
    return { title: 'Notebook', path: top.path };
  }, [appWindows]);


  // Active chat state
  const [models, setModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0]?.id || '');
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(settings.defaultModel);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const [thinkingBudget, setThinkingBudget] = useState<ThinkingBudget>(settings.defaultThinkingBudget);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePresetId>('default');




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

  const openArtifact = (art: Artifact, opts?: { expand?: boolean; keepSize?: boolean; origin?: DOMRect | null }) => {
    closeSources()
    setActiveArtifact(art)
    setIsArtifactsOpen(true)
    if (opts?.origin || !artifactOrigin) {
      setArtifactOrigin(captureOrigin(opts?.origin))
    }
    if (opts?.keepSize) {
      if (!isArtifactsOpen) setIsArtifactExpanded(false)
      return
    }
    if (opts?.expand) setIsArtifactExpanded(true)
    else setIsArtifactExpanded(false)
  }

  const closeArtifacts = () => {
    setIsArtifactsOpen(false)
    setIsArtifactExpanded(false)
  }

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLElement>(null);
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

  // Save to LocalStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('claude_workspace_chats_v7', JSON.stringify(chats));
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
    pullChatsFromRemote().then((remote) => {
      if (cancelled || !remote) return
      setChats((prev) => {
        const merged = mergeChats(prev, remote)
        if (merged.length > 0 && !merged.some((chat) => chat.id === activeChatId)) {
          setActiveChatId(merged[0].id)
        }
        return merged
      })
    })
    return () => {
      cancelled = true
    }
    // Hydrate once on mount; later edits persist incrementally.
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


  const updateAwayFromBottom = () => {
    const scroller = chatScrollRef.current
    if (!scroller) {
      setIsAwayFromBottom(false)
      return
    }
    const gap = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
    setIsAwayFromBottom(gap > 96)
  }

  const scrollChatToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const scroller = chatScrollRef.current
    if (!scroller) return
    if (behavior === 'auto') {
      scroller.scrollTop = scroller.scrollHeight
    } else {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    }
    setIsAwayFromBottom(false)
  }

  const scrollToBottom = () => {
    scrollChatToBottom('smooth')
  }

  useEffect(() => {
    const scroller = chatScrollRef.current
    if (!scroller) return
    updateAwayFromBottom()
    scroller.addEventListener('scroll', updateAwayFromBottom, { passive: true })
    const observer = new ResizeObserver(updateAwayFromBottom)
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    return () => {
      scroller.removeEventListener('scroll', updateAwayFromBottom)
      observer.disconnect()
    }
  }, [activeChatId, activeChat?.messages.length, isStreaming])

  // Auto scroll & auto open artifact
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
      title: 'New chat',
      projectId: projId || activeProjectId,
      modelId: selectedModelId,
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thinkingBudget,
      webSearchEnabled,
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
        projectId: activeProjectId,
        modelId: selectedModelId,
        starred: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thinkingBudget,
        webSearchEnabled,
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
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      attachments,
    };

    const assistantMessageId = `m-ast-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
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
      const latest = streamedArtifacts[streamedArtifacts.length - 1]
      if (latest) {
        openArtifact(latest, { keepSize: true })
      }
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
        .slice(-10)
        .map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content.slice(0, 4000),
        }))
        .filter((message) => message.content.trim().length > 0)

      const sseRes = await fetch('/api/chat', {
        method: 'POST',
        headers: chatAuthHeaders(true),
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: effectivePrompt,
          modelId: selectedModelId,
          thinkingBudget,
          webSearchEnabled,
          systemPrompt: activeProjectObj?.systemPrompt || '',
          styleSuffix: selectedStyle?.promptSuffix || '',
          attachmentContext,
          messages: conversationHistory,
          notebookContext: activeNotebookContext,
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

          if (parsed.type === 'phase') {
            const phaseLabels: Record<string, string> = {
              context: 'Context',
              generation: 'Generation',
              quality_gate: 'Quality check',
              persistence: 'Memory sync',
            };
            const phaseStep = {
              id: `phase-${parsed.phase.phase}`,
              stepNumber: currentThinkingProcess.steps.length + 1,
              title: phaseLabels[parsed.phase.phase] || parsed.phase.phase,
              detail: parsed.phase.detail || `${parsed.phase.phase} ${parsed.phase.status}`,
              completed: parsed.phase.status !== 'started',
              source: 'system_event' as const,
            };
            const existingIdx = currentThinkingProcess.steps.findIndex((step: any) => step.id === phaseStep.id);
            if (existingIdx >= 0) currentThinkingProcess.steps[existingIdx] = phaseStep;
            else currentThinkingProcess.steps.push(phaseStep);
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
      } else if (lowerText.includes('open admin') || lowerText.includes('dashboard')) {
        detectedAction = {
          type: 'open_window',
          title: 'Open Admin OS Dashboard',
          description: 'Navigate to system moderation dashboard',
          payload: { path: '/admin' },
        };
      }

      // Extract Artifacts & Process Version Revisions (v1, v2, v3)
      const rawArtifacts = dedupeArtifacts([
        ...streamedArtifacts,
        ...extractArtifactsFromContent(finalCleanContent, promptText),
      ]);
      let extractedArtifacts: Artifact[] = [];

      if (rawArtifacts.length > 0) {
        const existingChatArtifacts = activeChat?.messages.flatMap((m) => m.artifacts || []) || [];
        for (const rawArt of rawArtifacts) {
          const { activeArtifact: revisedArt } = processArtifactRevision(existingChatArtifacts, rawArt);
          extractedArtifacts.push(revisedArt);
        }
      }

      // Clean chat message text — strip ALL artifact content so it doesn't duplicate inside the chat bubble.
      // This handles both <antArtifact>...</antArtifact> XML tags AND markdown code blocks (```html, ```react, etc.)
      // that were successfully extracted into Artifact objects by extractArtifactsFromContent.
      let visibleMessageText = finalCleanContent;
      if (extractedArtifacts.length > 0) {
        visibleMessageText = visibleMessageText
          // 1. Strip explicit <antArtifact> / <artifact> XML tags
          .replace(/<(?:antArtifact|artifact)[\s\S]*?<\/(?:antArtifact|artifact)>/gi, '')
          // 2. Strip markdown code blocks that were extracted as artifacts (html, react, svg, markdown, json, table, etc.)
          .replace(/```(?:html|htm|react|jsx|tsx|svg|mermaid|chart|chartjson|markdown|md|json|csv|table|js|ts|py|sh|bash|css|sql|python|javascript|typescript)[^\n]*\n[\s\S]*?```/gi, '')
          .trim();
      }
      if (!visibleMessageText && extractedArtifacts.length > 0) {
        const artifactLabel = extractedArtifacts[0].type === 'chart' ? 'chart' : 'document';
        visibleMessageText = `Created **"${extractedArtifacts[0].title}"** (${artifactLabel} v${extractedArtifacts[0].version || 1}). Open the card below to review it.`;
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

      if (extractedArtifacts.length > 0) {
        openArtifact(extractedArtifacts[0], { keepSize: true });
      }
      
      isStreamComplete = true; // successfully reached the end!
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[ClaudeWorkspaceChat] Request aborted by user/system.');
      } else if (!isStreamComplete) {
        console.error('[ClaudeWorkspaceChat] Error during streaming:', err);
        
        const displayContent = sanitizePublicAssistantText(accumulatedContent);
        const rawError = String(err?.message || '');
        const looksLikeQuota = /429|rate limit|quota|resource_exhausted|too many requests/i.test(rawError);
        const errorMessage = displayContent
          ? displayContent
          : rawError === 'AI returned no content'
            ? 'The model finished thinking but did not produce a public answer. Please try again.'
            : looksLikeQuota
              ? 'The reply could not be completed. The API provider hit a rate limit.'
              : 'The reply could not be completed because of a connection error.';

        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: errorMessage,
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

  const hasArtifactsInActiveChat = activeChat?.messages.some((m) => m.artifacts && m.artifacts.length > 0) || false;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (event.key === 'Escape') {
        if (isSourcesOpen) {
          event.preventDefault()
          closeSources()
          return
        }
        if (isArtifactsOpen) {
          event.preventDefault()
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
    <div className="relative flex h-full min-h-0 w-full min-w-0 text-primary font-wimbot overflow-hidden antialiased selection:bg-[#1E3A8A]/15 selection:text-[#1E3A8A]">
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
        onExportChat={() => setShareModalOpen(true)}
        onImportChat={handleImportChat}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(pId) => setActiveProjectId(pId)}
        onCreateProjectClick={() => setProjectModalOpen(true)}
        onOpenSearchModal={() => setSearchModalOpen(true)}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        artifacts={activeChat?.messages.flatMap((m) => m.artifacts || []) || []}
        activeArtifactId={activeArtifact?.id}
        onSelectArtifact={(art) => openArtifact(art)}
        onToggleArtifacts={() => {
          if (isArtifactsOpen) closeArtifacts()
          else if (activeArtifact) openArtifact(activeArtifact)
        }}
      />

      {/* Main Workspace Area */}
      <div ref={workspaceRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <Header
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={() => handleNewChat()}
          onOpenSearchModal={() => setSearchModalOpen(true)}
          onOpenShareModal={() => setShareModalOpen(true)}
          hasArtifacts={hasArtifactsInActiveChat}
          onToggleArtifacts={() => {
            if (isArtifactsOpen) closeArtifacts()
            else if (activeArtifact) openArtifact(activeArtifact)
          }}
          isArtifactsOpen={isArtifactsOpen}
          activeChatTitle={activeChat?.title}
          hasMessages={Boolean(activeChat && activeChat.messages.length > 0)}
          onOpenSettingsModal={() => setSettingsModalOpen(true)}
          onClose={onClose}
          activeNotebookMeta={activeNotebookMeta}
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={(id) => setActiveChatId(id)}
          onCloseChat={(id) => handleDeleteChat(id)}
        />

        {/* Chat Stream & Conversation Body */}
        <main ref={chatScrollRef} className="flex-1 overflow-y-auto scroll-smooth relative">
          {!activeChat || activeChat.messages.length === 0 ? (
            /* Centered Input Screen when empty (no landing text or chips) */
            <div className="flex h-full w-full flex-col items-center justify-center p-4 sm:p-6 max-w-3xl mx-auto select-none">
              <div className="mb-5 flex w-full flex-wrap justify-center gap-2">
                {EMPTY_STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => fillComposer(starter.prompt)}
                    className="rounded-full border border-[#e5e5e5] bg-white px-3 py-1.5 text-[13px] text-[#3d3d3d] hover:border-[#d4d4d4] hover:bg-[#fafafa] cursor-pointer"
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
              <motion.div
                layout
                layoutId="chat-input-container"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="w-full pointer-events-auto"
              >
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onStopStreaming={handleStopStreaming}
                  isStreaming={isStreaming}
                  thinkingBudget={thinkingBudget}
                  onChangeThinkingBudget={setThinkingBudget}
                  webSearchEnabled={webSearchEnabled}
                  onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
                  selectedStylePreset={selectedStylePreset}
                  onChangeStylePreset={setSelectedStylePreset}
                  onScrollToBottom={scrollToBottom}
                  showScrollToBottom={false}
                  models={models}
                  selectedModelId={selectedModelId}
                  onSelectModel={handleSelectModel}
                  draftPrompt={composerDraft}
                  draftNonce={composerDraftNonce}
                />
              </motion.div>
            </div>
          ) : (
            /* Message List - Smooth Flowing Flow with Generous Bottom Padding */
            <div className="pt-4 pb-48 sm:pb-56 space-y-6">
              {activeChat.messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  targetChatId={activeChat.id}
                  modelOptions={models}
                  onOpenArtifact={(art, origin) => {
                    if (isArtifactsOpen && activeArtifact?.id === art.id && !isArtifactExpanded) {
                      setIsArtifactExpanded(true)
                      return
                    }
                    openArtifact(art, { origin })
                  }}
                  onOpenSources={openSources}
                  onEditPrompt={handleEditPrompt}
                  onRetry={handleRetry}
                  onFeedback={handleMessageFeedback}
                  onUpdateMessage={updateAssistantMessage}
                  onExecuteOSAction={executeOSAction}
                  typewriterSpeed={settings.typewriterSpeed}
                />
              ))}
              <div ref={chatBottomRef} className="h-4" />
            </div>
          )}
        </main>

        {/* Floating Input Area at Bottom (Only when messages exist) */}
        {activeChat && activeChat.messages.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none bg-gradient-to-t from-primary/80 via-primary/40 to-transparent pt-8 pb-3">
            <motion.div
              layout
              layoutId="chat-input-container"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full pointer-events-auto"
            >
              <ChatInput
                onSendMessage={handleSendMessage}
                onStopStreaming={handleStopStreaming}
                isStreaming={isStreaming}
                thinkingBudget={thinkingBudget}
                onChangeThinkingBudget={setThinkingBudget}
                webSearchEnabled={webSearchEnabled}
                onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
                selectedStylePreset={selectedStylePreset}
                onChangeStylePreset={setSelectedStylePreset}
                onScrollToBottom={scrollToBottom}
                showScrollToBottom={isAwayFromBottom}
                models={models}
                selectedModelId={selectedModelId}
                onSelectModel={handleSelectModel}
                draftPrompt={composerDraft}
                draftNonce={composerDraftNonce}
              />
            </motion.div>
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
          origin={artifactOrigin}
          onToggleExpand={() => setIsArtifactExpanded((value) => !value)}
          onClose={closeArtifacts}
          allArtifacts={
            activeChat?.messages
              ? activeChat.messages.flatMap((m) => m.artifacts || [])
              : []
          }
          onSelectArtifact={(art) => openArtifact(art, { keepSize: true })}
          onInsertToNotebook={(content) => {
            const notebookOpen = appWindows.some((windowItem) =>
              /notebook/i.test(windowItem.path || '') || windowItem.component === 'NotebookApp'
            )
            const insert = () =>
              window.dispatchEvent(
                new CustomEvent('wimNotebookInsertText', {
                  detail: { text: content, mode: 'append' },
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
          }}
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
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (
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
      if (event.key === 'Escape') {
        closePanel();
      }
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
            className={`fixed w-[min(calc(100vw-1rem),26rem)] max-w-[calc(100vw-1rem)] text-primary border border-primary rounded shadow-xl z-50 flex flex-col font-sans overflow-hidden antialiased selection:bg-[#1E3A8A]/15 selection:text-[#1E3A8A] notebook-app-scope ${WINDOW_BG}`}
          >
            <App onClose={closePanel} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal.Root>
  );
}
