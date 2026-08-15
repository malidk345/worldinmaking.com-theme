import React, { useState, useEffect, useRef } from 'react';
import { Message, Artifact, ModelOption, OSActionCard as OSActionCardType } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { Copy, Check, ThumbsUp, ThumbsDown, Play, Square, Edit2, RotateCcw, FileInput } from 'lucide-react';
import { SourceFavicon } from './SourceFavicon';
import { OSActionCard } from '../../../notebook-app/scenes/notebooks/AskAI/components/OSActionCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

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

function artifactCardMeta(art: Artifact): string {
  const kinds: Record<Artifact['type'], string> = {
    table: 'Table',
    chart: 'Chart',
    react: 'Component',
    html: 'HTML',
    svg: 'SVG',
    mermaid: 'Diagram',
    markdown: 'Document',
    json: 'JSON',
    code: 'Code',
  }
  const kind = kinds[art.type] || 'Document'
  return art.version > 1 ? `${kind} · v${art.version}` : kind
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined
  const voices = window.speechSynthesis.getVoices()
  const prefix = lang.toLowerCase().slice(0, 2)
  return (
    voices.find((voice) => voice.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix))
  )
}

function philosopherSurname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts[parts.length - 1] || name
}

function PhilosopherMark({ model }: { model?: ModelOption }) {
  if (!model) return null
  const surname = philosopherSurname(model.name)
  return (
    <div className="flex items-center gap-1.5" title={model.name}>
      <span className="inline-flex size-[18px] shrink-0 overflow-hidden rounded-full border border-[#e8e8e8] bg-[#ececec]">
        {model.avatarUrl ? (
          <img src={model.avatarUrl} alt="" className="size-full object-cover object-top" />
        ) : (
          <span className={`flex size-full items-center justify-center text-[7px] font-semibold text-white ${model.avatarBg || 'bg-[#1E3A8A]'}`}>
            {model.initials || surname.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="text-[12.5px] font-medium leading-none text-[#6a6a6a]">{surname}</span>
    </div>
  )
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
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
  const [liked, setLiked] = useState<boolean | null>(message.liked ?? null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const skipPace = useRef(isUser || !!message.isTypingDone || typewriterSpeed === 'off').current
  const contentRef = useRef(message.content)
  const revealedRef = useRef(skipPace ? message.content : '')
  const [revealed, setRevealed] = useState(skipPace ? message.content : '')

  useEffect(() => {
    contentRef.current = message.content
  }, [message.content])

  useEffect(() => {
    if (skipPace || typewriterSpeed === 'off') {
      revealedRef.current = message.content
      setRevealed(message.content)
      return
    }

    const tickMs = typewriterSpeed === 'slow' ? 58 : typewriterSpeed === 'fast' ? 28 : 46
    const stepChars = typewriterSpeed === 'slow' ? 1 : typewriterSpeed === 'fast' ? 3 : 2

    const timer = window.setInterval(() => {
      const target = contentRef.current
      const prev = revealedRef.current
      if (prev.length >= target.length) {
        if (message.isTypingDone && prev !== target) {
          revealedRef.current = target
          setRevealed(target)
        }
        return
      }

      let next = Math.min(prev.length + stepChars, target.length)
      const remainder = target.slice(next)
      const wordEnd = remainder.search(/[\s.,;:!?]/)
      if (wordEnd > 0 && wordEnd < 10) next += wordEnd + 1
      const nextText = target.slice(0, next)
      revealedRef.current = nextText
      setRevealed(nextText)
    }, tickMs)

    return () => window.clearInterval(timer)
  }, [message.content, message.isTypingDone, skipPace, typewriterSpeed])

  const displayedText = revealed
  const isRevealing = !isUser && revealed.length < message.content.length
  const isLiveAnswer = !isUser && (isRevealing || (!!message.isStreaming && !message.isTypingDone))
  const fadeMs =
    typewriterSpeed === 'off' ? 0 : typewriterSpeed === 'slow' ? 220 : typewriterSpeed === 'fast' ? 90 : 160

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const loadVoices = () => {
      window.speechSynthesis.getVoices()
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [])

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
    <div className="py-4 px-4 sm:px-8 max-w-3xl mx-auto">
      {/* USER MESSAGE: Rounded White Capsule Bubble with Action Icons on the Left */}
      {isUser ? (
        <div className="flex flex-row items-end justify-end group gap-2">
          {/* Action Icons LEFT of User Message (Visible on Hover) */}
          <div className="flex items-center gap-1 text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity mb-1">
            {onEditPrompt && (
              <button
                onClick={() => onEditPrompt(message.content, message.id)}
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
        /* ASSISTANT MESSAGE: philosopher pill above thinking, full-width reply */
        <div className="space-y-2 text-primary">
          <PhilosopherMark
            model={
              modelOptions.find((option) => option.id === message.modelUsed) ||
              modelOptions[0]
            }
          />
          <div className="w-full min-w-0">
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
              isLive={!!message.isStreaming}
            />
          </div>

          {/* Response Text with High Quality Editorial Anthropic Serif Font */}
          <div
            className="font-claude-serif text-[15px] sm:text-[15.5px] leading-[1.6] text-primary claude-prose max-w-none tracking-[0.01em]"
            style={
              isLiveAnswer && fadeMs > 0
                ? { animation: `wim-token-fade ${fadeMs}ms ease-out` }
                : undefined
            }
          >
            {displayedText ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
               rehypePlugins={[rehypeSanitize]}
              components={{
                p: ({ children }: any) => (
                  <p className="mb-2.5 last:mb-0 leading-[1.55rem] break-words">{children}</p>
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
                          <Copy className="h-3 w-3" /> Copy
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
            ) : null}
          </div>

          {/* Document / Artifact Card */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-3.5 space-y-2 font-claude-sans">
              {message.artifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={(event) => onOpenArtifact?.(art, event.currentTarget.getBoundingClientRect())}
                  className="group/artifact-block relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-[#e7e7e7] bg-[#fafafa] px-4 py-3 text-left transition-all hover:bg-white hover:shadow-sm cursor-pointer"
                >
                  <div className="min-w-0 pr-16">
                    <div className="truncate text-[14px] font-medium leading-tight text-[#1a1a1a]">
                      {art.title}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-[#8a8a8a]">
                      {artifactCardMeta(art)}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute right-3 top-1/2 flex h-[58px] w-[44px] -translate-y-1/2 -rotate-[8deg] items-center justify-center rounded-t-md border border-[#e5e5e5] bg-white shadow-sm transition-transform group-hover/artifact-block:-rotate-[5deg]" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" className="text-[#b0b0b0]">
                      <path d="M212.24,83.76l-56-56A6,6,0,0,0,152,26H56A14,14,0,0,0,42,40V216a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V88A6,6,0,0,0,212.24,83.76ZM158,46.48,193.52,82H158ZM200,218H56a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2h90V88a6,6,0,0,0,6,6h50V216A2,2,0,0,1,200,218Z" />
                    </svg>
                  </div>
                </button>
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
          {!isLiveAnswer && message.isTypingDone && (
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
                  onClick={() => onAddToNotebook(message)}
                  className="flex items-center gap-1 px-1 py-0.5 text-[12px] hover:text-primary transition-colors cursor-pointer"
                  title="Add to notebook"
                >
                  <FileInput className="h-3.5 w-3.5" />
                  <span>Add</span>
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
