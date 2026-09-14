import React, { useState, useRef, useEffect } from 'react';
import { LemonSelect } from '../../../notebook-app/lib/lemon-ui/LemonSelect/LemonSelect';
import { StylePresetId, FileAttachment, ModelId, ModelOption, AgentMode } from '../types';
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

const TOOLBAR_ICON = 'size-4 shrink-0'
const CHIP_ICON = 'size-3.5 shrink-0'

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
  { label: 'Edit this note', prompt: 'Edit the selected or bound note: ' },
  { label: 'Write to notebook', prompt: 'Write this into the bound notebook: ' },
  { label: 'Research this', prompt: 'Research this with live sources: ' },
  { label: 'Explain briefly', prompt: 'Explain this simply and briefly: ' },
] as const

interface ChatInputProps {
  onSendMessage: (prompt: string, attachments: FileAttachment[]) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  selectedStylePreset?: StylePresetId;
  onChangeStylePreset?: (preset: StylePresetId) => void;
  onScrollToBottom?: () => void;
  showScrollToBottom?: boolean;
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
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  onScrollToBottom,
  showScrollToBottom = true,
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
}) => {
  const app = useOptionalApp();
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [humanTurnDraft, setHumanTurnDraft] = useState('');

  useEffect(() => {
    if (incomingAttachments && incomingAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...incomingAttachments]);
    }
  }, [incomingAttachments]);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSelection, setActiveSelection] = useState('');
  const { quota } = useTokenQuota();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const checkSel = () => {
      const sel = readNotebookSelection();
      setActiveSelection(sel);
    };
    checkSel();
    const interval = setInterval(checkSel, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (draftNonce > 0) {
      setPrompt(draftPrompt)
      textareaRef.current?.focus()
    }
  }, [draftNonce, draftPrompt])


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

  const slashQuery = prompt.startsWith('/') ? prompt.slice(1).split(/\s/)[0].toLowerCase() : ''
  const slashMatches = prompt.startsWith('/') && !prompt.includes(' ')
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

  // Fail closed until quota is known (null = cold-start / still loading).
  const quotaBlocksSend = quota?.allowed !== true;

  const handleSubmit = () => {
    if ((!prompt.trim() && attachments.length === 0) || isStreaming || quotaBlocksSend) return;
    onSendMessage(prompt.trim(), attachments);
    setPrompt('');
    setAttachments([]);
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

      try {
        const parsed = await parseDocumentFile(file);
        // Automatically save document into OS Working Memory Scratchpad
        ScratchpadStore.addDocument({
          name: file.name,
          content: parsed.content,
          type: parsed.type,
          size: sizeStr,
          preview: parsed.preview,
        });

        setAttachments((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            type: parsed.type as any,
            size: sizeStr,
            url: parsed.type === 'image' ? parsed.content : undefined,
            content: parsed.content,
            contentPreview: parsed.preview,
          },
        ]);
      } catch (err) {
        console.error('[ChatInput] Document parsing failed:', err);
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
    }
  };

  const toggleSpeechRecognition = () => {
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
    <div className="relative w-full max-w-3xl mx-auto px-3 sm:px-4 pointer-events-none">
      {/* Overlay so the button never pushes the composer */}
      {showScrollToBottom && slashMatches.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)]">
          <button
            type="button"
            onClick={onScrollToBottom}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 backdrop-blur-md border border-primary/50 shadow-sm text-secondary hover:bg-accent cursor-pointer transition-transform active:scale-95"
            title="Scroll to bottom"
          >
            <IconChevronDown className={TOOLBAR_ICON} />
          </button>
        </div>
      )}

      {/* Floating Input Box with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`pointer-events-auto relative rounded-2xl border bg-primary/95 backdrop-blur-xl px-3 py-2 transition-all duration-300 ease-out [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.08)] ${
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

        {/* Bound Notebook Context Badge */}
        {boundNotebookTitle && (
          <div className="mb-1.5 flex items-center justify-between gap-1.5 rounded bg-accent/80 border border-primary/50 px-2 py-0.5 text-[11px] text-secondary font-sans animate-fadeIn">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <IconDocument className="size-3.5 shrink-0 text-primary" />
              <span className="truncate font-medium text-primary">{boundNotebookTitle}</span>
              <span className="shrink-0 text-muted">· bound</span>
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
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5 pb-1.5 border-b border-primary">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 rounded-md border border-primary bg-accent px-1.5 py-0.5 text-[11px] text-secondary"
              >
                {att.type === 'image' && att.url ? (
                  <img src={att.url} alt={att.name} className="size-4 rounded object-cover border border-primary/30 shrink-0" />
                ) : att.type === 'image' ? (
                  <IconImage className={`${CHIP_ICON} text-amber-700`} />
                ) : (
                  <IconDocument className={`${CHIP_ICON} text-secondary`} />
                )}
                <span className="max-w-[130px] truncate font-medium">{att.name}</span>
                <span className="text-[9.5px] text-muted font-mono">{att.size}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="text-muted hover:text-secondary cursor-pointer p-0.5"
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
              <span className="shrink-0 font-medium text-primary">Selection:</span>
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

        {pendingHumanTurn ? (
          <div className="mb-2 rounded border border-primary/50 bg-accent/60 px-3 py-2.5 text-[12.5px] text-primary">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 font-medium">{pendingHumanTurn.title}</p>
              </div>
              {pendingHumanTurn.kind === 'plan_approval' ? (
                <button
                  type="button"
                  onClick={() => {
                    onHumanRespond?.('run');
                    setHumanTurnDraft('');
                  }}
                  className="rounded-md border border-primary bg-primary px-2.5 py-1 text-[12px] font-medium text-primary hover:bg-accent cursor-pointer"
                >
                  Run
                </button>
              ) : null}
            </div>

            {pendingHumanTurn.summary ? <p className="mt-1 mb-0 text-[12.5px] leading-relaxed text-secondary">{pendingHumanTurn.summary}</p> : null}
            {pendingHumanTurn.question ? <p className="mt-1 mb-0 text-[12.5px] font-medium leading-relaxed text-primary">{pendingHumanTurn.question}</p> : null}

            {pendingHumanTurn.plan && pendingHumanTurn.plan.length > 0 ? (
              <ul className="mt-2 mb-0 pl-4 space-y-1 text-secondary">
                {pendingHumanTurn.plan.map((item) => (
                  <li key={item.id} className={item.status === 'completed' ? 'line-through text-muted' : item.status === 'in_progress' ? 'font-medium text-primary' : ''}>
                    {item.title}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <input
                value={humanTurnDraft}
                onChange={(event) => setHumanTurnDraft(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (pendingHumanTurn.kind === 'ask_user') {
                       onHumanRespond?.('answer', humanTurnDraft);
                    } else {
                       onHumanRespond?.('revise', humanTurnDraft);
                    }
                    setHumanTurnDraft('');
                  }
                }}
                placeholder={pendingHumanTurn.kind === 'ask_user' ? "Type your answer..." : "Revision note (optional)"}
                className="min-w-0 flex-1 rounded-md border border-primary/40 bg-primary px-2 py-1 text-[12px] text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (pendingHumanTurn.kind === 'ask_user') {
                     onHumanRespond?.('answer', humanTurnDraft);
                  } else {
                     onHumanRespond?.('revise', humanTurnDraft);
                  }
                  setHumanTurnDraft('');
                }}
                disabled={pendingHumanTurn.kind === 'ask_user' && !humanTurnDraft.trim()}
                className="shrink-0 rounded-md border border-primary/50 px-2.5 py-1 text-[12px] text-secondary hover:text-primary cursor-pointer disabled:opacity-50"
              >
                {pendingHumanTurn.kind === 'ask_user' ? 'Answer' : 'Revise'}
              </button>
            </div>
          </div>
        ) : null}

        {/* Textarea Placeholder: "Write a message..." */}
        <textarea
          data-composer
          aria-label="Message composer"
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Write a message..."
          rows={1}
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
              className={`p-1 text-primary hover:text-primary transition-colors focus:outline-none cursor-pointer ${
                isRecording ? 'text-primary animate-pulse' : ''
              }`}
              title="Voice Input"
            >
              <IconMicrophone className={TOOLBAR_ICON} />
            </button>

            {/* Send / Stop Action Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1E3A8A] bg-[#1E3A8A] shadow-2xs hover:bg-[#1e40af] cursor-pointer transition-colors"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <div className="size-2.5 rounded-[2px] bg-white shadow-xs" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!prompt.trim() && attachments.length === 0) || quotaBlocksSend}
                className={`flex h-7 w-7 items-center justify-center rounded-md shadow-2xs transition-colors ${
                   (prompt.trim() || attachments.length > 0) && !quotaBlocksSend
                    ? 'bg-[#1E3A8A] hover:bg-[#1e40af] text-white cursor-pointer'
                    : 'bg-[#1E3A8A]/35 text-white/50 cursor-not-allowed'
                }`}
                title="Send"
                aria-label="Send message"
              >
                <IconArrowRight className={`${TOOLBAR_ICON} -rotate-90`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {quotaBlocksSend ? (
        <div role="status" aria-live="polite" className="mt-1.5 h-4 text-center text-[11px] leading-4 font-sans pointer-events-auto">
          {quota === null ? (
            <span className="text-muted animate-pulse">checking inquiry budget...</span>
          ) : quota?.unavailable ? (
            <span className="text-muted">can't verify budget — try again later.</span>
          ) : (
            <span className="text-secondary">
              daily limit reached.{' '}
              <button
                type="button"
                onClick={() => app?.addWindow?.({ path: '/pricing' })}
                className="underline hover:text-primary transition-colors cursor-pointer"
              >
                Study
              </button>{' '}
              to keep going.
            </span>
          )}
        </div>
      ) : (
        <p className="mt-1.5 h-4 text-center text-[10px] leading-4 text-muted font-sans pointer-events-auto">
          WIMBot can make mistakes. please double-check responses.
        </p>
      )}
    </div>
  );
};