import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelOption, ThinkingProcess, ThinkingStep, ToolTrace } from '../types';
import { toolStatusLabel } from '../../../lib/bots/tools/labels';
import dayjs from 'dayjs';
import {
  Activity,
  Brain,
  Check,
  ChevronDown,
  Clock,
  Code,
  Compass,
  Eye,
  FileText,
  Flame,
  Globe,
  Key,
  Layers,
  Scale,
  Shield,
  Sparkles,
  Split,
  Target,
  TrendingUp,
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

  toolTrace?: ToolTrace[];
  isLive?: boolean;
  model?: ModelOption;
  timestamp?: string;
}

type ThreadNode = {
  id: string;
  title: string;
  detail?: string;
  isTool?: boolean;
  status?: 'running' | 'done' | 'error';
};

const VIEWPORT_CLASS =
  'max-h-[14rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

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
  const title = String(step.title || '').trim();
  const detail = String(step.detail || '').trim();
  if (step.source === 'system_event' && /^(thinking|thought|think)$/i.test(title)) return true;
  if (/^[.…]+$/.test(detail) && /^(thinking|thought|think|analyzing)$/i.test(title)) return true;
  return false;
}

function isToolChromeStep(step: ThinkingStep): boolean {
  const id = String(step.id || '');
  return id.startsWith('tool-') || id === 'search-step';
}

