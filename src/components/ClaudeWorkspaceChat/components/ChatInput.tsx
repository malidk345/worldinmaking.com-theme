import React, { useState, useRef, useEffect } from 'react';
import { LemonSelect } from '../../../notebook-app/lib/lemon-ui/LemonSelect/LemonSelect';
import { StylePresetId, FileAttachment, ModelId, ModelOption } from '../types';
import {
  IconPlus,
  IconMicrophone,
  IconX,
  IconDocument,
  IconImage,
  IconChevronDown,
  IconArrowRight,
} from '@posthog/icons';

const TOOLBAR_ICON = 'size-4 shrink-0'
const CHIP_ICON = 'size-3.5 shrink-0'

const SLASH_COMMANDS = [
  { id: 'table', label: '/table', hint: 'Comparison table', insert: 'Make a clear comparison table of ' },
  { id: 'diagram', label: '/diagram', hint: 'Mermaid diagram', insert: 'Draw a mermaid diagram of ' },
  { id: 'notebook', label: '/notebook', hint: 'Notebook-ready draft', insert: 'Write a notebook-ready draft about ' },
] as const

interface ChatInputProps {
  onSendMessage: (prompt: string, attachments: FileAttachment[]) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  selectedStylePreset: StylePresetId;
  onChangeStylePreset: (preset: StylePresetId) => void;
  onScrollToBottom?: () => void;
  showScrollToBottom?: boolean;
  models?: any[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  draftPrompt?: string;
  draftNonce?: number;
  menuPlacement?: 'top-start' | 'bottom-start';
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
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

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
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 24), 160)}px`
    }
    setSlashIndex(0)
  }, [prompt]);

  const slashQuery = prompt.startsWith('/') ? prompt.slice(1).split(/\s/)[0].toLowerCase() : ''
  const slashMatches = prompt.startsWith('/') && !prompt.includes(' ')
    ? SLASH_COMMANDS.filter((command) => command.id.startsWith(slashQuery))
    : []

  const applySlashCommand = (insert: string) => {
    setPrompt(insert)
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
        applySlashCommand(slashMatches[slashIndex]?.insert || slashMatches[0].insert)
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

  const handleSubmit = () => {
    if ((!prompt.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(prompt.trim(), attachments);
    setPrompt('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
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
          setAttachments((prev) => [...prev, { id, name: file.name, type, size: sizeStr, url: dataUrl, content: dataUrl }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const textContent = reader.result as string;
          setAttachments((prev) => [...prev, { id, name: file.name, type, size: sizeStr, content: textContent, contentPreview: textContent.slice(0, 200) }]);
        };
        reader.readAsText(file);
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

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch (_) {}
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
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
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary border border-primary shadow-sm text-secondary hover:bg-accent cursor-pointer"
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
        className={`pointer-events-auto relative rounded-md border bg-primary px-2.5 py-1.5 transition-all duration-200 ${
          isDragging
            ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A]/35 shadow-[0_0_18px_rgba(30,58,138,0.25)] bg-accent'
            : prompt.trim().length > 0
            ? 'border-[#1E3A8A] ring-1 ring-[#1E3A8A]/35 shadow-[0_0_15px_rgba(30,58,138,0.2)] focus-within:ring-2 focus-within:ring-[#1E3A8A]/40 focus-within:shadow-[0_0_20px_rgba(30,58,138,0.28)]'
            : 'border-primary shadow-[0_0_10px_rgba(0,0,0,0.03)] hover:border-[#1E3A8A]/50 hover:shadow-[0_0_12px_rgba(30,58,138,0.12)] focus-within:border-[#1E3A8A] focus-within:ring-2 focus-within:ring-[#1E3A8A]/25 focus-within:shadow-[0_0_18px_rgba(30,58,138,0.22)]'
        }`}
      >
        {slashMatches.length > 0 && (
          <div className="absolute inset-x-0 bottom-full z-20 mb-1.5 overflow-hidden rounded-md border border-primary bg-primary py-0.5 shadow-sm">
            {slashMatches.map((command, index) => (
              <button
                key={command.id}
                type="button"
                onClick={() => applySlashCommand(command.insert)}
                className={`flex w-full items-center justify-between px-2.5 py-1 text-left text-[12px] cursor-pointer ${
                  index === slashIndex ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                <span className="font-medium text-primary">{command.label}</span>
                <span className="text-[11px] text-secondary">{command.hint}</span>
              </button>
            ))}
          </div>
        )}
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5 pb-1.5 border-b border-primary">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 rounded-md border border-primary bg-accent px-2 py-0.5 text-[11px] text-secondary"
              >
                {att.type === 'image' ? (
                  <IconImage className={`${CHIP_ICON} text-amber-700`} />
                ) : (
                  <IconDocument className={`${CHIP_ICON} text-secondary`} />
                )}
                <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="text-muted hover:text-secondary"
                >
                  <IconX className={CHIP_ICON} />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Textarea Placeholder: "Write a message..." */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          className="w-full resize-none overflow-y-auto border-none bg-transparent px-1 py-0 text-[15px] text-primary placeholder:text-muted focus:outline-none focus:ring-0 min-h-[24px] max-h-[160px] leading-[1.5] font-sans"
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
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 overflow-hidden">
            {/* (+) Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-primary hover:text-primary transition-colors focus:outline-none cursor-pointer shrink-0"
              title="Add attachment"
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
                        <img src={activeModel.avatarUrl} alt={activeModel.name} className="size-full object-cover" />
                      ) : (
                        <span className={`size-full flex items-center justify-center ${activeModel?.avatarBg || 'bg-[#1E3A8A]'}`}>
                          {activeModel?.initials || activeModel?.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-primary tracking-tight truncate max-w-[100px] xs:max-w-[160px] sm:max-w-none">{activeModel?.name}</span>
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
                      <span className="flex items-center gap-2 font-medium text-xs">
                        <div className="size-4 rounded-full overflow-hidden bg-accent shrink-0 border border-primary/40 flex items-center justify-center font-bold text-white text-[8px]">
                          {opt.avatarUrl ? (
                            <img src={opt.avatarUrl} alt={opt.name} className="size-full object-cover" />
                          ) : (
                            <span className={`size-full flex items-center justify-center ${opt.avatarBg || 'bg-[#1E3A8A]'}`}>
                              {opt.initials || opt.name.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className="truncate">{opt.name}</span>
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
                isRecording ? 'text-rose-600 animate-pulse' : ''
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
                className="flex h-7 w-7 items-center justify-center rounded-md border border-primary bg-primary text-primary shadow-2xs hover:bg-accent cursor-pointer"
                title="Stop"
              >
                <div className="size-2.5 rounded-[2px] bg-primary text-primary" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!prompt.trim() && attachments.length === 0}
                className={`flex h-7 w-7 items-center justify-center rounded-md shadow-2xs ${
                  prompt.trim() || attachments.length > 0
                    ? 'bg-[#1E3A8A] hover:bg-[#1e40af] text-white cursor-pointer'
                    : 'bg-[#1E3A8A]/35 text-white/50 cursor-not-allowed'
                }`}
                title="Send"
              >
                <IconArrowRight className={`${TOOLBAR_ICON} -rotate-90`} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-1.5 h-4 text-center text-[10px] leading-4 text-muted font-sans pointer-events-auto">
        wim's ai bots can make mistakes. please double-check responses.
      </p>
    </div>
  );
};
