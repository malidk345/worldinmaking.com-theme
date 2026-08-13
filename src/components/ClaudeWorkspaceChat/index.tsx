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
import { extractArtifactsFromContent } from './utils/extractArtifacts';
import { processArtifactRevision } from './utils/toolCalling';
import { parseAiSseEvent, type AiArtifact } from 'lib/ai/contracts';
import { parseChartSpec, stripChartArtifactMarkup } from 'lib/ai/chart-artifacts';
import { stripThinkingBlocks } from 'lib/bots/thinking-tags';

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

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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


  // Auto scroll & auto open artifact
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (activeChat?.messages) {
      const lastArt = [...activeChat.messages].reverse().find((m) => m.artifacts && m.artifacts.length > 0)?.artifacts?.[0];
      if (lastArt && settings.autoOpenArtifacts) {
        setActiveArtifact(lastArt);
        setIsArtifactsOpen(true);
      }
    }
  }, [activeChatId, settings.autoOpenArtifacts]);

  // Handle New Chat Creation
  const handleNewChat = (projId?: string) => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'Yeni Sohbet',
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
    setIsArtifactsOpen(false);
  };

  // Handle HTML/JSON Chat Import
  const handleImportChat = (importedChat: Chat) => {
    setChats((prev) => [importedChat, ...prev]);
    setActiveChatId(importedChat.id);
    // Auto open artifact if available
    const firstArt = importedChat.messages.find((m) => m.artifacts && m.artifacts.length > 0)?.artifacts?.[0];
    if (firstArt) {
      setActiveArtifact(firstArt);
      setIsArtifactsOpen(true);
    }
  };

  // Handle Message Sending with Backend Streaming
  const handleSendMessage = async (promptText: string, attachments: FileAttachment[]) => {
    if (!promptText.trim() && attachments.length === 0) return;

    let targetChatId = activeChatId;

    // Create chat if empty or invalid
    if (!targetChatId || !chats.some((c) => c.id === targetChatId)) {
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: promptText.slice(0, 30) || attachments[0]?.name || 'Yeni Sohbet',
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
          const isFirstUserMsg = c.messages.length === 0;
          return {
            ...c,
            title: isFirstUserMsg ? promptText.slice(0, 32) || attachments[0]?.name || 'Yeni Sohbet' : c.title,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMessage, assistantMessage],
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
          (candidate.type === artifact.type && candidate.content === artifact.content)
        ) === index
      );
    };

    let isStreamComplete = false;
    let backendError = false;
    try {

      const notebookCtx = activeNotebookContext.trim()
        ? `[NOTEBOOK CONTENT CONTEXT]\n"""\n${activeNotebookContext}\n"""\n`
        : '';

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

      const conversationHistory = activeChat?.messages
        ? activeChat.messages
            .slice(-10) // Send last 10 turns of full chat memory
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n')
            .slice(0, 8000)
        : '';

      // Tier 1: Try SSE Token Streaming via /api/notebook/co-author (Primary Ask AI Backend)
      let sseRes: Response | null = null;
      try {
        sseRes = await fetch('/api/notebook/co-author', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
            body: JSON.stringify({
              botName: selectedModelId,
              mode: 'chat',
              documentText: activeNotebookContext,
              nodeContent: effectivePrompt,
              chatHistory: conversationHistory,
              webSearchEnabled: webSearchEnabled,
              attachmentContext,
            }),
        });
      } catch (e) {
        console.warn('co-author fetch failed, cascading to /api/bots/act');
      }

      if (sseRes && sseRes.ok && sseRes.body) {
        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
             try {
               const parsed = parseAiSseEvent(line);
               if (!parsed) continue;

               // Handle live search event from the shared AI transport.
               if (parsed.type === 'search') {
                 let detailText = `Query: "${parsed.search.query}"`;
                 if (parsed.search.results) {
                  detailText += `\n\nFetched Sources:\n${parsed.search.results}`;
                }
                const searchStep = {
                  id: 'search-step',
                  stepNumber: 0,
                   title: 'Search Web & Sources',
                   detail: detailText,
                   completed: parsed.search.status === 'done',
                   source: 'system_event' as const,
                };
                const existingIdx = currentThinkingProcess.steps.findIndex((s: any) => s.id === 'search-step');
                if (existingIdx >= 0) {
                  currentThinkingProcess.steps[existingIdx] = searchStep;
                } else {
                  currentThinkingProcess.steps.unshift(searchStep);
                 }
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

               // Handle backend error event — surface it and let the normal
               // fallback ladder try the next API.
               if (parsed.type === 'error') {
                 console.error('[co-author SSE] backend error:', parsed.message);
                 backendError = true;
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
                  });
                 break;
               }
             } catch {
               /* ignore chunk parse error */
             }
          }
        }
      }

      // Tier 2: Fallback to /api/bots/act or /api/philosopher-bot if SSE returned empty
       let finalCleanContent = sanitizePublicAssistantText(accumulatedContent);
       if (!finalCleanContent) {
        let res: Response | null = null;
        try {
          res = await fetch('/api/bots/act', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortControllerRef.current.signal,
            body: JSON.stringify({
              action: 'chat',
              bot: selectedModelId,
               question: effectivePrompt,
               mood: 'calm',
               taskType: 'autonomous_assistant',
               context: `${notebookCtx}\n${attachmentContext}`.slice(0, 12000),
            }),
          });
        } catch {
          /* fallback */
        }

        if (!res || !res.ok || res.status === 404 || res.status === 405) {
          try {
            res = await fetch('/api/philosopher-bot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: abortControllerRef.current.signal,
              body: JSON.stringify({
                philosopher: selectedModelId,
                 question: effectivePrompt,
                 mood: 'calm',
                 taskType: 'autonomous_assistant',
                 context: `${notebookCtx}\n${attachmentContext}`.slice(0, 12000),
              }),
            });
          } catch {
            /* fallback */
          }
        }

        // Tier 3: Fallback to /api/chat
        if (!res || !res.ok) {
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortControllerRef.current.signal,
            body: JSON.stringify({
               prompt: effectivePrompt,
              modelId: selectedModelId,
              thinkingBudget,
              webSearchEnabled,
               systemPrompt: activeProjectObj?.systemPrompt || '',
               styleSuffix: selectedStyle?.promptSuffix || '',
               attachmentContext,
            }),
          });
        }

        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            const replyText = data.reply || data.content || data.fullText || data.text || '';
            appendStreamedArtifacts(Array.isArray(data.artifacts) ? data.artifacts : undefined);
            const fallbackArtifacts = extractArtifactsFromContent(replyText, effectivePrompt);
            streamedArtifacts = [...streamedArtifacts, ...fallbackArtifacts].filter((artifact, index, all) =>
              all.findIndex((candidate) =>
                candidate.id === artifact.id ||
                (candidate.type === artifact.type && candidate.content === artifact.content)
              ) === index
            );

            accumulatedContent = replyText;
            finalCleanContent = sanitizePublicAssistantText(replyText)
              .replace(/<(?:analysis_summary|thinking|think)>[\s\S]*?(?:<\/(?:analysis_summary|thinking|think)>|$)/gi, '')
              .trim();

            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: finalCleanContent,
              artifacts: streamedArtifacts.length > 0 ? streamedArtifacts : undefined,
              isStreaming: false,
              isTypingDone: true,
            });
            if (streamedArtifacts.length > 0) {
              setActiveArtifact(streamedArtifacts[0]);
              setIsArtifactsOpen(true);
            }
            isStreamComplete = true;
            return;
          } else if (res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.trim()) continue;

                let eventType = 'chunk';
                let dataStr = '';

                line.split('\n').forEach((l) => {
                  if (l.startsWith('event: ')) eventType = l.replace('event: ', '').trim();
                  if (l.startsWith('data: ')) dataStr = l.replace('data: ', '').trim();
                });

                if (!dataStr) continue;

                 try {
                   const data = JSON.parse(dataStr);

                   // The fallback endpoint uses the same data-only SSE contract
                    // as the primary endpoint. Keep the old named-event branch
                    // below for already-deployed edge responses during rollout.
                    if (typeof data.type === 'string') {
                      if (data.type === 'artifacts') {
                        appendStreamedArtifacts(Array.isArray(data.artifacts) ? data.artifacts : undefined);
                        updateAssistantMessage(targetChatId, assistantMessageId, {
                          content: sanitizePublicAssistantText(accumulatedContent),
                          artifacts: streamedArtifacts,
                        });
                      } else if (data.type === 'thinking_start') {
                       currentThinkingProcess.durationSeconds = data.durationSeconds || 0;
                       currentThinkingProcess.tokenCount = data.tokenCount || 0;
                     } else if (data.type === 'thinking_step') {
                       const existingIdx = currentThinkingProcess.steps.findIndex(s => s.id === data.step.id);
                       if (existingIdx !== -1) {
                           currentThinkingProcess.steps[existingIdx] = data.step;
                       } else {
                           currentThinkingProcess.steps.push(data.step);
                       }
                        currentThinkingProcess.steps = [...currentThinkingProcess.steps];
                        updateAssistantMessage(targetChatId, assistantMessageId, {
                          content: sanitizePublicAssistantText(accumulatedContent),
                          thinkingProcess: { ...currentThinkingProcess },
                        });
                      } else if (data.type === 'token') {
                        accumulatedContent += data.text || '';
                        updateAssistantMessage(targetChatId, assistantMessageId, {
                          content: sanitizePublicAssistantText(accumulatedContent),
                          thinkingProcess: { ...currentThinkingProcess },
                        });
                       } else if (data.type === 'done') {
                         appendStreamedArtifacts(Array.isArray(data.artifacts) ? data.artifacts : undefined);
                         accumulatedContent = data.fullText || accumulatedContent;
                         updateAssistantMessage(targetChatId, assistantMessageId, {
                           content: sanitizePublicAssistantText(accumulatedContent),
                           artifacts: streamedArtifacts,
                           thinkingProcess: { ...currentThinkingProcess },
                         });
                      } else if (data.type === 'phase') {
                        const phaseLabels: Record<string, string> = {
                          context: 'Context',
                          generation: 'Generation',
                          quality_gate: 'Quality check',
                          persistence: 'Memory sync',
                        };
                        const phaseStep = {
                          id: `phase-${data.phase.phase}`,
                          stepNumber: currentThinkingProcess.steps.length + 1,
                          title: phaseLabels[data.phase.phase] || data.phase.phase,
                          detail: data.phase.detail || `${data.phase.phase} ${data.phase.status}`,
                          completed: data.phase.status !== 'started',
                          source: 'system_event' as const,
                        };
                        const phaseIndex = currentThinkingProcess.steps.findIndex((step: any) => step.id === phaseStep.id);
                        if (phaseIndex >= 0) currentThinkingProcess.steps[phaseIndex] = phaseStep;
                        else currentThinkingProcess.steps.push(phaseStep);
                      } else if (data.type === 'error') {
                       backendError = true;
                     }
                     continue;
                   }

                   if (eventType === 'thinking_start') {
                    currentThinkingProcess.durationSeconds = data.durationSeconds;
                    currentThinkingProcess.tokenCount = data.tokenCount;
                  } else if (eventType === 'thinking_step') {
                    currentThinkingProcess.steps.push(data);
                   } else if (eventType === 'artifacts') {
                     appendStreamedArtifacts(Array.isArray(data.artifacts) ? data.artifacts : undefined);
                   } else if (eventType === 'chunk') {
                     accumulatedContent += data.text;
                     updateAssistantMessage(targetChatId, assistantMessageId, {
                       content: sanitizePublicAssistantText(accumulatedContent),
                       thinkingProcess: { ...currentThinkingProcess },
                     });
                   } else if (eventType === 'done') {
                     updateAssistantMessage(targetChatId, assistantMessageId, {
                       content: sanitizePublicAssistantText(data.fullText || accumulatedContent),
                       artifacts: streamedArtifacts,
                       isStreaming: false,
                      isTypingDone: true,
                    });
                  }
                } catch {
                  /* ignore SSE chunk error */
                }
              }
           }
            finalCleanContent = sanitizePublicAssistantText(accumulatedContent.trim());
           if (!accumulatedContent.trim()) throw new Error('AI fallback returned no content');
         }
       } else {
         throw new Error('All fallbacks failed');
        }
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
      const rawArtifacts = [...streamedArtifacts, ...extractArtifactsFromContent(finalCleanContent, promptText)].filter(
        (artifact, index, all) =>
          all.findIndex((candidate) =>
            candidate.id === artifact.id ||
            (candidate.type === artifact.type && candidate.content === artifact.content)
          ) === index
      );
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
        const artifactLabel = extractedArtifacts[0].type === 'chart' ? 'grafik' : 'detaylı belge';
        visibleMessageText = `İstediğiniz **"${extractedArtifacts[0].title}"** başlıklı ${artifactLabel} oluşturuldu (v${extractedArtifacts[0].version || 1}). İncelemek için aşağıdaki karta tıklayabilirsin.`;
      }

      // If we had a backend error, do not overwrite the assistant message again with empty content!
      if (!backendError) {
        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: visibleMessageText || finalCleanContent || 'Yanıt oluşturuldu.',
          thinkingProcess: { ...currentThinkingProcess },
          artifacts: extractedArtifacts.length > 0 ? extractedArtifacts : undefined,
          isStreaming: false,
          isTypingDone: true,
          osAction: detectedAction,
        });
      }

      if (extractedArtifacts.length > 0) {
        setActiveArtifact(extractedArtifacts[0]);
        setIsArtifactsOpen(true);
      }
      
      isStreamComplete = true; // successfully reached the end!
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[ClaudeWorkspaceChat] Request aborted by user/system.');
      } else if (!isStreamComplete) {
        console.error('[ClaudeWorkspaceChat] Error during streaming:', err);
        
        const displayContent = sanitizePublicAssistantText(accumulatedContent);

        const errorMessage = displayContent 
          ? displayContent 
          : 'Üzgünüm, yanıt oluşturulurken bir bağlantı hatası meydana geldi. (API sağlayıcınız limiti doldurdu)';

        updateAssistantMessage(targetChatId, assistantMessageId, {
          content: errorMessage,
          isStreaming: false,
          isTypingDone: true,
        });
      }
    } finally {
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
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setActiveChatId(remaining[0]?.id || '');
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
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c))
    );
  };

  const handleToggleStarChat = (id: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c))
    );
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
    setIsArtifactsOpen(false);
  };

  const hasArtifactsInActiveChat = activeChat?.messages.some((m) => m.artifacts && m.artifacts.length > 0) || false;

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative flex h-full min-h-0 w-full text-primary font-wimbot overflow-hidden antialiased selection:bg-[#1E3A8A]/15 selection:text-[#1E3A8A]">
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
        onSelectArtifact={(art) => {
          setActiveArtifact(art);
          setIsArtifactsOpen(true);
        }}
        onToggleArtifacts={() => setIsArtifactsOpen(!isArtifactsOpen)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col h-full min-w-0 relative">
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
          onToggleArtifacts={() => setIsArtifactsOpen(!isArtifactsOpen)}
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
        <main className="flex-1 overflow-y-auto scroll-smooth relative">
          {!activeChat || activeChat.messages.length === 0 ? (
            /* Centered Input Screen when empty (no landing text or chips) */
            <div className="flex h-full w-full flex-col items-center justify-center p-4 sm:p-6 max-w-3xl mx-auto select-none">
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
                  modelOptions={AVAILABLE_MODELS}
                  onOpenArtifact={(art) => {
                    setActiveArtifact(art);
                    setIsArtifactsOpen(true);
                  }}
                  onEditPrompt={(text) => handleSendMessage(text, [])}
                  onRetry={() => handleSendMessage(activeChat.messages[activeChat.messages.length - 2]?.content || '', [])}
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
                showScrollToBottom={activeChat.messages.length > 2}
                models={models}
                selectedModelId={selectedModelId}
                onSelectModel={handleSelectModel}
              />
            </motion.div>
          </div>
        )}
      </div>

      {/* Artifacts Canvas Side Panel */}
      {isArtifactsOpen && (
        <ArtifactsPanel
          artifact={activeArtifact}
          onClose={() => setIsArtifactsOpen(false)}
          allArtifacts={
            activeChat?.messages
              ? activeChat.messages.flatMap((m) => m.artifacts || [])
              : []
          }
          onSelectArtifact={(art) => setActiveArtifact(art)}
          onInsertToNotebook={(content) => {
            const nb = createNotebook(activeArtifact?.title || 'AI Artifact', content);
            app.addWindow({
              id: nb.id,
              title: nb.title,
              icon: 'DocumentTextIcon',
              component: 'NotebookApp',
              path: `/notebook/${nb.id}`,
            });
            setIsArtifactsOpen(false);
          }}
        />
      )}

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
            className={`fixed w-96 max-w-[calc(100vw-1rem)] text-primary border border-primary rounded shadow-xl z-50 flex flex-col font-sans overflow-hidden antialiased selection:bg-[#1E3A8A]/15 selection:text-[#1E3A8A] notebook-app-scope ${WINDOW_BG}`}
          >
            <App onClose={closePanel} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal.Root>
  );
}
