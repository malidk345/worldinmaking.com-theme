import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ModelOption, ThinkingProcess, ThinkingStep } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Brain,
  Check,
  ChevronDown,
  Clock,
  Code,
  Compass,
  FileText,
  Globe,
  Zap,
} from 'lucide-react';

function philosopherSurname(name?: string): string {
  if (!name) return 'AI';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || name;
}

function formatExactTime(ts?: string): string {
  if (!ts) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const trimmed = ts.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
  const d = dayjs(trimmed);
  if (d.isValid()) {
    return d.format('HH:mm');
  }
  return trimmed;
}

interface ThinkingBlockProps {
  thinking: ThinkingProcess;
  isLive?: boolean;
  model?: ModelOption;
  timestamp?: string;
}

type ThoughtSegment = {
  id: string;
  kind: 'stage' | 'prose';
  text: string;
};

const VIEWPORT_CLASS =
  'h-[10.5rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const VIEWPORT_MASK: React.CSSProperties = {
  WebkitMaskImage:
    'linear-gradient(to bottom, transparent 0, #000 1.15rem, #000 calc(100% - 0.95rem), transparent 100%)',
  maskImage:
    'linear-gradient(to bottom, transparent 0, #000 1.15rem, #000 calc(100% - 0.95rem), transparent 100%)',
};

function isDoneTitle(title?: string): boolean {
  return String(title || '').trim().toLowerCase() === 'done';
}

function isPlaceholderStep(step: ThinkingStep): boolean {
  const title = String(step.title || '').trim()
  const detail = String(step.detail || '').trim()
  if (step.source === 'system_event' && /^(thinking|thought|think)$/i.test(title)) return true
  if (/^[.…]+$/.test(detail) && /^(thinking|thought|think|analyzing)$/i.test(title)) return true
  return false
}

function flattenThoughtStream(steps: ThinkingStep[]): ThoughtSegment[] {
  const segments: ThoughtSegment[] = [];

  steps.forEach((step, index) => {
    if (isDoneTitle(step.title) || isPlaceholderStep(step)) return;

    const title = String(step.title || '').trim();
    const detail = String(step.detail || '').trim();
    const genericTitle = /^(thinking|thought|think|native reasoning|analyzing)$/i.test(title);

    if (title && !genericTitle) {
      segments.push({
        id: `${step.id || index}-stage`,
        kind: 'stage',
        text: title,
      });
    }

    if (detail && detail !== title && !/^[.…]+$/.test(detail)) {
      segments.push({
        id: `${step.id || index}-prose`,
        kind: 'prose',
        text: detail,
      });
    }
  });

  return segments;
}

function formatDoneHeader(durationSeconds: number, activeStage?: string): string {
  if (durationSeconds > 0) {
    const rounded = durationSeconds >= 10
      ? Math.round(durationSeconds)
      : Math.max(1, Number(durationSeconds.toFixed(1)));
    return `Thought for ${rounded}s`;
  }
  return activeStage || 'Thought';
}

/**
 * Same mapping as the previous timeline: Brain only for an explicit Thinking
 * title, Clock for ordinary reasoning (Analyzing / Reflecting / Concluding),
 * Globe / File / Code / Zap / Compass when the title actually says so.
 */
function titleTokens(title?: string): string[] {
  return String(title || '')
    .toLowerCase()
    .split(/[^a-z0-9çğıöşü.]+/i)
    .filter(Boolean);
}

function hasAnyToken(tokens: string[], words: string[]): boolean {
  return words.some((word) => tokens.includes(word));
}

function getStepIcon(title?: string) {
  const heading = String(title || '').trim().toLowerCase();
  const tokens = titleTokens(heading);

  if (
    heading === 'thinking' ||
    heading === 'think' ||
    heading === 'thought' ||
    heading === 'intent' ||
    heading === 'native reasoning'
  ) {
    return Brain;
  }
  if (hasAnyToken(tokens, ['done', 'completed', 'tamamlandı', 'tamamlandi'])) {
    return Check;
  }
  if (
    hasAnyToken(tokens, ['search', 'searching', 'ara', 'find', 'referans', 'kaynak', 'web', 'scan'])
  ) {
    return Globe;
  }
  if (
    heading.includes('structur') ||
    heading.includes('create_artifact') ||
    heading.includes('belge') ||
    heading.includes('document') ||
    heading.includes('tablo') ||
    heading.includes('table') ||
    heading.includes('şema') ||
    heading.includes('diagram') ||
    heading.includes('mermaid')
  ) {
    return FileText;
  }
  if (
    hasAnyToken(tokens, ['read', 'write', 'code', 'file', 'terminal', 'script', 'tool', 'kod', 'dosya', 'typo', 'orchestrator']) ||
    heading.includes('agent-') ||
    heading.includes('.ts') ||
    heading.includes('.tsx') ||
    heading.includes('.js')
  ) {
    return Code;
  }
  if (
    heading.includes('tension') ||
    heading.includes('contradiction') ||
    heading.includes('negative_dialectics') ||
    heading.includes('immanent') ||
    heading.includes('çelişki')
  ) {
    return Zap;
  }
  if (
    heading.includes('genealogy') ||
    heading.includes('deconstruction') ||
    heading.includes('materialist') ||
    heading.includes('substance') ||
    heading.includes('compass')
  ) {
    return Compass;
  }
  return Clock;
}

