import React, { useState, useEffect, useRef } from 'react';
import { Message, Artifact, ModelOption, OSActionCard as OSActionCardType } from '../types';
import { getRenderer } from '../../../lib/artifacts'
import { ThinkingBlock } from './ThinkingBlock';
import { Copy, Check, ThumbsUp, ThumbsDown, Play, Square, Edit2, RotateCcw, FileInput } from 'lucide-react';
import { SourceFavicon } from './SourceFavicon';
import { OSActionCard } from '../../../notebook-app/scenes/notebooks/AskAI/components/OSActionCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ChatMessageProps {
  message: Message;
  modelOptions: ModelOption[];
  targetChatId: string;
  onOpenArtifact?: (art: Artifact, origin?: DOMRect) => void;
  onOpenSources?: (citations: Message['citations'], origin?: DOMRect) => void;
  onEditPrompt?: (content: string, messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onFeedback?: (messageId: string, liked: boolean | null) => void;
  onUpdateMessage?: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  onExecuteOSAction?: (msgId: string, action: OSActionCardType) => void;
  onAddToNotebook?: (message: Message) => void;
  typewriterSpeed?: 'slow' | 'smooth' | 'fast' | 'off';
}

function detectSpeechLang(text: string): 'tr-TR' | 'en-US' {
  const sample = text.slice(0, 800)
  const turkishChars = (sample.match(/[çğıöşüÇĞİÖŞÜ]/g) || []).length
  if (turkishChars >= 2) return 'tr-TR'
  const turkishWords = (sample.match(/\b(ve|bir|bu|için|ile|ama|çok|daha|gibi|olarak|değil|nedir|var|yok)\b/gi) || []).length
  const englishWords = (sample.match(/\b(the|and|for|with|this|that|from|have|not|what|is|are)\b/gi) || []).length
  if (englishWords > turkishWords) return 'en-US'
  return turkishChars > 0 ? 'tr-TR' : 'en-US'
}

