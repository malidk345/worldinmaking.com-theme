import React, { useState, useEffect } from 'react';
import { Message, Artifact, ModelOption, OSActionCard as OSActionCardType } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { Copy, Check, ThumbsUp, ThumbsDown, ExternalLink, Play, Square, Edit2, ArrowDownToLine } from 'lucide-react';
import { OSActionCard } from '../../../notebook-app/scenes/notebooks/AskAI/components/OSActionCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface ChatMessageProps {
  message: Message;
  modelOptions: ModelOption[];
  targetChatId: string;
  onOpenArtifact?: (art: Artifact) => void;
  onEditPrompt?: (content: string) => void;
  onRetry?: () => void;
  onUpdateMessage?: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  onExecuteOSAction?: (msgId: string, action: OSActionCardType) => void;
  typewriterSpeed?: 'slow' | 'smooth' | 'fast' | 'off';
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onOpenArtifact,
  onEditPrompt,
  onExecuteOSAction,
  typewriterSpeed = 'smooth',
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(message.liked ?? null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Typewriter effect state
  const isHistorical = useRef(message.isTypingDone).current;
  const isDirectDisplay = isUser || isHistorical || typewriterSpeed === 'off';
  const [animatedText, setAnimatedText] = useState(isDirectDisplay ? message.content : '');
  const [isTyping, setIsTyping] = useState(!isDirectDisplay);
  const currentIndexRef = useRef(isDirectDisplay ? message.content.length : 0);
  const contentRef = useRef(message.content);

  useEffect(() => {
    contentRef.current = message.content;
  }, [message.content]);

  const displayedText = isDirectDisplay ? message.content : animatedText;

  useEffect(() => {
    if (isDirectDisplay) {
      if (isTyping) setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const speedMs = typewriterSpeed === 'slow' ? 35 : typewriterSpeed === 'fast' ? 8 : 18;

    const interval = setInterval(() => {
      const fullText = contentRef.current;
      if (currentIndexRef.current >= fullText.length) {
        if (message.isTypingDone) {
          setAnimatedText(fullText);
          setIsTyping(false);
          clearInterval(interval);
        }
      } else {
        const distance = fullText.length - currentIndexRef.current;
        const step = Math.max(1, distance > 200 ? 8 : distance > 50 ? 3 : 1);
        currentIndexRef.current += step;
        if (currentIndexRef.current > fullText.length) currentIndexRef.current = fullText.length;
        setAnimatedText(fullText.slice(0, currentIndexRef.current));
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [message.isTypingDone, isDirectDisplay, typewriterSpeed]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = 'tr-TR';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="py-4 px-4 sm:px-8 max-w-3xl mx-auto">
      {/* USER MESSAGE: Rounded White Capsule Bubble with Action Icons on the Left */}
      {isUser ? (
        <div className="flex flex-row items-end justify-end group gap-2">
          {/* Action Icons LEFT of User Message (Visible on Hover) */}
          <div className="flex items-center gap-1 text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity mb-1">
            {onEditPrompt && (
              <button
                onClick={() => onEditPrompt(message.content)}
                className="p-1.5 hover:text-primary hover:bg-light-3 rounded-md transition-colors cursor-pointer"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-1.5 hover:text-primary hover:bg-light-3 rounded-md transition-colors cursor-pointer"
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="relative max-w-[85%] rounded-[18px] bg-white border border-primary px-4 py-3 text-primary text-[14.5px] leading-relaxed font-claude-sans shadow-2xs hover:bg-white transition-colors">
            <p className="whitespace-pre-wrap break-words m-0 p-0">{message.content.trim()}</p>
          </div>
        </div>
      ) : (
        /* ASSISTANT MESSAGE: Full width text in Anthropic Serif font */
        <div className="space-y-3 text-primary">
          {/* Thinking Process Accordion / Header */}
          <div className="flex items-center justify-between">
            <ThinkingBlock
              thinking={
                message.thinkingProcess || {
                  summary: '',
                  durationSeconds: 0,
                  tokenCount: 0,
                  steps: [],
                  source: 'none',
                }
              }
              isLive={message.isStreaming}
            />
          </div>

          {/* Response Text with High Quality Editorial Anthropic Serif Font */}
          <div className="font-claude-serif text-[15px] sm:text-[15.5px] leading-[1.6] text-primary claude-prose max-w-none tracking-[0.01em]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
               rehypePlugins={[rehypeSanitize]}
              components={{
                p: ({ children }: any) => (
                  <div className="mb-2.5 leading-[1.55rem] break-words">{children}</div>
                ),
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="my-3 rounded-xl border border-stone-800 bg-stone-950 overflow-hidden text-stone-100 text-xs font-sans">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900 border-b border-stone-800 text-[11px] text-stone-400 font-mono">
                        <span>{match[1]}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                          className="flex items-center gap-1 hover:text-stone-200 transition-colors"
                        >
                          <Copy className="h-3 w-3" /> Kopyala
                        </button>
                      </div>
                      <pre className="p-3 overflow-x-auto font-mono text-xs">{children}</pre>
                    </div>
                  ) : (
                    <code className="bg-light-3 text-primary border border-primary px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {displayedText}
            </ReactMarkdown>

            {/* Typewriter cursor indicator */}
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-1 bg-[#1E3A8A] animate-pulse align-middle" />
            )}
          </div>

          {/* Web Search Citation Badges */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-2 border-t border-primary space-y-1.5 font-sans">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Kaynaklar ({message.citations.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((c) => {
                  const href = safeExternalUrl(c.url);
                  return href ? (
                    <a
                      key={c.id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-2.5 py-1 text-xs text-primary hover:border-amber-500 transition-all"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-secondary">
                        {c.id}
                      </span>
                      <span className="max-w-[200px] truncate font-medium">{c.title}</span>
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Document / Artifact Card */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-3.5 space-y-2.5 font-claude-sans">
              {message.artifacts.map((art) => (
                <div
                  key={art.id}
                  onClick={() => onOpenArtifact && onOpenArtifact(art)}
                  className="group/artifact-block relative flex items-center justify-between text-left rounded-lg overflow-hidden border border-primary bg-accent hover:bg-white hover:border-primary px-4 py-3 w-full transition-all duration-300 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-16">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="text-[14px] font-semibold text-primary truncate leading-tight">
                        {art.title}
                      </div>
                      <div className="text-[12px] text-muted truncate flex items-center gap-1.5">
                        <span>{art.description || 'Document'}</span>
                        <span className="opacity-40">•</span>
                        <span className="uppercase font-mono text-[11px]">{art.language || art.type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rotated 3D Paper Preview Graphic (1:1 Extracted from Claude HTML) */}
                  <div className="flex items-end w-[68px] relative shrink-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-[52px] h-[68px] rounded-t-lg border border-primary bg-white shadow-xs scale-[1] group-hover/artifact-block:scale-[1.04] -rotate-[0.1rad] group-hover/artifact-block:-rotate-[0.065rad] transition-transform duration-300 ease-out pt-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" className="text-muted">
                        <path d="M212.24,83.76l-56-56A6,6,0,0,0,152,26H56A14,14,0,0,0,42,40V216a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V88A6,6,0,0,0,212.24,83.76ZM158,46.48,193.52,82H158ZM200,218H56a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2h90V88a6,6,0,0,0,6,6h50V216A2,2,0,0,1,200,218Zm-34-82a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h64A6,6,0,0,1,166,136Zm0,32a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h64A6,6,0,0,1,166,168Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* OS Action Card */}
          {message.osAction && (
            <OSActionCard
              action={message.osAction}
              onExecute={() => onExecuteOSAction?.(message.id, message.osAction!)}
            />
          )}

          {/* Action Icons Row matching Claude: Copy, Play, Thumbs Up, Thumbs Down */}
          <div className="pt-2 flex items-center gap-3 text-muted font-sans">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-primary transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Metni Kopyala"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>

            {!isUser && !message.isStreaming && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('wimNotebookInsertText', {
                      detail: { text: message.content, mode: 'append' },
                    })
                  )
                }}
                className="p-1 hover:text-primary transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Not Defterine Ekle (Insert)"
              >
                <ArrowDownToLine className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={handleSpeak}
              className={`p-1 hover:text-primary transition-colors text-xs cursor-pointer ${
                isSpeaking ? 'text-amber-600' : ''
              }`}
              title="Sesli Oynat"
            >
              {isSpeaking ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setLiked(liked === true ? null : true)}
              className={`p-1 hover:text-primary transition-colors cursor-pointer ${
                liked === true ? 'text-emerald-600' : ''
              }`}
              title="Beğendim"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>

            <button
              onClick={() => setLiked(liked === false ? null : false)}
              className={`p-1 hover:text-primary transition-colors cursor-pointer ${
                liked === false ? 'text-rose-600' : ''
              }`}
              title="Beğenmedim"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
