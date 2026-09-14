import React, { useState, useEffect, useRef } from 'react';
import { Message, Artifact, ModelOption, OSActionCard as OSActionCardType, HumanTurn } from '../types';
import { getRenderer } from '../../../lib/artifacts'
import { ThinkingBlock } from './ThinkingBlock';

import { Copy, Check, Edit2, RotateCcw, FileInput, Columns } from 'lucide-react';
import { SourceFavicon } from './SourceFavicon';
import { IconDocument, IconImage } from '@posthog/icons';
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
  onHumanRespond?: (messageId: string, action: 'run' | 'revise' | 'answer', payload?: string) => void;
  onAddToNotebook?: (message: Message) => void;
  onOpenByok?: () => void;
  typewriterSpeed?: 'slow' | 'smooth' | 'fast' | 'off';
}

function formatExactTime(ts?: string): string {
  if (!ts) return '';
  const trimmed = ts.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
  const d = dayjs(trimmed);
  if (d.isValid()) return d.format('HH:mm');
  return trimmed;
}

function ensureClosedCodeFences(markdown: string): string {
  if (!markdown) return markdown;
  const fenceMatches = markdown.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return markdown + '\n```';
  }
  return markdown;
}

function ChatMessageDiffBlock({ code, isLive }: { code: string; isLive?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const lines = code.split('\n');
  const addedLines = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter((l) => l.startsWith('-') && !l.startsWith('---'));

  // Extract clean content to apply to active notebook
  const cleanContentToApply = React.useMemo(() => {
    if (addedLines.length > 0) {
      return addedLines.map((l) => l.slice(1)).join('\n');
    }
    return code;
  }, [addedLines, code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContentToApply || code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToNotebook = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('wimNotebookInsertText', {
        detail: {
          text: cleanContentToApply,
          mode: 'append',
        },
      })
    );
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const handleSplitScreen = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('wimArrangeWorkspace', {
        detail: { preset: 'split_dual' },
      })
    );
  };

  return (
    <div className="my-2.5 rounded border border-primary/20 bg-primary overflow-hidden text-primary text-xs font-sans shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-accent border-b border-primary/20 text-[12px] font-sans">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">
            {isLive ? 'Patch stream' : 'Patch'}
          </span>
          <span className="text-muted text-[11px]">
            +{addedLines.length} / -{removedLines.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <span className="text-[11px] text-muted animate-pulse select-none">
              Preparing…
            </span>
          ) : (
            <button
              type="button"
              onClick={handleApplyToNotebook}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                applied
                  ? 'bg-primary text-white font-medium'
                  : 'bg-[#1E3A8A] hover:bg-[#1e40af] text-white'
              }`}
            >
              <Check className="size-3" />
              <span>{applied ? 'Added ✓' : 'Add to notebook'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className={`p-1 rounded text-muted hover:text-primary transition-colors cursor-pointer ${
              copied ? 'text-primary font-medium' : ''
            }`}
            title="Copy"
          >
            {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
          </button>
        </div>
      </div>
      <div className="p-2 overflow-x-auto font-mono text-[11px] leading-snug space-y-0.5 max-h-[360px] overflow-y-auto">
        {lines.map((line, idx) => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            return (
              <div key={idx} className="bg-accent/35 text-primary px-1.5 py-0.5 rounded-xs border-l-2 border-primary whitespace-pre-wrap break-words">
                {line}
              </div>
            );
          }
          if (line.startsWith('-') && !line.startsWith('---')) {
            return (
              <div key={idx} className="bg-accent/35 text-muted/80 px-1.5 py-0.5 rounded-xs border-l-2 border-primary/50 line-through whitespace-pre-wrap break-words">
                {line}
              </div>
            );
          }
          if (line.startsWith('@@')) {
            return (
              <div key={idx} className="text-primary font-bold bg-accent/25 px-1.5 py-0.5 rounded-xs my-0.5 text-[10.5px]">
                {line}
              </div>
            );
          }
          return (
            <div key={idx} className="text-primary/90 px-1.5 py-0.2 whitespace-pre-wrap break-words">
              {line}
            </div>
          );
        })}
        {isLive && (
          <div className="flex items-center gap-1.5 py-1 px-1.5 text-[10.5px] text-primary/80 font-mono select-none">
            <span className="inline-block w-1.5 h-3 bg-primary shadow-sm animate-pulse rounded-xs" />
            <span className="italic">Canlı yama satırları akıyor…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessageCodeBlock({ language, code, isLive }: { language: string; code: string; isLive?: boolean }) {
  if (language === 'diff' || language === 'patch') {
    return <ChatMessageDiffBlock code={code} isLive={isLive} />;
  }

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-1.5 rounded border border-primary/20 bg-primary overflow-hidden text-primary text-xs font-sans shadow-2xs">
      <div className="flex items-center justify-between px-2.5 py-0.5 bg-accent border-b border-primary/20 text-[10.5px] text-muted font-mono">
        <span className="font-semibold text-primary">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1 transition-colors cursor-pointer px-1 py-0.5 rounded ${
            copied ? 'text-primary font-semibold bg-accent/40' : 'hover:text-primary'
          }`}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-primary" />
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
      <pre className="p-2 overflow-x-auto font-mono text-[11px] leading-snug">{code}</pre>
    </div>
  );
}