const ThinkingLeadIcon: React.FC<{ live?: boolean }> = ({ live = false }) => {
  return (
    <Brain
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 stroke-[1.5] text-stone-400 dark:text-stone-500 ${
        live ? 'opacity-90' : ''
      }`}
    />
  );
};

const StageTitle: React.FC<{ title: string; className?: string }> = ({ title, className = '' }) => {
  const Icon = getStepIcon(title);
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <Icon className="h-3 w-3 shrink-0 stroke-[1.5] text-stone-400 dark:text-stone-500" />
      <span className="truncate">{title}</span>
    </span>
  );
};

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ thinking, isLive = false, model, timestamp }) => {
  const [isOpen, setIsOpen] = useState(isLive);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  const rawSteps = thinking?.steps || [];
  const segments = useMemo(() => flattenThoughtStream(rawSteps), [rawSteps]);
  const hasThoughtText = segments.some((segment) => segment.text.length > 0);
  const durationSeconds = thinking?.durationSeconds || 0;

  const activeStage = [...rawSteps]
    .reverse()
    .find((step) => !isDoneTitle(step.title) && !isPlaceholderStep(step) && String(step.title || '').trim())
    ?.title;

  useLayoutEffect(() => {
    setIsOpen(!!isLive)
  }, [isLive])

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28;
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !isOpen) return;
    if (isLive && pinnedToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [segments, isLive, isOpen]);

  const formattedTime = formatExactTime(timestamp);
  const surname = philosopherSurname(model?.name);
  const showThinkingTrigger = isLive || hasThoughtText;

  if (!model && !showThinkingTrigger) return null;

  return (
    <div className="w-full max-w-full select-none font-sans text-secondary">
      {/* Header Row: Philosopher Profile (Left) + Thinking Trigger (Right on same line) */}
      <div className="flex items-center justify-between gap-2 w-full min-w-0 flex-wrap pb-1">
        {model ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 shrink-0 rounded-full mr-2.5 overflow-hidden border border-primary/30 bg-accent">
              {model.avatarUrl ? (
                <img src={model.avatarUrl} alt={surname} className="size-full object-cover object-top" />
              ) : (
                <span className={`flex size-full items-center justify-center text-xs font-bold text-white ${model.avatarBg || 'bg-[#1E3A8A]'}`}>
                  {model.initials || surname.slice(0, 2)}
                </span>
              )}
            </div>
            <strong className="font-bold text-[15px] text-primary leading-tight">
              {surname}
            </strong>
            <span className="text-sm text-muted relative cursor-default" suppressHydrationWarning>
              {formattedTime}
            </span>
          </div>
        ) : <div />}

        {/* Thinking trigger on the same row */}
        {showThinkingTrigger && (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            className="group/status inline-flex items-center gap-1.5 py-0.5 text-left text-[13px] text-stone-500 transition-colors hover:text-stone-800 focus:outline-none dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer ml-auto"
          >
            <ThinkingLeadIcon live={isLive} />
            {isLive ? (
              <>
                <span className="wim-think-sheen shrink-0 leading-tight">Thinking</span>
                {activeStage && !/^(thinking|thought|think)$/i.test(activeStage) && (
                  <>
                    <span className="shrink-0 text-stone-400 dark:text-stone-500">·</span>
                    <StageTitle title={activeStage} className="text-[13px] font-normal" />
                  </>
                )}
              </>
            ) : (
              <span className="truncate leading-tight">
                {formatDoneHeader(durationSeconds, activeStage)}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-200 dark:text-stone-500 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Expanded Full-Width Thinking Panel */}
      {isOpen && hasThoughtText && (
        <div className="relative mt-1 min-w-0 w-full mb-2">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={VIEWPORT_CLASS}
            style={VIEWPORT_MASK}
          >
            <div className="space-y-1.5 py-3 text-[13px] leading-[1.55] text-stone-500 dark:text-stone-400">
              {segments.map((segment) =>
                segment.kind === 'stage' ? (
                  <div key={segment.id} className="pt-1 first:pt-0">
                    <StageTitle
                      title={segment.text}
                      className="text-[11px] font-medium tracking-[0.01em] text-stone-400 dark:text-stone-500"
                    />
                  </div>
                ) : (
                  <p key={segment.id} className="m-0 whitespace-pre-wrap break-words">
                    {segment.text}
                  </p>
                )
              )}
              {isLive && (
                <span
                  aria-hidden="true"
                  className="inline-block h-[0.85em] w-[1.5px] translate-y-[1px] animate-pulse bg-stone-400 align-baseline dark:bg-stone-500"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
