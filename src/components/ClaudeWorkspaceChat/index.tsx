import React, { useState, useEffect, useRef } from 'react';
import {
  Chat,
  Message,
  ModelId,
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
import { ClaudeSparkIcon } from './components/ThinkingBlock';
import { Sparkles, Brain, Plus, Edit3, GraduationCap, Code, Coffee, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Portal from '@radix-ui/react-portal';
import { useApp, useAppSettings } from '../../context/App';
import { WINDOW_BG, PANEL_BG } from '../../constants/frostedSurfaces';
import { getNotebooks, createNotebook } from '../../notebook-app/scenes/notebooks/notebookStorage';
import type { OSActionCard as OSActionCardType } from './types';
import { extractArtifactsFromContent } from './utils/extractArtifacts';
import { processArtifactRevision } from './utils/toolCalling';

export default function App({ onClose }: { onClose?: () => void }) {
  // Persistence state
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('claude_workspace_chats_v6');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [projects, setProjects] = useState<ProjectSpace[]>(() => {
    const saved = localStorage.getItem('claude_workspace_projects_v6');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('claude_workspace_settings');
    return saved
      ? JSON.parse(saved)
      : {
          typewriterSpeed: 'smooth',
          defaultThinkingBudget: 'balanced',
          defaultModel: 'nietzsche',
          autoOpenArtifacts: true,
          soundEffects: false,
        };
  });

  // App Context for openNewChat params
  const app = useApp();
  const { chatParams, setChatParams } = app;

  const activeNotebookContext = React.useMemo(() => {
    if (app?.focusedWindow?.path.startsWith('/notebooks/')) {
      const shortId = app.focusedWindow.path.replace('/notebooks/', '');
      const notebooks = getNotebooks();
      const nb = notebooks.find(n => n.short_id === shortId || n.id === shortId);
      if (nb) {
        return nb.content.slice(0, 4000);
      }
    }
    return '';
  }, [app?.focusedWindow?.path]);

  // Active chat state
  const [models, setModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0]?.id || '');
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(settings.defaultModel);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const [thinkingBudget, setThinkingBudget] = useState<ThinkingBudget>(settings.defaultThinkingBudget);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePresetId>('default');

  // Handle incoming ChatParams (initialQuestion, context, quickQuestions) from openNewChat
  useEffect(() => {
    if (!chatParams) return;

    if (chatParams.initialQuestion) {
      const q = chatParams.initialQuestion;
      const attachments: FileAttachment[] = [];

      // Format codeSnippet into attachment if present
      if (chatParams.codeSnippet) {
        attachments.push({
          id: `code-${Date.now()}`,
          name: `Snippet (${chatParams.codeSnippet.language || 'code'})`,
          size: `${chatParams.codeSnippet.code.length} bytes`,
          type: 'code',
          content: chatParams.codeSnippet.code,
        });
      }

      // Format page context into attachment if present
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

      // Consume initialQuestion & trigger message
      setChatParams((prev) => (prev ? { ...prev, initialQuestion: undefined } : null));
      handleSendMessage(q, attachments);
    }
  }, [chatParams]);


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
    localStorage.setItem('claude_workspace_chats_v4', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('claude_workspace_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('claude_workspace_settings', JSON.stringify(settings));
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
      if (lastArt) {
        setActiveArtifact(lastArt);
        setIsArtifactsOpen(true);
      }
    }
  }, [activeChatId]);

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
        title: promptText.slice(0, 30) || 'Yeni Sohbet',
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
      content: promptText,
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
            title: isFirstUserMsg ? promptText.slice(0, 32) || 'Yeni Sohbet' : c.title,
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
      durationSeconds: 2.5,
      tokenCount: 840,
      steps: [] as any[],
      summary: 'Musing',
    };

    let isStreamComplete = false;
    try {

      const notebookCtx = activeNotebookContext.trim()
        ? `[NOTEBOOK CONTENT CONTEXT]\n"""\n${activeNotebookContext}\n"""\n`
        : '';

      const conversationHistory = activeChat?.messages
        ? activeChat.messages
            .slice(-10) // Send last 10 turns of full chat memory
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n')
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
            nodeContent: promptText,
            chatHistory: conversationHistory,
            webSearchEnabled: webSearchEnabled,
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
            const cleanLine = line.replace(/^data:\s*/, '').trim();
            if (!cleanLine) continue;

            try {
              const parsed = JSON.parse(cleanLine);

              // Handle live search event from backend
              if (parsed.search) {
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
                };
                const existingIdx = currentThinkingProcess.steps.findIndex((s: any) => s.id === 'search-step');
                if (existingIdx >= 0) {
                  currentThinkingProcess.steps[existingIdx] = searchStep;
                } else {
                  currentThinkingProcess.steps.unshift(searchStep);
                }
              }

              // Handle backend done signal — clean exit from stream loop
              if (parsed.done) {
                break;
              }

              // Handle backend error event — surface error and abort stream loop
              if (parsed.error) {
                console.error('[co-author SSE] backend error:', parsed.error);
                backendError = true;
                updateAssistantMessage(targetChatId, assistantMessageId, {
                  content: `Bir hata oluştu: ${parsed.error}`,
                  isStreaming: false,
                  isTypingDone: true,
                });
                break;
              }

              if (parsed.token) {
                accumulatedContent += parsed.token;

                // Extract dynamic Ask AI thinking stages (<think>, <thinking>, <perceive>, <frame>, <tension>, <move>)
                const thinkMatch = accumulatedContent.match(/<(?:thinking|think)>([\s\S]*?)(?:<\/(?:thinking|think)>|$)/i);
                if (thinkMatch) {
                  const thinkBody = thinkMatch[1] || '';
                  // Dynamic XML/HTML tag extraction for any adaptive intent & philosopher persona step (<reflect>, <genealogy>, <search>, <structure>, etc.)
                  const tagRegex = /<([a-z0-9_]+)>([\s\S]*?)(?:<\/\1>|$)/gi;
                  let match: RegExpExecArray | null;
                  const liveSteps: any[] = [];
                  let stepIdx = 1;
                  while ((match = tagRegex.exec(thinkBody)) !== null) {
                    const tagName = match[1];
                    const tagContent = match[2]?.trim();
                    if (tagContent && tagName !== 'thinking' && tagName !== 'think') {
                      const formattedTitle = tagName
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                      liveSteps.push({
                        id: `s${stepIdx}`,
                        stepNumber: stepIdx,
                        title: formattedTitle,
                        detail: tagContent,
                        completed: true,
                      });
                      stepIdx++;
                    }
                  }

                  // If no sub-tags were found (e.g. Qwen output plain reasoning inside <think>...</think>),
                  // populate a "Think" step with the reasoning prose as detail!
                  if (liveSteps.length === 0 && thinkBody.trim()) {
                    // Try to parse Qwen/Markdown style steps
                    // Look for patterns like "1. **Title:** Detail"
                    const listMatches = [...thinkBody.matchAll(/(?:^|\n)\s*(?:\d+\.|\-|\*)\s+\*\*([^*]+)\*\*(?::)?\s*([\s\S]*?)(?=(?:\n\s*(?:\d+\.|\-|\*)\s+\*\*)|$)/g)];
                    
                    if (listMatches.length > 0) {
                      listMatches.forEach((m, idx) => {
                         liveSteps.push({
                           id: 'q' + idx,
                           stepNumber: idx + 1,
                           title: m[1].trim(),
                           detail: m[2].trim(),
                           completed: true
                         });
                      });
                      if (liveSteps.length > 0) {
                         liveSteps[liveSteps.length - 1].completed = accumulatedContent.includes('</think>') || accumulatedContent.includes('</thinking>');
                      }
                    } else {
                      // Fallback: split by double newlines to treat paragraphs as steps
                      const paragraphs = thinkBody.split(/\n\s*\n/).filter(p => p.trim() && !p.toLowerCase().includes("here's a thinking process") && !p.toLowerCase().includes("thinking process:"));
                      
                      if (paragraphs.length > 0) {
                        paragraphs.forEach((p, idx) => {
                           let title = 'Process';
                           let detail = p.trim();
                           // If paragraph starts with bold, use it as title
                           const boldMatch = detail.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
                           if (boldMatch) {
                             title = boldMatch[1].trim();
                             detail = boldMatch[2].trim();
                           }
                           liveSteps.push({
                             id: 'p' + idx,
                             stepNumber: idx + 1,
                             title: title,
                             detail: detail,
                             completed: true
                           });
                        });
                        if (liveSteps.length > 0) {
                           liveSteps[liveSteps.length - 1].completed = accumulatedContent.includes('</think>') || accumulatedContent.includes('</thinking>');
                        }
                      }
                    }
                    
                    // If still empty (e.g. only "Here's a thinking process"), add a generic one
                    if (liveSteps.length === 0) {
                      liveSteps.push({
                        id: 's1',
                        stepNumber: 1,
                        title: 'Think',
                        detail: thinkBody.trim(),
                        completed: accumulatedContent.includes('</think>') || accumulatedContent.includes('</thinking>'),
                      });
                    }
                  }

                  if (liveSteps.length > 0) {
                    const existingSearchStep = currentThinkingProcess.steps.find((s: any) => s.id === 'search-step');
                    if (existingSearchStep) {
                      currentThinkingProcess.steps = [existingSearchStep, ...liveSteps.filter((s: any) => s.id !== 'search-step')];
                    } else {
                      currentThinkingProcess.steps = liveSteps;
                    }
                  }
                }

                // Strip thinking tags if present; hide both closed and any trailing unclosed thinking tag text from visible bubble
                let displayContent = accumulatedContent;
                // 1. Remove all fully closed think blocks
                displayContent = displayContent.replace(/<(?:thinking|think)>[\s\S]*?<\/(?:thinking|think)>/gi, '');
                // 2. Remove any trailing unclosed think block
                displayContent = displayContent.replace(/<(?:thinking|think)>[\s\S]*$/gi, '');
                displayContent = displayContent.trim();

                // Strip any stray inner tags from displayContent
                displayContent = displayContent.replace(/<\/?(?:thinking|think|reflect|perceive|frame|tension|move|structure|genealogy|deconstruction|overcoming|materialist_basis|dialectical_tension|praxis|substance_analysis|affect_mapping|rational_intuition|negative_dialectics|immanent_critique|resolution)>/gi, '').trim();

                updateAssistantMessage(targetChatId, assistantMessageId, {
                  content: displayContent, // REMOVED the "|| accumulatedContent" fallback which was causing the leak!
                  thinkingProcess: { ...currentThinkingProcess },
                });
              }
            } catch {
              /* ignore chunk parse error */
            }
          }
        }
      }

      // Tier 2: Fallback to /api/bots/act or /api/philosopher-bot if SSE returned empty
      const finalCleanContent = accumulatedContent.replace(/<(?:thinking|think)>[\s\S]*?(?:<\/(?:thinking|think)>|$)/gi, '').replace(/<(?:thinking|think)>[\s\S]*$/gi, '').replace(/<\/?(?:thinking|think|reflect|perceive|frame|tension|move|structure|genealogy|deconstruction|overcoming|materialist_basis|dialectical_tension|praxis|substance_analysis|affect_mapping|rational_intuition|negative_dialectics|immanent_critique|resolution)>/gi, '').trim();
      if (!finalCleanContent && !backendError) {
        let res: Response | null = null;
        try {
          res = await fetch('/api/bots/act', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortControllerRef.current.signal,
            body: JSON.stringify({
              action: 'chat',
              bot: selectedModelId,
              question: `${notebookCtx}${promptText}`,
              mood: 'calm',
              taskType: 'paper_section',
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
                question: `${notebookCtx}${promptText}`,
                mood: 'calm',
                taskType: 'paper_section',
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
              prompt: promptText,
              modelId: selectedModelId,
              thinkingBudget,
              webSearchEnabled,
              systemPrompt: activeProjectObj?.systemPrompt || '',
              styleSuffix: selectedStyle?.promptSuffix || '',
            }),
          });
        }

        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            const replyText = data.reply || data.content || data.fullText || data.text || '';

            updateAssistantMessage(targetChatId, assistantMessageId, {
              content: replyText,
              isStreaming: false,
              isTypingDone: true,
            });
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

                  if (eventType === 'thinking_start') {
                    currentThinkingProcess.durationSeconds = data.durationSeconds;
                    currentThinkingProcess.tokenCount = data.tokenCount;
                  } else if (eventType === 'thinking_step') {
                    currentThinkingProcess.steps.push(data);
                  } else if (eventType === 'chunk') {
                    accumulatedContent += data.text;
                    updateAssistantMessage(targetChatId, assistantMessageId, {
                      content: accumulatedContent,
                      thinkingProcess: { ...currentThinkingProcess },
                    });
                  } else if (eventType === 'done') {
                    updateAssistantMessage(targetChatId, assistantMessageId, {
                      content: data.fullText || accumulatedContent,
                      isStreaming: false,
                      isTypingDone: true,
                    });
                  }
                } catch {
                  /* ignore SSE chunk error */
                }
              }
            }
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
      const rawArtifacts = extractArtifactsFromContent(finalCleanContent, promptText);
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
          .replace(/```(?:html|htm|react|jsx|tsx|svg|markdown|md|json|csv|table|js|ts|py|sh|bash|css|sql|python|javascript|typescript)[^\n]*\n[\s\S]*?```/gi, '')
          .trim();
      }
      if (!visibleMessageText && extractedArtifacts.length > 0) {
        visibleMessageText = `İstediğiniz **"${extractedArtifacts[0].title}"** başlıklı detaylı belge oluşturuldu (v${extractedArtifacts[0].version || 1}). İncelemek için aşağıdaki belge kartına veya sol menüdeki belgeye tıklayabilirsiniz.`;
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
        // Do NOT force-open side panel automatically; let user open manually via card/sidebar!
      }
      
      isStreamComplete = true; // successfully reached the end!
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[ClaudeWorkspaceChat] Request aborted by user/system.');
      } else if (!isStreamComplete) {
        console.error('[ClaudeWorkspaceChat] Error during streaming:', err);
        
        let displayContent = accumulatedContent;
        if (displayContent) {
          displayContent = displayContent.replace(/<(?:thinking|think)>[\s\S]*?<\/(?:thinking|think)>/gi, '');
          displayContent = displayContent.replace(/<(?:thinking|think)>[\s\S]*$/gi, '');
          displayContent = displayContent.replace(/<\/?(?:thinking|think|reflect|perceive|frame|tension|move|structure|genealogy|deconstruction|overcoming|materialist_basis|dialectical_tension|praxis|substance_analysis|affect_mapping|rational_intuition|negative_dialectics|immanent_critique|resolution)>/gi, '').trim();
        }

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
    localStorage.clear();
    setChats(INITIAL_CHATS);
    setProjects(INITIAL_PROJECTS);
    setActiveChatId(INITIAL_CHATS[0].id);
    setActiveArtifact(null);
    setIsArtifactsOpen(false);
  };

  const hasArtifactsInActiveChat = activeChat?.messages.some((m) => m.artifacts && m.artifacts.length > 0) || false;

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const taskbarRef = app?.taskbarRef;
  const panelRef = useRef<HTMLDivElement | null>(null);

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
        />

        {/* Chat Stream & Conversation Body */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative">
          {!activeChat || activeChat.messages.length === 0 ? (
            /* Empty Landing Screen in Official Claude UI Style (Screenshot 1) */
            <div className="flex h-full flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6 select-none">
              {/* Terracotta Claude Star Logo */}
              <div className="flex items-center justify-center text-[#1E3A8A]">
                <ClaudeSparkIcon className="h-12 w-12 stroke-[1.5]" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-normal text-primary tracking-tight">
                  what shall we explore?
                </h1>
              </div>

              {/* Skill Pill Chips (Dynamic quickQuestions or Standard Presets) */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {(chatParams?.quickQuestions && chatParams.quickQuestions.length > 0
                  ? chatParams.quickQuestions.map((q) => ({ label: q.length > 32 ? `${q.slice(0, 30)}…` : q, prompt: q, icon: Sparkles }))
                  : [
                      { label: 'PostHog WP', prompt: 'bu kod posthog.com sitesinin css kodu ve ben bu siteye benzeyen bir websitesi yapmak istiyorum wordpresste', icon: Code },
                      { label: 'Write', prompt: 'Bana etkileyici bir makale taslağı yaz.', icon: Edit3 },
                      { label: 'Learn', prompt: 'Kuantum bilgisayarların çalışma prensibini anlat.', icon: GraduationCap },
                      { label: 'Code', prompt: 'React ve TypeScript ile temiz bir hook yaz.', icon: Code },
                      { label: 'Life stuff', prompt: 'Haftalık dengeli bir beslenme ve egzersiz planı oluştur.', icon: Coffee },
                      { label: "ai's pick", prompt: 'give me an interesting philosophical question to think about today.', icon: Lightbulb },
                    ]
                ).map((chip, idx) => {
                  const ChipIcon = chip.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.prompt, [])}
                      className="flex items-center gap-2 rounded-full border border-primary bg-bg-primary/80 px-3.5 py-1.5 text-xs font-medium text-secondary hover:bg-accent hover:border-primary transition-all active:scale-95 shadow-2xs"
                    >
                      <ChipIcon className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
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

        {/* Floating Input Area with Soft Gradient Fade */}
        <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none bg-gradient-to-t from-primary/80 via-primary/40 to-transparent pt-8 pb-3">
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
            showScrollToBottom={activeChat && activeChat.messages.length > 2}
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={handleSelectModel}
          />
        </div>
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
        chat={activeChat}
      />
    </div>
  );
}

export function ClaudeWorkspaceChatPanel() {
  const { isClaudeChatOpen, setIsClaudeChatOpen, taskbarRef } = useApp();
  const { siteSettings } = useAppSettings();
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
            data-skin={siteSettings.skin || 'classic'}
            className={`fixed w-96 max-w-[calc(100vw-1rem)] text-primary border border-primary rounded shadow-xl z-50 flex flex-col font-sans overflow-hidden antialiased selection:bg-[#1E3A8A]/15 selection:text-[#1E3A8A] notebook-app-scope ${WINDOW_BG}`}
          >
            <App onClose={closePanel} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal.Root>
  );
}