function artifactCardMeta(art: Artifact): string {
  const kind = getRenderer(art.type).label.replace(/^\w/, (c) => c.toUpperCase());
  return art.version > 1 ? `${kind} · v${art.version}` : kind;
}

function InquiryStatusCard({
  kind,
  text,
  onRetry,
  onOpenByok,
}: {
  kind: 'quota' | 'provider' | 'network'
  text: string
  onRetry?: () => void
  onOpenByok?: () => void
}) {
  const title = kind === 'quota' ? 'Inquiry limit' : kind === 'provider' ? 'Philosopher network' : 'Connection'
  const body = text.replace(/^\[app\]\s*/, '').replace(/^Chat API \d+\s*/, '').trim()
  return (
    <div role="status" aria-live="polite" className="mt-2 rounded border border-primary/50 bg-accent/60 px-3 py-2.5 text-[12.5px] text-primary">
      <p className="m-0 font-medium">{title}</p>
      <p className="mt-1 mb-2 text-secondary leading-relaxed">{body || 'The inquiry could not continue.'}</p>
      {kind === 'quota' && onOpenByok ? (
        <button
          type="button"
          onClick={onOpenByok}
          className="m-0 rounded-md border border-primary/60 bg-primary px-2 py-1 text-[12px] font-medium text-primary hover:bg-accent cursor-pointer"
        >
          Use your own key
        </button>
      ) : onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="m-0 rounded-md border border-primary/60 bg-primary px-2 py-1 text-[12px] font-medium text-primary hover:bg-accent cursor-pointer"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

function HumanTurnCard({
  turn,
  disabled,
  onRespond,
}: {
  turn: HumanTurn
  disabled?: boolean
  onRespond: (action: 'run' | 'revise' | 'answer', payload?: string) => void
}) {
  const [draft, setDraft] = useState('')
  const pending = turn.status === 'pending' && !disabled
  if (turn.kind === 'plan_approval') {
    return (
      <div className="mt-2 rounded border border-primary/50 bg-accent/60 px-3 py-2.5 text-[12.5px] text-primary">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 font-medium">{turn.title}</p>
          </div>
          {pending ? (
            <button
              type="button"
              onClick={() => onRespond('run')}
              className="rounded-md border border-primary bg-primary px-2.5 py-1 text-[12px] font-medium text-primary hover:bg-accent cursor-pointer"
            >
              Run
            </button>
          ) : (
            <span className="text-[11px] text-muted">
              {turn.status === 'approved' ? 'Running' : turn.status === 'revised' ? 'Revising' : null}
            </span>
          )}
        </div>
        {turn.summary ? <p className="m-0 text-[12.5px] leading-relaxed text-secondary">{turn.summary}</p> : null}
        {turn.plan && turn.plan.length > 0 ? (
          <ul className="mt-2 mb-0 pl-4 space-y-1 text-secondary">
            {turn.plan.map((item) => (
              <li key={item.id} className={item.status === 'completed' ? 'line-through text-muted' : item.status === 'in_progress' ? 'font-medium text-primary' : ''}>
                {item.title}
              </li>
            ))}
          </ul>
        ) : null}
        {pending ? (
          <div className="flex items-center gap-2 pt-0.5">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Revision note (optional)"
              className="min-w-0 flex-1 rounded-md border border-primary/40 bg-primary px-2 py-1 text-[12px] text-primary outline-none"
            />
            <button
              type="button"
              onClick={() => onRespond('revise', draft.trim() || undefined)}
              className="shrink-0 rounded-md border border-primary/50 px-2.5 py-1 text-[12px] text-secondary hover:text-primary cursor-pointer"
            >
              Revise
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return null
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
  onHumanRespond,
  onAddToNotebook,
  onOpenByok,
  typewriterSpeed = 'smooth',
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [addedToNotebook, setAddedToNotebook] = useState(false);
  const displayedText = message.content;
  const isLiveAnswer = !isUser && !!message.isStreaming;
  const usedModel = modelOptions.find((option) => option.id === message.modelUsed) || modelOptions[0];
  const markdownText = isLiveAnswer ? ensureClosedCodeFences(displayedText) : displayedText;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-2 sm:py-2.5 px-3.5 sm:px-6 max-w-3xl mx-auto">
      {/* USER MESSAGE: Compact Bubble with Action Icons Underneath */}
      {isUser ? (
        <div className="flex flex-col items-end group">
          {/* Attached Files / Context Chips */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5 mb-1.5 max-w-[85%]">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-accent/80 px-2 py-1 text-[11px] text-secondary font-sans shadow-2xs"
                >
                  {att.type === 'image' && att.url ? (
                    <img src={att.url} alt={att.name} className="size-4 rounded object-cover border border-primary/30 shrink-0" />
                  ) : att.type === 'image' ? (
                    <IconImage className="size-3.5 shrink-0 text-amber-700" />
                  ) : (
                    <IconDocument className="size-3.5 shrink-0 text-secondary" />
                  )}
                  <span className="max-w-[160px] truncate font-medium text-primary">{att.name}</span>
                  {att.size && <span className="text-[9.5px] text-muted font-mono">{att.size}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="relative w-fit max-w-[85%] rounded bg-primary/90 backdrop-blur-md border border-primary/60 px-3.5 py-1.5 text-primary text-[13.5px] sm:text-[14px] leading-normal font-sans shadow-2xs transition-transform duration-150 active:scale-[0.98] [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.12)]">
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
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        /* ASSISTANT MESSAGE: philosopher header with thinking on the same row, full-width reply */
        <div className="space-y-1.5 text-primary">
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

          <div className="wim-ask-reply space-y-1">
          {/* Response Text with Ultra-Compact High-Density Typography */}
          <div
            className="font-sans text-[13px] sm:text-[13.5px] leading-[1.42] text-primary markdown prose dark:prose-invert prose-sm max-w-none [&_p]:mt-0 [&_p]:leading-[1.42] [&_p]:mb-1.5 last:[&_p]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_li]:leading-[1.42] [&_h1]:text-[14.5px] [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[13.5px] [&_h2]:font-semibold [&_h2]:mt-1.5 [&_h2]:mb-0.5 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:mt-1 [&_h3]:mb-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-2.5 [&_blockquote]:my-1 [&_blockquote]:text-secondary [&_blockquote]:italic [&_blockquote]:leading-[1.42] [&_table]:my-1 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-primary/20 [&_th]:bg-accent/50 [&_th]:px-2 [&_th]:py-0.5 [&_th]:text-left [&_th]:text-[11.5px] [&_td]:border [&_td]:border-primary/20 [&_td]:px-2 [&_td]:py-0.5 [&_td]:text-[11.5px] [&_td]:leading-[1.4] [&_a]:font-semibold [&_a]:text-primary break-words [overflow-wrap:anywhere]"
          >
            {message.errorKind ? (
              <InquiryStatusCard
                kind={message.errorKind}
                text={displayedText}
                onRetry={onRetry ? () => onRetry(message.id) : undefined}
                onOpenByok={onOpenByok}
              />
            ) : displayedText ? (
              <>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }: any) => (
                      <p className="mb-1.5 last:mb-0 leading-[1.42] break-words">{children}</p>
                    ),
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');
                      if (!inline && match) {
                        return <ChatMessageCodeBlock language={match[1]} code={codeContent} isLive={isLiveAnswer} />;
                      }
                      if (inline && /^(Page|Sayfa)\s+\d+$/i.test(codeContent.trim())) {
                        return (
                          <span className="inline-flex items-center gap-1 bg-accent/50 text-primary border border-primary/25 px-1.5 py-0.2 rounded text-[11px] font-sans font-medium mx-0.5 shadow-2xs">
                            <IconDocument className="size-3 shrink-0" />
                            {codeContent.trim()}
                          </span>
                        );
                      }
                      return (
                        <code className="bg-accent text-primary border border-primary/20 px-1 py-0.2 rounded text-[11.5px] font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {markdownText}
                </ReactMarkdown>
                {isLiveAnswer && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-3.5 ml-1 -mb-0.5 bg-primary/70 dark:bg-primary/90 animate-pulse rounded-xs"
                  />
                )}
              </>
            ) : null}
          </div>

          {message.qualityGate === 'failed' && (
            <div className="mt-2 rounded border border-primary/50 bg-accent/60 px-3 py-2 text-[12.5px] text-muted">
              Quality check revised this reply
            </div>
          )}
          {message.qualityGate === 'skipped' && (
            <div className="mt-2 rounded border border-primary/50 bg-accent/60 px-3 py-2 text-[12.5px] text-muted">
              Quality check unavailable &mdash; reply shown ungated
            </div>
          )}

          {/* Document / Artifact Card */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-3.5 space-y-2 font-sans">
              {message.artifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={(event) => onOpenArtifact?.(art, event.currentTarget.getBoundingClientRect())}
                  className="group/artifact-block relative flex w-full items-center justify-between overflow-hidden rounded border border-primary/70 bg-primary/80 backdrop-blur-md px-4 py-3 text-left transition-all duration-200 hover:bg-accent hover:border-primary hover:-translate-y-0.5 hover:shadow-md active:scale-[0.985] active:translate-y-0 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.1)] cursor-pointer"
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

          {message.humanTurn && message.humanTurn.status !== 'pending' ? (
            <HumanTurnCard
              turn={message.humanTurn}
              disabled={!!message.isStreaming}
              onRespond={(action, payload) => onHumanRespond?.(message.id, action, payload)}
            />
          ) : null}

          {message.osAction && !message.osAction.executed ? (
            <OSActionCard
              action={message.osAction}
              isStreaming={isLiveAnswer}
              onExecute={() => onExecuteOSAction?.(message.id, message.osAction!)}
            />
          ) : null}

          {/* Action Icons Row matching Claude: Copy, Play, Thumbs Up, Thumbs Down */}
          {message.stopped ? (
            <p className="m-0 pt-1 text-[12px] text-muted">Stopped</p>
          ) : null}

          {!isLiveAnswer && (message.isTypingDone || message.stopped) && message.errorKind !== 'quota' && (
            <div className="pt-1 flex items-center gap-1 text-muted font-sans">
              {usedModel && (
                <div className="flex items-center gap-1.5 py-0.5 px-1.5 rounded-md bg-accent/40 border border-primary/15 text-[11px] text-muted select-none">
                  <div className="size-3.5 shrink-0 rounded-full overflow-hidden border border-primary/20 bg-accent">
                    {usedModel.avatarUrl ? (
                      <img src={usedModel.avatarUrl} alt={usedModel.name} className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[7.5px] font-bold text-white bg-primary">
                        {(usedModel.name || 'AI').slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-secondary text-[11px] leading-none">
                    {usedModel.name.trim().split(/\s+/).filter(Boolean).pop() || usedModel.name}
                  </span>
                  {message.timestamp && (
                    <span className="text-[10px] text-muted/70 leading-none" suppressHydrationWarning>
                      · {formatExactTime(message.timestamp)}
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={handleCopy}
                className="p-1 hover:text-primary transition-transform duration-150 active:scale-[0.88] hover:scale-[1.1] cursor-pointer rounded"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {onRetry && (
                <button
                  onClick={() => onRetry(message.id)}
                  className="p-1 hover:text-primary transition-transform duration-150 active:scale-[0.88] hover:scale-[1.1] cursor-pointer rounded"
                  title="Retry"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              {onAddToNotebook && (message.content.trim() || (message.artifacts && message.artifacts.length > 0)) && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToNotebook(message)
                    setAddedToNotebook(true)
                    setTimeout(() => setAddedToNotebook(false), 2000)
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 text-[12px] rounded transition-transform duration-150 active:scale-[0.92] hover:scale-[1.05] cursor-pointer ${
                    addedToNotebook ? 'text-primary font-semibold bg-accent/50 dark:bg-accent/40' : 'hover:text-primary'
                  }`}
                  title="Add to notebook"
                >
                  {addedToNotebook ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
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
    prev.message.osAction === next.message.osAction &&
    prev.message.humanTurn === next.message.humanTurn &&
    prev.message.checkpoint === next.message.checkpoint
  );
});