function textForSpeech(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ChatMessageCodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl border border-stone-800 bg-stone-950 overflow-hidden text-stone-100 text-xs font-sans shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900 border-b border-stone-800 text-[11px] text-stone-400 font-mono">
        <span className="font-semibold text-stone-300">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-0.5 rounded ${
            copied ? 'text-emerald-400 font-semibold bg-emerald-950/40' : 'hover:text-stone-200'
          }`}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Copied ✓</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed">{code}</pre>
    </div>
  );
}

function artifactCardMeta(art: Artifact): string {
  const kind = getRenderer(art.type).label.replace(/^\w/, (c) => c.toUpperCase());
  return art.version > 1 ? `${kind} · v${art.version}` : kind;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.slice(0, 2)))
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  modelOptions,
  onOpenArtifact,
  onOpenSources,
  onEditPrompt,
  onRetry,
  onFeedback,
  onExecuteOSAction,
  onAddToNotebook,
  typewriterSpeed = 'smooth',
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [addedToNotebook, setAddedToNotebook] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(message.liked ?? null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const displayedText = message.content;
  const isLiveAnswer = !isUser && !!message.isStreaming;

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
      return
    }

    const spoken = textForSpeech(message.content)
    if (!spoken) return
    const lang = detectSpeechLang(spoken)
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = lang;
    const voice = pickVoice(lang)
    if (voice) utterance.voice = voice
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="py-2.5 sm:py-3 px-4 sm:px-8 max-w-3xl mx-auto">
      {/* USER MESSAGE: Compact Bubble with Action Icons Underneath */}
      {isUser ? (
        <div className="flex flex-col items-end group">
          <div className="relative w-fit max-w-[85%] rounded-2xl bg-primary/90 backdrop-blur-md border border-primary/60 px-4 py-2 text-primary text-[14px] sm:text-[15px] leading-[1.45] font-sans shadow-sm transition-transform duration-150 active:scale-[0.98] [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.12)]">
            <p className="whitespace-pre-wrap break-words m-0 p-0">{message.content.trim()}</p>
          </div>

          {/* Action Icons Underneath User Message */}
          <div className="flex items-center gap-2 pt-1 text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {onEditPrompt && (
              <button
                onClick={() => onEditPrompt(message.content, message.id)}
                className="p-0.5 hover:text-primary transition-colors cursor-pointer"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-0.5 hover:text-primary transition-colors cursor-pointer"
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        /* ASSISTANT MESSAGE: philosopher header with thinking on the same row, full-width reply */
        <div className="space-y-2 text-primary">
          <div className="w-full min-w-0">
            <ThinkingBlock
              model={
                modelOptions.find((option) => option.id === message.modelUsed) ||
                modelOptions[0]
              }
              timestamp={message.timestamp}
              thinking={
                message.thinkingProcess || {
                  summary: '',
                  durationSeconds: 0,
                  tokenCount: 0,
                  steps: [],
                  source: 'none',
                }
              }
              toolTrace={message.toolTrace}
              isLive={!!message.isStreaming}
            />
          </div>

          {/* Response Text with Community matching font and sizing */}
          <div
            className="font-sans text-[15px] leading-[1.5] text-primary markdown prose dark:prose-invert prose-sm max-w-none [&_p]:leading-[1.5] [&_p]:mb-2.5 [&_li]:leading-[1.5] [&_a]:font-semibold break-words [overflow-wrap:anywhere]"
          >
            {displayedText ? (
              <>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }: any) => (
                      <p className="mb-2.5 last:mb-0 leading-[1.5] break-words">{children}</p>
                    ),
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');
                      return !inline && match ? (
                        <ChatMessageCodeBlock language={match[1]} code={codeContent} />
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
                {isLiveAnswer && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-4 ml-1 -mb-0.5 bg-primary/70 dark:bg-primary/90 animate-pulse rounded-xs"
                  />
                )}
              </>
            ) : null}
          </div>

          {/* Document / Artifact Card */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-3.5 space-y-2 font-sans">
              {message.artifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={(event) => onOpenArtifact?.(art, event.currentTarget.getBoundingClientRect())}
                  className="group/artifact-block relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-primary/70 bg-primary/80 backdrop-blur-md px-4 py-3 text-left transition-all duration-200 hover:bg-accent hover:border-primary active:scale-[0.99] [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.1)] cursor-pointer"
                >
                  <div className="min-w-0 pr-16">
                    <div className="truncate text-[14px] font-medium leading-tight text-primary">
                      {art.title}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-secondary">
                      {artifactCardMeta(art)}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute right-3 top-1/2 flex h-[58px] w-[44px] -translate-y-1/2 -rotate-[8deg] items-center justify-center rounded-t-md border border-primary bg-primary shadow-sm transition-transform group-hover/artifact-block:-rotate-[5deg]" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" className="text-secondary">
                      <path d="M212.24,83.76l-56-56A6,6,0,0,0,152,26H56A14,14,0,0,0,42,40V216a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V88A6,6,0,0,0,212.24,83.76ZM158,46.48,193.52,82H158ZM200,218H56a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2h90V88a6,6,0,0,0,6,6h50V216A2,2,0,0,1,200,218Z" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {message.osAction && !message.osAction.executed ? (
            <OSActionCard
              action={message.osAction}
              onExecute={() => onExecuteOSAction?.(message.id, message.osAction!)}
            />
          ) : null}

          {/* Action Icons Row matching Claude: Copy, Play, Thumbs Up, Thumbs Down */}
          {message.stopped ? (
            <p className="m-0 pt-1 text-[12px] text-muted">Stopped</p>
          ) : null}

          {!isLiveAnswer && (message.isTypingDone || message.stopped) && (
            <div className="pt-1 flex items-center gap-0.5 text-muted font-sans">
              <button
                onClick={handleCopy}
                className="p-0.5 hover:text-primary transition-colors cursor-pointer"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {onAddToNotebook && (message.content.trim() || (message.artifacts && message.artifacts.length > 0)) && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToNotebook(message)
                    setAddedToNotebook(true)
                    setTimeout(() => setAddedToNotebook(false), 2000)
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 text-[12px] rounded transition-all cursor-pointer ${
                    addedToNotebook ? 'text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40' : 'hover:text-primary'
                  }`}
                  title="Add to notebook"
                >
                  {addedToNotebook ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Added ✓</span>
                    </>
                  ) : (
                    <>
                      <FileInput className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleSpeak}
                className={`p-0.5 hover:text-primary transition-colors cursor-pointer ${
                  isSpeaking ? 'text-amber-600' : ''
                }`}
                title="Read aloud"
              >
                {isSpeaking ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5" />}
              </button>

              {onRetry && (
                <button
                  onClick={() => onRetry(message.id)}
                  className="p-0.5 hover:text-primary transition-colors cursor-pointer"
                  title="Retry"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                onClick={() => {
                  const next = liked === true ? null : true
                  setLiked(next)
                  onFeedback?.(message.id, next)
                }}
                className={`p-0.5 hover:text-primary transition-colors cursor-pointer ${
                  liked === true ? 'text-emerald-600' : ''
                }`}
                title="Good response"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => {
                  const next = liked === false ? null : false
                  setLiked(next)
                  onFeedback?.(message.id, next)
                }}
                className={`p-0.5 hover:text-primary transition-colors cursor-pointer ${
                  liked === false ? 'text-rose-600' : ''
                }`}
                title="Bad response"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>

              {message.citations && message.citations.length > 0 && (
                <button
                  type="button"
                  onClick={(event) => onOpenSources?.(message.citations, event.currentTarget.getBoundingClientRect())}
                  className="ml-1.5 flex items-center cursor-pointer"
                  title={`${message.citations.length} ${message.citations.length === 1 ? 'source' : 'sources'}`}
                  aria-label={`${message.citations.length} ${message.citations.length === 1 ? 'source' : 'sources'}`}
                >
                  <span className="flex items-center">
                    {message.citations.slice(0, 4).map((citation, index) => (
                      <span
                        key={citation.id}
                        className="relative inline-flex rounded-full ring-2 ring-white"
                        style={{ marginLeft: index === 0 ? 0 : -7, zIndex: 10 - index }}
                      >
                        <SourceFavicon citation={citation} size={18} />
                      </span>
                    ))}
                  </span>
                  {message.citations.length > 4 ? (
                    <span className="ml-1 text-[10px] text-[#8a8a8a]">+{message.citations.length - 4}</span>
                  ) : null}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ChatMessage = React.memo(ChatMessageComponent, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.message.isTypingDone === next.message.isTypingDone &&
    prev.message.stopped === next.message.stopped &&
    prev.message.liked === next.message.liked &&
    prev.message.modelUsed === next.message.modelUsed &&
    prev.message.thinkingProcess === next.message.thinkingProcess &&
    prev.message.toolTrace === next.message.toolTrace &&
    prev.message.artifacts === next.message.artifacts &&
    prev.message.citations === next.message.citations &&
    prev.message.osAction === next.message.osAction
  );
});