function formatStageTitle(rawTitle: string): string {
  const cleaned = rawTitle.replace(/[\[\]_:\-]+/g, ' ').trim();
  if (!cleaned) return '';
  if (/^auto-\d+$/i.test(cleaned) || /^tag-\d+$/i.test(cleaned) || /^repertoire-\d+$/i.test(cleaned)) {
    return 'Thought';
  }
  const upper = cleaned.toUpperCase();
  if (upper === 'GÜÇ' || upper === 'GÜÇ OKUMASI' || upper === 'GÜÇ-OKUMASI' || upper === 'POWER') {
    return 'Power';
  }
  if (upper === 'GENEALOJİ' || upper === 'GENEALOGY') {
    return 'Genealogy';
  }
  if (upper === 'KARŞITLIK' || upper === 'KARŞITLIK KIRILMASI' || upper === 'KARŞITLIK-KIRILMASI' || upper === 'OPPOSITION') {
    return 'Opposition';
  }
  if (upper === 'FİZYOLOJİ' || upper === 'PHYSIOLOGY') {
    return 'Physiology';
  }
  if (upper === 'TAVIR' || upper === 'STANCE') {
    return 'Stance';
  }
  if (upper === 'ÖZ ÇELİŞKİ' || upper === 'ÖZ-ÇELİŞKİ' || upper === 'ÇELİŞKİ' || upper === 'CONTRADICTION') {
    return 'Contradiction';
  }
  if (upper === 'ÖZ AŞMA' || upper === 'ÖZ-AŞMA' || upper === 'AŞMA' || upper === 'OVERCOMING') {
    return 'Overcoming';
  }
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 2) {
    return cleaned.charAt(0) + cleaned.slice(1).toLowerCase();
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function parseBracketedSegments(raw: string): Array<{ title: string; detail: string }> {
  const bracketRegex = /(?:^|\n|\s*)\[([A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+)\]\s*[:—\-]?\s*([\s\S]*?)(?=(?:\n\s*\[[A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+\]|$))/g;
  const matches = Array.from(raw.matchAll(bracketRegex));
  if (matches.length > 0) {
    const results: Array<{ title: string; detail: string }> = [];
    const firstMatchIdx = raw.search(/\[[A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+\]/);
    if (firstMatchIdx > 0) {
      const preamble = raw.slice(0, firstMatchIdx).replace(/^\[+|\]+$/g, '').trim();
      if (preamble) {
        results.push({ title: 'Analysis', detail: preamble });
      }
    }
    for (const m of matches) {
      const tag = m[1].trim();
      const text = m[2].trim().replace(/^\[[A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+\]\s*[:—\-]?\s*/, '');
      results.push({
        title: formatStageTitle(tag),
        detail: text,
      });
    }
    return results;
  }
  return [];
}

function buildThreadNodes(steps: ThinkingStep[], traces: ToolTrace[], hideToolChrome: boolean): ThreadNode[] {
  const nodes: ThreadNode[] = [];

  traces.forEach((trace) => {
    const title = toolStatusLabel(trace.name, trace.status);
    const detail = clipTraceDetail(trace.detail || (trace.status === 'error' ? trace.result : ''));
    nodes.push({
      id: `trace-${trace.id}`,
      title,
      detail: detail && detail !== title ? detail : undefined,
      isTool: true,
      status: trace.status,
    });
  });

  steps.forEach((step, index) => {
    if (isDoneTitle(step.title) || isPlaceholderStep(step)) return;
    if (hideToolChrome && isToolChromeStep(step)) return;

    const title = String(step.title || '').trim();
    const detail = String(step.detail || '').trim();
    const genericTitle = /^(thinking|thought|think|native reasoning)$/i.test(title);

    const bracketSegments = parseBracketedSegments(detail);
    if (bracketSegments.length > 0) {
      bracketSegments.forEach((seg, sIdx) => {
        nodes.push({
          id: `step-${step.id || index}-seg-${sIdx}`,
          title: seg.title,
          detail: seg.detail,
          isTool: false,
        });
      });
      return;
    }

    const displayTitle = !genericTitle ? formatStageTitle(title) : '';
    let displayDetail = detail && detail !== title && !/^[.…]+$/.test(detail) ? detail : '';
    displayDetail = displayDetail.replace(/^\[[A-ZÇĞİÖŞÜa-zçğıöşü0-9\-_ /]+\]\s*[:—\-]?\s*/, '');

    if (displayTitle || displayDetail) {
      nodes.push({
        id: `step-${step.id || index}`,
        title: displayTitle || 'Analysis',
        detail: displayDetail,
        isTool: false,
      });
    }
  });

  return nodes;
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

  if (hasAnyToken(tokens, ['power', 'güç', 'praxis', 'energy', 'cadre', 'force', 'vitality', 'axiom'])) {
    return Zap;
  }
  if (hasAnyToken(tokens, ['genealogy', 'genealoji', 'being', 'clearing', 'origin', 'history', 'ancestry', 'vita'])) {
    return Compass;
  }
  if (hasAnyToken(tokens, ['opposition', 'karşıtlık', 'binary', 'split', 'dualism', 'parallax', 'rupture', 'aporia', 'supplement'])) {
    return Split;
  }
  if (hasAnyToken(tokens, ['physiology', 'fizyoloji', 'health', 'body', 'metabolism', 'conatus', 'affect'])) {
    return Activity;
  }
  if (hasAnyToken(tokens, ['stance', 'tavır', 'posture', 'attitude', 'gaze', 'focus', 'interpellation', 'judgment'])) {
    return Target;
  }
  if (hasAnyToken(tokens, ['contradiction', 'çelişki', 'öz-çelişki', 'tension', 'paradox', 'clash', 'negation', 'damage', 'symptom', 'anguish'])) {
    return Flame;
  }
  if (hasAnyToken(tokens, ['overcoming', 'öz-aşma', 'surpass', 'transcend', 'sublime', 'aufhebung', 'becoming', 'bliss', 'natality', 'project', 'concluding'])) {
    return TrendingUp;
  }
  if (hasAnyToken(tokens, ['production', 'commodity', 'extraction', 'apparatus', 'structure', 'cage', 'industry', 'producer', 'equipment', 'practice'])) {
    return Layers;
  }
  if (hasAnyToken(tokens, ['simulation', 'hyperreality', 'consumption', 'obscenity', 'seduction', 'fatal', 'fantasy', 'cynicism'])) {
    return Sparkles;
  }
  if (hasAnyToken(tokens, ['rationality', 'legitimacy', 'polytheism', 'disenchantment', 'charisma', 'rights', 'justice'])) {
    return Scale;
  }
  if (hasAnyToken(tokens, ['freedom', 'badfaith', 'situation', 'falling', 'temporality', 'frame', 'defense', 'shield'])) {
    return Shield;
  }
  if (hasAnyToken(tokens, ['reason', 'trader', 'sacrifice', 'timing', 'concrete', 'opportunism', 'substance', 'adequacy', 'causality'])) {
    return Key;
  }
  if (hasAnyToken(tokens, ['nonidentity', 'aesthetic', 'real', 'inversion', 'plurality', 'banality', 'immanence', 'intensity', 'desire', 'assemblage', 'territory'])) {
    return Eye;
  }
  if (hasAnyToken(tokens, ['search', 'searching', 'ara', 'find', 'referans', 'kaynak', 'web', 'scan', 'fetch_url', 'totality', 'imperialism', 'public', 'global'])) {
    return Globe;
  }
  if (hasAnyToken(tokens, ['read', 'write', 'code', 'file', 'terminal', 'script', 'tool', 'kod', 'dosya', 'typo', 'orchestrator']) ||
      heading.includes('agent-') ||
      heading.includes('.ts') ||
      heading.includes('.tsx') ||
      heading.includes('.js')) {
    return Code;
  }
  if (heading.includes('structur') ||
      heading.includes('create_artifact') ||
      heading.includes('belge') ||
      heading.includes('document') ||
      heading.includes('tablo') ||
      heading.includes('table') ||
      heading.includes('şema') ||
      heading.includes('diagram') ||
      heading.includes('mermaid') ||
      heading.includes('notebook') ||
      hasAnyToken(tokens, ['logocentrism', 'différance', 'differance', 'trace', 'mediation', 'immediacy'])) {
    return FileText;
  }
  if (hasAnyToken(tokens, ['done', 'completed', 'tamamlandı', 'tamamlandi'])) {
    return Check;
  }
  if (hasAnyToken(tokens, ['thinking', 'think', 'thought', 'intent', 'native reasoning', 'analyzing', 'analysis'])) {
    return Brain;
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

function clipTraceDetail(value?: string): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= 220 ? text : `${text.slice(0, 217)}…`;
}

const ThinkingBlockComponent: React.FC<ThinkingBlockProps> = ({ thinking, toolTrace, isLive = false, model, timestamp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  const traces = toolTrace || [];
  const hasTools = traces.length > 0;
  const rawSteps = thinking?.steps || [];
  const nodes = useMemo(() => buildThreadNodes(rawSteps, traces, hasTools), [rawSteps, traces, hasTools]);
  const hasThoughtText = nodes.length > 0;
  const durationSeconds = thinking?.durationSeconds || 0;

  const activeStage = [...rawSteps]
    .reverse()
    .find((step) => !isDoneTitle(step.title) && !isPlaceholderStep(step) && String(step.title || '').trim())
    ?.title;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottom.current = distanceToBottom <= 24;
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !isOpen) return;
    if (isLive && pinnedToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [nodes, isLive, isOpen]);

  const formattedTime = formatExactTime(timestamp);
  const surname = philosopherSurname(model?.name);
  const liveStage = traces.find((trace) => trace.status === 'running');
  const headerStage = liveStage
    ? toolStatusLabel(liveStage.name, 'running')
    : activeStage && !/^(thinking|thought|think)$/i.test(activeStage)
      ? formatStageTitle(activeStage)
      : traces.length
        ? toolStatusLabel(traces[traces.length - 1].name, traces[traces.length - 1].status)
        : undefined;
  const showThinkingTrigger = isLive || hasThoughtText;

  useEffect(() => {
    if (!isLive || !(hasTools || hasThoughtText)) return;
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    if (!mobile) setIsOpen(true);
  }, [isLive, hasTools, hasThoughtText]);

  if (!model && !showThinkingTrigger) return null;

  return (
    <div className="w-full max-w-full select-none font-sans text-secondary">
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

        {showThinkingTrigger && (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            className="group/status inline-flex items-center gap-1.5 py-0.5 text-left text-[13px] text-stone-500 transition-colors hover:text-stone-800 focus:outline-none dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer ml-auto"
          >
            <ThinkingLeadIcon live={isLive} />
            {isLive ? (
              <span className="wim-think-sheen truncate leading-tight font-medium text-[#1E3A8A] dark:text-blue-400">
                {headerStage || 'Thinking…'}
              </span>
            ) : (
              <span className="truncate leading-tight">
                {formatDoneHeader(durationSeconds, headerStage)}
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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative mt-0.5 min-w-0 w-full mb-1.5 overflow-hidden"
          >
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className={VIEWPORT_CLASS}
              style={VIEWPORT_MASK}
            >
              <div className="relative pl-4.5 py-1 space-y-2.5">
                {/* Vertical Thread Connector */}
                <div className="absolute left-[4px] top-2 bottom-2 w-[1px] bg-stone-200/80 dark:bg-stone-800" />

                {nodes.map((node) => {
                  const Icon = getStepIcon(node.title);
                  const displayTitle = formatStageTitle(node.title);

                  return (
                    <div key={node.id} className="relative group/node">
                      {/* Subtle bullet on connector */}
                      <div className="absolute -left-[16px] top-1 size-1.5 rounded-full bg-stone-300 dark:bg-stone-600 ring-2 ring-white dark:ring-stone-900" />

                      <div className="min-w-0">
                        {displayTitle && (
                          <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-stone-700 dark:text-stone-300">
                            <Icon className="size-3 shrink-0 stroke-[1.75] text-stone-500 dark:text-stone-400" />
                            <span>{displayTitle}</span>
                          </div>
                        )}
                        {node.detail && (
                          <p className="m-0 mt-0.5 text-[12px] leading-[1.4] text-stone-600 dark:text-stone-400 font-sans whitespace-pre-wrap break-words">
                            {node.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLive && (
                  <div className="relative flex items-center gap-2">
                    <div className="absolute -left-[16px] top-1 size-1.5 rounded-full bg-stone-300 dark:bg-stone-600 ring-2 ring-white dark:ring-stone-900" />
                    <span
                      aria-hidden="true"
                      className="inline-block h-[0.8em] w-[1.5px] translate-y-[1px] animate-pulse bg-stone-400 align-baseline dark:bg-stone-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ThinkingBlock = React.memo(ThinkingBlockComponent);
