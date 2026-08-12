import React, { useState, useRef, useEffect } from 'react';
import { LemonSelect } from '../../../notebook-app/lib/lemon-ui/LemonSelect/LemonSelect';
import { ThinkingBudget, StylePresetId, FileAttachment, ModelId, ModelOption } from '../types';
import {
  Plus,
  Mic,
  MicOff,
  Square,
  X,
  FileText,
  Image as ImageIcon,
  ArrowDown,
  Brain,
  ChevronDown,
  Sparkles,
  Check,
  Zap,
  ArrowUp,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (prompt: string, attachments: FileAttachment[]) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  thinkingBudget: ThinkingBudget;
  onChangeThinkingBudget: (budget: ThinkingBudget) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  selectedStylePreset: StylePresetId;
  onChangeStylePreset: (preset: StylePresetId) => void;
  onScrollToBottom?: () => void;
  showScrollToBottom?: boolean;
  models?: any[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  thinkingBudget,
  onChangeThinkingBudget,
  webSearchEnabled,
  onToggleWebSearch,
  onScrollToBottom,
  showScrollToBottom = true,
  models = [],
  selectedModelId = 'nietzsche',
  onSelectModel,
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showThinkingPopover, setShowThinkingPopover] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowThinkingPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const newAttachment: FileAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        type: isImage ? 'image' : 'text',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        url: isImage ? URL.createObjectURL(file) : undefined,
      };

      setAttachments((prev) => [...prev, newAttachment]);
    });

    e.target.value = '';
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tarayıcınız ses tanıma özelliğini desteklemiyor.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
      } catch (err) {
        console.error(err);
        setIsRecording(false);
      }
    }
  };

  const budgetLabel =
    thinkingBudget === 'extended' ? 'Extended' : thinkingBudget === 'balanced' ? 'Medium' : 'Fast';

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pointer-events-none">
      {/* Scroll to bottom button floating arrow ↓ */}
      {showScrollToBottom && (
        <div className="flex justify-center mb-2 pointer-events-auto">
          <button
            onClick={onScrollToBottom}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-primary shadow-sm text-secondary hover:bg-bg-primary active:scale-95 transition-all cursor-pointer"
            title="Aşağı in"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floating Capsule Input Box (Exact 1:1 Extracted CDS Match) */}
      <div className="pointer-events-auto relative rounded-[20px] border border-primary bg-white p-3 sm:p-3.5 shadow-xs hover:border-primary focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A] transition-all duration-200">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-primary">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-xl border border-primary bg-bg-primary px-2.5 py-1 text-xs text-secondary"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="h-3.5 w-3.5 text-amber-700" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-secondary" />
                )}
                <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="text-muted hover:text-secondary"
                >
                  <X className="h-3.5 w-3.5" />
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
          className="w-full resize-none border-none bg-transparent px-1 pt-0 text-[15px] sm:text-base text-primary placeholder:text-muted focus:outline-none focus:ring-0 max-h-[160px] leading-relaxed font-sans"
        />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        {/* Bottom Toolbar Row (Exact Screenshot 1:1 Layout) */}
        <div className="mt-2.5 flex items-center justify-between gap-2 pt-0.5">
          {/* Left Side: + Icon & Bot Selector */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
            {/* (+) Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-primary hover:text-primary transition-colors focus:outline-none cursor-pointer shrink-0"
              title="Add attachment"
            >
              <Plus className="h-5 w-5 stroke-[1.8]" />
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
                  <span className="inline-flex items-center gap-1.5 text-[14px] sm:text-[15px] font-sans text-primary hover:opacity-80 transition-opacity whitespace-nowrap min-w-0">
                    <div className="size-4.5 rounded-full overflow-hidden bg-accent shrink-0 border border-primary/40 flex items-center justify-center font-bold text-white text-[8px]">
                      {activeModel?.avatarUrl ? (
                        <img src={activeModel.avatarUrl} alt={activeModel.name} className="size-full object-cover" />
                      ) : (
                        <span className={`size-full flex items-center justify-center ${activeModel?.avatarBg || 'bg-[#1E3A8A]'}`}>
                          {activeModel?.initials || activeModel?.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-primary tracking-tight truncate max-w-[100px] xs:max-w-[160px] sm:max-w-none">{activeModel?.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted stroke-[2] ml-0.5 shrink-0 inline-block" />
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
                        <div className="size-5 rounded-full overflow-hidden bg-accent shrink-0 border border-primary/40 flex items-center justify-center font-bold text-white text-[9px]">
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
              size="small"
              type="tertiary"
              dropdownPlacement="bottom-start"
              dropdownMatchSelectWidth={false}
              className="border-none bg-transparent p-0 text-primary relative z-30 [&_.LemonButton]:border-none [&_.LemonButton]:bg-transparent [&_.LemonButton]:shadow-none [&_.LemonButton]:p-0 [&_.LemonButton\_\_side-icon]:size-3.5 [&_.LemonButton\_\_side-icon_svg]:size-3.5 [&_.LemonButton\_\_side-icon_svg]:shrink-0 [&_svg]:max-w-[14px] [&_svg]:max-h-[14px]"
            />
          </div>



          {/* Right Side Controls: Mic | Dynamic Send/Stop Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-1 text-primary hover:text-primary transition-colors focus:outline-none cursor-pointer ${
                isRecording ? 'text-rose-600 animate-pulse' : ''
              }`}
              title="Voice Input"
            >
              {isRecording ? <MicOff className="h-5 w-5 stroke-[1.8]" /> : <Mic className="h-5 w-5 stroke-[1.8]" />}
            </button>

            {/* Send / Stop Action Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary bg-white text-primary shadow-2xs hover:bg-accent active:scale-95 cursor-pointer"
                title="Yanıtı Durdur"
              >
                <div className="h-3.5 w-3.5 rounded-[2px] bg-stone-900" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!prompt.trim() && attachments.length === 0}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white transition-all active:scale-95 shadow-2xs cursor-pointer ${
                  prompt.trim() || attachments.length > 0
                    ? 'bg-[#1E3A8A] hover:bg-[#1e40af]'
                    : 'bg-[#93C5FD] hover:bg-[#60A5FA]'
                }`}
                title="Gönder"
              >
                <ArrowUp className="h-5 w-5 stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer Text below input capsule (Exact Screenshot match) */}
      <p className="mt-2 text-center text-[11px] text-muted font-sans pointer-events-auto">
        wim's ai bots can make mistakes. please double-check responses.
      </p>
    </div>
  );
};
