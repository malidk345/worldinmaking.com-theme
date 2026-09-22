import React, { useState, useRef, useEffect } from 'react';
import { LemonSelect } from '../../../notebook-app/lib/lemon-ui/LemonSelect/LemonSelect';
import { StylePresetId, FileAttachment, ModelId, ModelOption, AgentMode, HumanTurn } from '../types';
import { preferHumanAnswerOverStop } from '../../../lib/human-turn-ux';
import {
  IconPlus,
  IconMicrophone,
  IconX,
  IconDocument,
  IconImage,
  IconChevronDown,
  IconArrowRight,
  IconNotebook,
} from '@posthog/icons';
import { readNotebookSelection } from '../../../lib/notebook-chat-bind';
import { parseDocumentFile } from '../../../lib/document-parser';
import { useTokenQuota } from '../../../lib/chat-usage-client';
import { ScratchpadStore } from '../../../lib/scratchpad-store';
import { useOptionalApp } from '../../../context/App';
import { uploadFile, getFileUrl } from '../../../lib/storage-worker';

const TOOLBAR_ICON = 'size-4 shrink-0'
const CHIP_ICON = 'size-3.5 shrink-0'
const ASK_SKIP_ANSWER = 'The user skipped this question. Continue with your best judgment.'

export type SlashCommandItem = {
  id: string
  label: string
  hint: string
  insert: string
  mode?: AgentMode
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  { id: 'ask', label: '/ask', hint: 'Ask mode — conversational Q&A', insert: '', mode: 'ask' },
  { id: 'plan', label: '/plan', hint: 'Plan mode — read-only research & outline', insert: '', mode: 'plan' },
  { id: 'execute', label: '/execute', hint: 'Execute mode — tool execution & edits', insert: '', mode: 'execute' },
  { id: 'table', label: '/table', hint: 'Comparison table', insert: 'Make a clear comparison table of ' },
  { id: 'diagram', label: '/diagram', hint: 'Mermaid flowchart', insert: 'Draw a mermaid diagram of ' },
  { id: 'notebook', label: '/notebook', hint: 'Notebook draft', insert: 'Write a notebook-ready structured draft about ' },
  { id: 'critique', label: '/critique', hint: 'Philosophical critique', insert: 'Critique the following argument through philosophical deconstruction: ' },
  { id: 'code', label: '/code', hint: 'React / TS component', insert: 'Write a clean, production-ready React component for ' },
  { id: 'summarize', label: '/summarize', hint: 'Distill core points', insert: 'Summarize the core thesis and key points of ' },
  { id: 'simplify', label: '/simplify', hint: 'Plain intuitive explanation', insert: 'Explain in clear and intuitive language: ' },
  { id: 'chart', label: '/chart', hint: 'Interactive data chart', insert: 'Create an interactive chart visualizing ' },
]

export const ASK_STARTERS = [
  {
    label: 'Edit this note',
    prompt: 'Edit the selected or bound note: ',
    preview: 'Rewrites the selected or bound notebook passage.',
    mutating: true,
  },
  {
    label: 'Write to notebook',
    prompt: 'Write this into the bound notebook: ',
    preview: 'Drafts into the bound notebook.',
    mutating: true,
  },
  {
    label: 'Research this',
    prompt: 'Research this with live sources: ',
    preview: 'Looks up live sources, then answers.',
  },
  {
    label: 'Explain briefly',
    prompt: 'Explain this simply and briefly: ',
    preview: 'Short plain-language explanation.',
  },
] as const

