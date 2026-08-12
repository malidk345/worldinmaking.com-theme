import React, { useState } from 'react';
import { ThinkingProcess, ThinkingStep } from '../types';
import {
  ChevronDown,
  Clock,
  Code,
  Check,
  Loader2,
  Globe,
  FileText,
  Compass,
  Zap,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkingBlockProps {
  thinking: ThinkingProcess;
  isLive?: boolean;
}

// Live Claude Spark Icon for header or status indicators
export const ClaudeSparkIcon: React.FC<{ className?: string; isLive?: boolean }> = ({
  className = 'w-4 h-4',
  isLive = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full text-stone-500 dark:text-stone-400"
        fill="currentColor"
      >
        <path d="M50 4 C53 28, 64 36, 96 50 C64 64, 53 72, 50 96 C47 72, 36 64, 4 50 C36 36, 47 28, 50 4 Z" />
      </svg>
    </div>
  );
};

// Determine step icon type based on title/detail content (matching Claude / Antigravity extended thinking UI)
const getStepIconAndStyle = (step: ThinkingStep | { title: string; detail?: string; type?: string }) => {
  const text = `${step.title || ''} ${step.detail || ''}`.toLowerCase();

  // Thinking / intent step — brain icon (always first step in every thinking block)
  if (
    step.title?.toLowerCase() === 'thinking' ||
    step.title?.toLowerCase() === 'think' ||
    step.title?.toLowerCase() === 'intent'
  ) {
    return { Icon: Brain, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  if (text.includes('done') || text.includes('completed') || text.includes('tamamlandı')) {
    return { Icon: Check, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  if (
    text.includes('search') ||
    text.includes('ara') ||
    text.includes('find') ||
    text.includes('referans') ||
    text.includes('kaynak') ||
    text.includes('web') ||
    text.includes('scan')
  ) {
    return { Icon: Globe, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  if (
    text.includes('structure') ||
    text.includes('create_artifact') ||
    text.includes('belge') ||
    text.includes('document') ||
    text.includes('tablo') ||
    text.includes('table') ||
    text.includes('şema') ||
    text.includes('diagram') ||
    text.includes('mermaid')
  ) {
    return { Icon: FileText, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  if (
    text.includes('read') ||
    text.includes('write') ||
    text.includes('code') ||
    text.includes('file') ||
    text.includes('terminal') ||
    text.includes('script') ||
    text.includes('tool') ||
    text.includes('agent-') ||
    text.includes('.ts') ||
    text.includes('.tsx') ||
    text.includes('.js') ||
    text.includes('kod') ||
    text.includes('dosya') ||
    text.includes('typo') ||
    text.includes('orchestrator')
  ) {
    return { Icon: Code, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  if (
    text.includes('tension') ||
    text.includes('contradiction') ||
    text.includes('negative_dialectics') ||
    text.includes('immanent') ||
    text.includes('çelişki')
  ) {
    return { Icon: Zap, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  if (
    text.includes('genealogy') ||
    text.includes('deconstruction') ||
    text.includes('materialist') ||
    text.includes('substance') ||
    text.includes('compass')
  ) {
    return { Icon: Compass, iconClass: 'text-stone-500 dark:text-stone-400' };
  }

  // Default reasoning / thought step icon (Clock as shown in Claude extended thinking UI)
  return { Icon: Clock, iconClass: 'text-stone-500 dark:text-stone-400' };
};

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ thinking, isLive = false }) => {
  const [isOpen, setIsOpen] = useState(isLive);

  // Auto-expand during live streaming, auto-collapse when done
  React.useEffect(() => {
    setIsOpen(isLive);
  }, [isLive]);

  const durationSeconds = thinking?.durationSeconds || 1.2;

  // Build full step list including "Done" step if completed
  const rawSteps = thinking?.steps || [];
  
  // Format summary header text
  const activeStep = rawSteps.length > 0 ? rawSteps[rawSteps.length - 1] : null;
  const headerSummaryText = thinking?.summary && thinking.summary !== 'Musing'
    ? thinking.summary
    : activeStep
    ? `${activeStep.title}${activeStep.detail ? `: ${activeStep.detail}` : ''}`
    : isLive
    ? 'Thinking...'
    : `Thought for ${durationSeconds.toFixed(1)} seconds`;

  // Process display steps list
  const displaySteps = [...rawSteps];

  // If process is finished (not live) and last step isn't "Done", append the "Done" step (matching screenshot)
  const hasDoneStep = displaySteps.some(s => s.title?.toLowerCase() === 'done');
  if (!isLive && !hasDoneStep && displaySteps.length > 0) {
    displaySteps.push({
      id: 'done-step',
      stepNumber: displaySteps.length + 1,
      title: 'Done',
      detail: '',
      completed: true,
    });
  }

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while live
  React.useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, isLive, isOpen]);

  return (
    <div className="my-2 select-none font-sans text-secondary w-full max-w-full">
      {/* Top Header Accordion Trigger (Clean Claude Style: Title on left, Chevron on right) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="group/status flex w-full items-center justify-between py-1 px-1 text-xs sm:text-[13px] text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors text-left cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2 min-w-0 pr-2 overflow-hidden">
          {isLive && (
            <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin shrink-0" />
          )}
          <span className="truncate text-stone-600 dark:text-stone-300 font-normal leading-tight">
            {headerSummaryText}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 1:1 Claude Extended Thinking Timeline Accordion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.9, 0.3, 1] }}
            className="overflow-hidden min-w-0"
          >
            <div ref={scrollRef} className="flex flex-col pl-1 pt-2 pb-1 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-600 pr-1">
              {displaySteps.map((step, index) => {
                const isLast = index === displaySteps.length - 1;
                const isCurrentActive = isLive && isLast;
                const { Icon: StepIcon, iconClass } = getStepIconAndStyle(step);

                return (
                  <div key={step.id || index} className="relative flex items-start gap-3 min-w-0">
                    {/* Icon Node & Inter-Icon Connecting Line Segment */}
                    <div className="relative flex flex-col items-center shrink-0 w-5 self-stretch">
                      <div className="relative z-10 flex items-center justify-center w-5 h-5 bg-bg-primary shrink-0">
                        {isCurrentActive ? (
                          <Loader2 className="w-3.5 h-3.5 text-stone-500 animate-spin" />
                        ) : (
                          <StepIcon className={`w-3.5 h-3.5 stroke-[1.4] ${iconClass}`} />
                        )}
                      </div>

                      {/* Precise connecting line segment strictly between icon i and icon i+1 */}
                      {!isLast && (
                        <div
                          className="w-[1px] flex-1 bg-stone-300 dark:bg-stone-700 my-1 min-h-[14px]"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Step Title & Details */}
                    <div className="flex-1 min-w-0 pt-0.5 pb-2.5">
                      {step.detail && step.title !== step.detail ? (
                        <>
                          <div className="text-[13px] text-stone-700 dark:text-stone-200 leading-snug font-normal break-words">
                            {step.title}
                          </div>
                          <div className="text-[12px] text-stone-500 dark:text-stone-400 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                            {step.detail.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                              part.match(/^https?:\/\//) ? (
                                <a
                                  key={i}
                                  href={part}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#3B82F6] dark:text-[#60A5FA] underline hover:opacity-80 font-mono text-[11px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {part}
                                </a>
                              ) : (
                                part
                              )
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-[13px] text-stone-600 dark:text-stone-300 leading-normal font-normal break-words">
                          {step.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