interface ChatInputProps {
  onSendMessage: (prompt: string, attachments: FileAttachment[]) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  selectedStylePreset?: StylePresetId;
  onChangeStylePreset?: (preset: StylePresetId) => void;
  models?: any[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  draftPrompt?: string;
  draftNonce?: number;
  menuPlacement?: 'top-start' | 'bottom-start';
  incomingAttachments?: FileAttachment[];
  boundNotebookTitle?: string;
  onDismissNotebookContext?: () => void;
  pendingHumanTurn?: HumanTurn;
  onHumanRespond?: (action: 'run' | 'revise' | 'answer', payload?: string) => void;
  agentMode?: AgentMode;
  onAgentModeChange?: (mode: AgentMode) => void;
  lockShakeNonce?: number;
  nextSectionTitle?: string;
  /** Chip label — 'Next section' (execute) or 'Next step' (plan). */
  nextSectionLabel?: string;
  onNextSection?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  models = [],
  selectedModelId = 'nietzsche',
  onSelectModel,
  draftPrompt = '',
  draftNonce = 0,
  menuPlacement = 'top-start',
  incomingAttachments,
  boundNotebookTitle,
  onDismissNotebookContext,
  pendingHumanTurn,
  onHumanRespond,
  agentMode = 'ask',
  onAgentModeChange,
  lockShakeNonce = 0,
  nextSectionTitle,
  nextSectionLabel = 'Next section',
  onNextSection,
}) => {
  const app = useOptionalApp();
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [pendingUploads, setPendingUploads] = useState<Array<{ id: string; name: string; kind: 'image' | 'pdf' | 'file' }>>([]);


  useEffect(() => {
    if (incomingAttachments && incomingAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...incomingAttachments]);
    }
  }, [incomingAttachments]);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSelection, setActiveSelection] = useState('');
  const [justReady, setJustReady] = useState(false);
  const [modeShake, setModeShake] = useState(false);
  const [linkChips, setLinkChips] = useState<Array<{ id: string; url: string }>>([]);
  const [askChoice, setAskChoice] = useState<string | 'free' | null>(null);
  const [humanDismissed, setHumanDismissed] = useState(false);
  const wasStreamingRef = useRef(false);
  const { quota } = useTokenQuota();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const checkSel = () => setActiveSelection(readNotebookSelection())
    checkSel()
    let timer = 0
    const onSel = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(checkSel, 80)
    }
    document.addEventListener('selectionchange', onSel)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('selectionchange', onSel)
    }
  }, []);

  useEffect(() => {
    if (draftNonce > 0) {
      setPrompt(draftPrompt)
      textareaRef.current?.focus()
    }
  }, [draftNonce, draftPrompt])

  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      setJustReady(true)
      const timer = window.setTimeout(() => setJustReady(false), 480)
      wasStreamingRef.current = false
      return () => window.clearTimeout(timer)
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming])

  useEffect(() => {
    if (!lockShakeNonce) return
    setModeShake(true)
    const timer = window.setTimeout(() => setModeShake(false), 420)
    return () => window.clearTimeout(timer)
  }, [lockShakeNonce])


  // Auto-resize textarea without collapsing the first line
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = '24px'
      const isMobileKeyboard =
        typeof window !== 'undefined' &&
        window.innerWidth < 768 &&
        document.documentElement.getAttribute('data-keyboard') === 'open'
      const maxHeight = isMobileKeyboard ? 100 : 160
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 24), maxHeight)}px`
    }
    setSlashIndex(0)
  }, [prompt]);

  const awaitingAsk = Boolean(
    pendingHumanTurn && pendingHumanTurn.kind === 'ask_user' && pendingHumanTurn.status === 'pending' && !humanDismissed
  )
  const awaitingPlan = Boolean(
    pendingHumanTurn &&
      pendingHumanTurn.kind === 'plan_approval' &&
      pendingHumanTurn.status === 'pending' &&
      !humanDismissed
  )
  const awaitingHuman = awaitingAsk || awaitingPlan

  const pendingKey = pendingHumanTurn
    ? `${pendingHumanTurn.kind}:${pendingHumanTurn.question || pendingHumanTurn.summary || pendingHumanTurn.title}`
    : ''
  const prevPendingKey = useRef('')
  useEffect(() => {
    if (pendingKey && pendingKey !== prevPendingKey.current) setHumanDismissed(false)
    if (!pendingKey) setHumanDismissed(false)
    prevPendingKey.current = pendingKey
  }, [pendingKey])

  const slashQuery = prompt.startsWith('/') ? prompt.slice(1).split(/\s/)[0].toLowerCase() : ''
  const slashMatches =
    !awaitingHuman && prompt.startsWith('/') && !prompt.includes(' ')
      ? SLASH_COMMANDS.filter((command) => command.id.startsWith(slashQuery))
      : []

  const applySlashCommand = (command: SlashCommandItem) => {
    if (command.mode) {
      onAgentModeChange?.(command.mode)
      setPrompt('')
    } else {
      setPrompt(command.insert)
    }
    setSlashIndex(0)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex((index) => (index + 1) % slashMatches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex((index) => (index - 1 + slashMatches.length) % slashMatches.length)
        return
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        const selected = slashMatches[slashIndex] || slashMatches[0]
        if (selected) applySlashCommand(selected)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setPrompt('')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (awaitingAsk && !(pendingHumanTurn?.choices || []).length) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
    if (awaitingHuman) {
      setAskChoice(null)
      if (isRecording) {
        try {
          recognitionRef.current?.stop()
        } catch {
          /* ignore */
        }
        setIsRecording(false)
      }
    }
  }, [awaitingHuman])

  // Fail closed until quota is known (null = cold-start / still loading).
  const quotaBlocksSend = quota?.allowed !== true;

  const handleSubmit = () => {
    const links = linkChips.map((chip) => chip.url).join('\n')
    const body = [links, prompt.trim()].filter(Boolean).join('\n\n')
    if (pendingHumanTurn && pendingHumanTurn.kind === 'ask_user' && pendingHumanTurn.status === 'pending') {
      const picked = askChoice && askChoice !== 'free' ? askChoice : body
      // handleHumanRespond aborts any still-open interrupt stream — do not block Answer on isStreaming
      if (!picked) return
      setHumanDismissed(true)
      onHumanRespond?.('answer', picked)
      setPrompt('')
      setAttachments([])
      setLinkChips([])
      if (textareaRef.current) textareaRef.current.style.height = '24px'
      return
    }
    if (pendingHumanTurn && pendingHumanTurn.kind === 'plan_approval' && pendingHumanTurn.status === 'pending') {
      // Same as ask_user: revise/run must work while the interrupt SSE drains
      setHumanDismissed(true)
      onHumanRespond?.('revise', body || undefined)
      setPrompt('')
      setAttachments([])
      setLinkChips([])
      if (textareaRef.current) textareaRef.current.style.height = '24px'
      return
    }
    if ((!body && attachments.length === 0) || isStreaming || quotaBlocksSend) return;
    onSendMessage(body, attachments);
    setPrompt('');
    setAttachments([]);
    setLinkChips([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach(async (file) => {
      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      const kind: 'image' | 'pdf' | 'file' = file.type.startsWith('image/')
        ? 'image'
        : file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
          ? 'pdf'
          : 'file'
      setPendingUploads((prev) => [...prev, { id, name: file.name, kind }])

      try {
        const parsed = await parseDocumentFile(file);

        let uploadedUrl = parsed.type === 'image' ? parsed.content : undefined;

        if (parsed.type === 'image' || parsed.type === 'audio') {
            try {
                const meta = await uploadFile({ file, category: 'chat', filename: file.name });
                uploadedUrl = getFileUrl(meta.storage_key);
            } catch (uploadErr) {
                console.error('[ChatInput] Upload failed for', file.name, uploadErr);
            }
        }

        ScratchpadStore.addDocument({
          name: file.name,
          content: parsed.content,
          type: parsed.type,
          size: sizeStr,
          pageCount: parsed.pageCount,
          preview: parsed.preview,
        });

        setAttachments((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            type: parsed.type as any,
            size: sizeStr,
            url: uploadedUrl,
            content: parsed.content,
            contentPreview: parsed.preview,
          },
        ]);
      } catch (err) {
        console.error('[ChatInput] Document parsing failed:', err);
      } finally {
        setPendingUploads((prev) => prev.filter((item) => item.id !== id))
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
      return
    }
    const text = (e.clipboardData.getData('text') || '').trim()
    if (/^https?:\/\/\S+$/i.test(text)) {
      e.preventDefault()
      setLinkChips((prev) => {
        if (prev.some((chip) => chip.url === text)) return prev
        return [...prev, { id: `link-${Date.now()}`, url: text }]
      })
    }
  };

  const toggleSpeechRecognition = () => {
    if (awaitingHuman) return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Voice input is not supported in this browser.');
      return;
    }

    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch (_) {/* ignore */ }
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        const navLang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
        recognition.lang = navLang.toLowerCase().startsWith('tr') ? 'tr-TR' : navLang;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (e: any) => {
          let liveTranscript = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) liveTranscript += e.results[i][0].transcript + ' ';
          }
          if (liveTranscript) setPrompt((prev) => (prev ? `${prev} ${liveTranscript}` : liveTranscript));
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="relative w-full pointer-events-none">
      {nextSectionTitle && onNextSection && !awaitingHuman && !isStreaming ? (
        <div className="pointer-events-auto mb-2">
          <button
            type="button"
            onClick={onNextSection}
            className="w-full rounded-2xl border border-primary/50 bg-primary/95 px-3 py-2 text-left text-[13px] text-primary shadow-sm hover:bg-accent cursor-pointer"
          >
            <span className="block text-[11px] font-medium text-muted">{nextSectionLabel}</span>
            <span className="block truncate font-semibold">{nextSectionTitle}</span>
          </button>
        </div>
      ) : null}


      {/* Floating Input Box with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`pointer-events-auto relative rounded-2xl border bg-primary/95 backdrop-blur-xl px-3 py-2 transition-all duration-300 ease-out [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.08)] ${

          modeShake ? '[animation:wim-composer-shake_420ms_ease-in-out]' : ''
        } ${justReady ? '[animation:wim-composer-ready_480ms_ease-out]' : ''} ${
          agentMode === 'plan' ? 'ring-1 ring-inset ring-primary/50' : agentMode === 'execute' ? 'ring-1 ring-inset ring-accent' : ''
        } ${
          isDragging
            ? 'border-[#1E3A8A] shadow-[0_0_12px_rgba(30,58,138,0.55),0_0_22px_rgba(30,58,138,0.28)] bg-accent'
            : prompt.trim().length > 0
            ? 'border-[#1E3A8A]/70 shadow-[0_0_8px_rgba(30,58,138,0.22)] hover:border-[#1E3A8A] hover:shadow-[0_0_8px_rgba(30,58,138,0.45),0_0_16px_rgba(30,58,138,0.22)] focus-within:border-[#1E3A8A] focus-within:shadow-[0_0_10px_rgba(30,58,138,0.5),0_0_20px_rgba(30,58,138,0.25)] dark:hover:shadow-[0_0_8px_rgba(59,130,246,0.35),0_0_18px_rgba(30,58,138,0.35)] dark:focus-within:shadow-[0_0_10px_rgba(59,130,246,0.45),0_0_22px_rgba(30,58,138,0.4)]'
            : 'border-primary/60 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4),0_1px_4px_rgba(255,255,255,0.05)] hover:border-[#1E3A8A] hover:shadow-[0_0_8px_rgba(30,58,138,0.45),0_0_16px_rgba(30,58,138,0.22)] focus-within:border-[#1E3A8A] focus-within:shadow-[0_0_10px_rgba(30,58,138,0.5),0_0_20px_rgba(30,58,138,0.25)] dark:hover:shadow-[0_0_8px_rgba(59,130,246,0.35),0_0_18px_rgba(30,58,138,0.35)] dark:focus-within:shadow-[0_0_10px_rgba(59,130,246,0.45),0_0_22px_rgba(30,58,138,0.4)]'
        }`}
      >
        {/* Dropzone Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/95 backdrop-blur-md text-primary pointer-events-none shadow-lg">
            <IconPlus className="size-5 text-primary mb-0.5" />
            <span className="text-xs font-semibold">Drop files here to attach</span>
            <span className="text-[10px] text-secondary">Images, documents or code snippets</span>
          </div>
        )}

        {slashMatches.length > 0 && (
          <div className="absolute inset-x-0 bottom-full z-20 mb-1.5 overflow-hidden rounded border border-primary bg-primary py-0.5 shadow-md max-h-60 overflow-y-auto">
            {slashMatches.map((command, index) => (
              <button
                key={command.id}
                type="button"
                onClick={() => applySlashCommand(command)}
                className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12px] cursor-pointer ${
                  index === slashIndex ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-primary">{command.label}</span>
                  {command.mode && agentMode === command.mode && (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-[#1E3A8A] text-white font-semibold">
                      active
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-secondary truncate ml-2">{command.hint}</span>
              </button>
            ))}
          </div>
        )}

        {awaitingAsk ? (
          <div className="mb-1.5 animate-fadeIn font-sans">
            <p className="m-0 text-[12.5px] font-medium leading-snug text-primary">
              {pendingHumanTurn?.question || pendingHumanTurn?.title}
            </p>
            {(pendingHumanTurn?.choices || []).length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(pendingHumanTurn?.choices || []).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      setHumanDismissed(true)
                      onHumanRespond?.('answer', choice)
                    }}
                    className="rounded-full border border-primary/50 bg-accent/80 px-2.5 py-0.5 text-[12px] text-primary hover:bg-accent cursor-pointer"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {awaitingPlan ? (
          <div className="mb-1.5 animate-fadeIn font-sans">
            <p className="m-0 text-[12.5px] font-medium leading-snug text-primary">
              {pendingHumanTurn?.summary || pendingHumanTurn?.title || 'Ready to run'}
            </p>
            {pendingHumanTurn?.plan && pendingHumanTurn.plan.length > 0 ? (
              <ol className="m-0 mt-1.5 list-decimal space-y-0.5 pl-4 text-[12px] text-secondary">
                {pendingHumanTurn.plan.map((item) => (
                  <li key={item.id} className={item.status === 'completed' ? 'line-through text-muted' : ''}>
                    {item.title}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}

        {/* Bound Notebook Context Badge */}
        {boundNotebookTitle && (
          <div className="mb-1.5 flex items-center justify-between gap-1.5 rounded bg-accent/80 border border-primary/50 px-2 py-0.5 text-[11px] text-secondary font-sans animate-fadeIn">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <IconDocument className="size-3.5 shrink-0 text-primary" />
              <span className="truncate font-medium text-primary">{boundNotebookTitle}</span>
              <span className="shrink-0 text-muted">· bound notebook</span>
            </div>
            {onDismissNotebookContext && (
              <button
                type="button"
                onClick={onDismissNotebookContext}
                className="text-muted hover:text-primary p-0.5 rounded transition-colors cursor-pointer shrink-0"
                title="Disconnect notebook context"
              >
                <IconX className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Attachment Previews */}
        {(pendingUploads.length > 0 || attachments.length > 0) && (
          <div className="mb-1.5 flex flex-wrap gap-2 border-b border-primary pb-2">
            {pendingUploads.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded border border-primary bg-accent px-2 py-1.5"
                role="status"
                aria-live="polite"
              >
                <div
                  className={`shrink-0 animate-pulse rounded border border-primary/40 bg-primary ${
                    item.kind === 'image' ? 'h-12 w-12' : 'h-8 w-8'
                  }`}
                />
                <div className="min-w-0">
                  <div className="max-w-[140px] truncate text-[11px] font-medium text-primary">{item.name}</div>
                  <div className="text-[10px] text-muted">Loading…</div>
                </div>
              </div>
            ))}
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded border border-primary bg-accent px-2 py-1.5"
              >
                {att.type === 'image' && att.url ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-12 w-12 shrink-0 rounded border border-primary/40 object-cover"
                  />
                ) : att.type === 'image' ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-primary/40 bg-primary">
                    <IconImage className="size-5 text-secondary" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/40 bg-primary">
                    <IconDocument className="size-4 text-secondary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="max-w-[140px] truncate text-[11px] font-medium text-primary">{att.name}</div>
                  <div className="font-mono text-[10px] text-muted">{att.size}</div>
                </div>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="p-0.5 text-muted hover:text-primary cursor-pointer"
                  title="Remove attachment"
                >
                  <IconX className={CHIP_ICON} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Notebook Selection Badge */}
        {activeSelection && (
          <div className="mb-1.5 flex items-center justify-between gap-1.5 rounded bg-accent/80 border border-primary/50 px-2 py-0.5 text-[11px] text-secondary font-sans animate-fadeIn">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <IconNotebook className="size-3.5 shrink-0 text-[#1E3A8A] dark:text-blue-400" />
              <span className="shrink-0 font-medium text-primary">
                {boundNotebookTitle ? boundNotebookTitle : 'Selection'}
              </span>
              <span className="shrink-0 text-muted">
                · {Math.max(1, activeSelection.split(/\n/).filter((line) => line.trim()).length)} line
                {activeSelection.split(/\n/).filter((line) => line.trim()).length === 1 ? '' : 's'}
              </span>
              <span className="truncate text-secondary">"{activeSelection.slice(0, 80)}"</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSelection('')}
              className="text-muted hover:text-primary p-0.5 rounded transition-colors cursor-pointer shrink-0"
              title="Dismiss selection"
            >
              <IconX className="size-3" />
            </button>
          </div>
        )}

        {/* Textarea Placeholder: "Write a message..." */}
        {linkChips.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {linkChips.map((chip) => (
              <div
                key={chip.id}
                className="flex max-w-full items-center gap-1.5 rounded-md border border-primary bg-accent px-1.5 py-0.5 text-[11px] text-secondary"
              >
                <span className="truncate">{chip.url.replace(/^https?:\/\//, '')}</span>
                <button
                  type="button"
                  onClick={() => setLinkChips((prev) => prev.filter((item) => item.id !== chip.id))}
                  className="text-muted hover:text-primary cursor-pointer p-0.5"
                  title="Remove link"
                >
                  <IconX className={CHIP_ICON} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          data-composer
          aria-label="Message composer"
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            awaitingAsk
              ? 'Type your answer...'
              : awaitingPlan
                ? 'Revision note (optional)'
                : 'Write a message...'
          }
          rows={1}
          autoComplete="off"
          autoCorrect="on"
          spellCheck="true"
          className="w-full resize-none overflow-y-auto border-none bg-transparent px-1 py-0 text-[13.5px] sm:text-[14px] text-primary placeholder:text-muted focus:outline-none focus:ring-0 min-h-[24px] max-h-[160px] leading-relaxed font-sans"
        />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        {/* Bottom Toolbar Row */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          {/* Left Side: + Icon & Bot Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-primary hover:text-primary transition-colors focus:outline-none cursor-pointer shrink-0"
              title="Attach a file"
              aria-label="Attach a file"
            >
              <IconPlus className={TOOLBAR_ICON} />
            </button>
            {/* Philosopher Bot Selector using Notebook LemonSelect */}
            <LemonSelect
              value={selectedModelId}
              onSelect={(newId) => {
                if (newId && onSelectModel) onSelectModel(newId as ModelId);
              }}
              onChange={(newId) => {
                if (newId && onSelectModel) onSelectModel(newId as ModelId);
              }}
              renderButtonContent={() => {
                const activeModel = models.find((m) => m.id === selectedModelId) || models[0];
                return (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-sans text-primary hover:opacity-80 transition-opacity whitespace-nowrap min-w-0">
                    <div className="size-4 rounded-full overflow-hidden bg-accent shrink-0 border border-primary/40 flex items-center justify-center font-bold text-white text-[8px]">
                      {activeModel?.avatarUrl ? (
                        <img src={activeModel.avatarUrl} alt={activeModel.name} className={`size-full ${activeModel.id === 'claude-3-7-sonnet' ? 'object-contain p-px' : 'object-cover'}`} />
                      ) : (
                        <span className={`size-full flex items-center justify-center ${activeModel?.avatarBg || 'bg-primary'}`}>
                          {activeModel?.initials || activeModel?.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-primary tracking-tight truncate max-w-[100px] xs:max-w-[160px] sm:max-w-none">{activeModel?.name.trim().split(/\s+/).filter(Boolean).pop() || activeModel?.name}</span>
                    <IconChevronDown className={`${CHIP_ICON} text-muted ml-0.5`} />
                  </span>
                );
              }}
              sideIcon={null}
              options={[
                {
                  title: 'Philosopher bots',
                  options: models.map((opt) => ({
                    value: opt.id,
                    label: (
                      <span className="flex items-center gap-2 font-medium text-xs min-w-0">
                        <div className="size-4 rounded-full overflow-hidden bg-accent shrink-0 border border-primary/40 flex items-center justify-center font-bold text-white text-[8px]">
                          {opt.avatarUrl ? (
                            <img src={opt.avatarUrl} alt={opt.name} className={`size-full ${opt.id === 'claude-3-7-sonnet' ? 'object-contain p-px' : 'object-cover'}`} />
                          ) : (
                            <span className={`size-full flex items-center justify-center ${opt.avatarBg || 'bg-primary'}`}>
                              {opt.initials || opt.name.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className="truncate">
                          {opt.name.trim().split(/\s+/).filter(Boolean).pop() || opt.name}
                        </span>
                      </span>
                    ),
                  })),
                },
              ]}
              size="xsmall"
              type="tertiary"
              dropdownPlacement={menuPlacement}
              dropdownMatchSelectWidth={false}
              className="border-none bg-transparent p-0 text-primary relative z-30 [&_.LemonButton]:border-none [&_.LemonButton]:bg-transparent [&_.LemonButton]:shadow-none [&_.LemonButton]:p-0 [&_.LemonButton]:min-h-0 [&_.LemonButton]:h-9 [&_.LemonButton\_\_side-icon]:size-3.5 [&_.LemonButton\_\_side-icon_svg]:size-3.5 [&_.LemonButton\_\_side-icon_svg]:shrink-0 [&_svg]:max-w-[14px] [&_svg]:max-h-[14px]"
            />
          </div>

          <div className="flex items-center gap-1">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              disabled={awaitingHuman}
              className={`flex items-center gap-1 p-1 text-primary hover:text-primary transition-transform duration-150 focus:outline-none cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                isRecording ? 'text-accent' : ''
              }`}
              title={awaitingHuman ? 'Voice input paused' : isRecording ? 'Stop voice input' : 'Voice input'}
              aria-label={awaitingHuman ? 'Voice input paused' : isRecording ? 'Stop voice input' : 'Voice input'}
            >
              {isRecording ? (
                <span className="wim-mic-wave" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <IconMicrophone className={TOOLBAR_ICON} />
              )}
            </button>
            {awaitingAsk ? (
              <button
                type="button"
                onClick={() => {
                  setHumanDismissed(true)
                  onHumanRespond?.('answer', ASK_SKIP_ANSWER)
                }}
                className="px-1.5 text-[11px] text-muted hover:text-primary cursor-pointer"
              >
                Skip
              </button>
            ) : null}
            {awaitingPlan ? (
              <button
                type="button"
                onClick={() => {
                  setHumanDismissed(true)
                  onHumanRespond?.('run')
                  setPrompt('')
                }}
                className="px-1.5 text-[12px] font-medium text-primary hover:opacity-80 cursor-pointer"
              >
                Run
              </button>
            ) : null}

            {/* Send / Stop Action Button — pending human interrupt wins over Stop so ask_user is not stuck behind Stop */}
            {preferHumanAnswerOverStop(isStreaming, awaitingHuman) ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  (!awaitingHuman && isStreaming) ||
                  (!awaitingHuman && quotaBlocksSend) ||
                  (!awaitingPlan && !prompt.trim() && attachments.length === 0 && linkChips.length === 0)
                }
                className={`flex h-7 w-7 items-center justify-center rounded-md shadow-2xs transition-colors transition-transform duration-150 ${
                   (awaitingPlan || prompt.trim() || attachments.length > 0 || linkChips.length > 0) &&
                   (awaitingHuman || !quotaBlocksSend)
                    ? 'bg-[#1E3A8A] hover:bg-[#1e40af] text-white cursor-pointer active:scale-95'
                    : 'bg-[#1E3A8A]/35 text-white/50 cursor-not-allowed'
                }`}
                title={awaitingAsk ? 'Answer' : awaitingPlan ? 'Revise' : 'Send'}
                aria-label={awaitingAsk ? 'Answer' : awaitingPlan ? 'Revise' : 'Send message'}
              >
                <IconArrowRight className={`${TOOLBAR_ICON} -rotate-90`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1E3A8A] bg-[#1E3A8A] shadow-2xs hover:bg-[#1e40af] cursor-pointer transition-colors transition-transform duration-150 active:scale-95"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <div className="size-2.5 rounded-[2px] bg-white shadow-xs" />
              </button>
            )}
          </div>
        </div>
      </div>

      {quotaBlocksSend ? (
        <div role="status" aria-live="polite" className="mt-1.5 h-4 text-center text-[11px] leading-4 font-sans pointer-events-auto">
          {quota === null ? (
            <span className="text-muted animate-pulse">checking weekly budget...</span>
          ) : quota?.unavailable ? (
            <span className="text-muted">can't verify budget — try again later.</span>
          ) : quota?.tier === 'pro' || quota?.tier === 'dev' ? (
            <span className="text-secondary">
              weekly limit reached. resets {new Date(quota.resetAtUtc).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).toLowerCase()} or add your own keys (BYOK).
            </span>
          ) : (
            <span className="text-secondary">
              weekly limit reached.{' '}
              <button
                type="button"
                onClick={() => app?.addWindow?.({ path: '/pricing' })}
                className="underline hover:text-primary transition-colors cursor-pointer"
              >
                Study
              </button>{' '}
              for a larger budget.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};