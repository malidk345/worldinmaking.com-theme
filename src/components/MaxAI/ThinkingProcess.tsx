import React, { useState } from 'react'
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  Database,
  Search,
  Code2,
  Terminal,
  FileSearch,
} from 'lucide-react'
import { ThinkingStep } from './maxTypes'

interface ThinkingProcessProps {
  steps: ThinkingStep[]
  thinkingTimeMs?: number
  isLive?: boolean
}

const getStepIcon = (iconType?: string, isRunning?: boolean, isCompleted?: boolean, isPending?: boolean) => {
  if (isRunning) {
    return <Loader2 className="w-3.5 h-3.5 text-blue animate-spin shrink-0" />
  }

  if (isPending) {
    return <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
  }

  switch (iconType) {
    case 'parse':
      return <FileSearch className="w-3.5 h-3.5 text-primary shrink-0" />
    case 'database':
      return <Database className="w-3.5 h-3.5 text-primary shrink-0" />
    case 'search':
      return <Search className="w-3.5 h-3.5 text-primary shrink-0" />
    case 'code':
      return <Code2 className="w-3.5 h-3.5 text-primary shrink-0" />
    case 'terminal':
      return <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
    case 'brain':
    default:
      return <BrainCircuit className="w-3.5 h-3.5 text-primary shrink-0" />
  }
}

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  steps,
  thinkingTimeMs,
  isLive = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(isLive)

  if (!steps || steps.length === 0) return null

  const seconds = thinkingTimeMs ? (thinkingTimeMs / 1000).toFixed(1) : (steps.length * 0.4).toFixed(1)

  return (
    <div className="w-full mb-3 text-xs font-rounded select-none">
      <button
        type="button"
        id="btn-toggle-thinking-process"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1.5 px-2 -ml-2 rounded-md hover:bg-accent-light dark:hover:bg-accent-dark text-primary transition-all cursor-pointer group font-rounded"
      >
        <div className="flex items-center gap-1.5 font-medium">
          {isLive ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          ) : (
            <BrainCircuit className="w-3.5 h-3.5 text-primary group-hover:text-blue transition-colors" />
          )}

          <span className="text-primary font-bold font-rounded">
            {isLive ? 'Thinking...' : `Thought for ${seconds} seconds`}
          </span>
        </div>

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-colors" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-colors" />
        )}
      </button>

      {isOpen && (
        <div className="mt-1.5 ml-1 pl-3 border-l-2 border-accent-light dark:border-accent-dark space-y-2.5 py-1 transition-all font-sans">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed'
            const isRunning = step.status === 'running'
            const isPending = step.status === 'pending'

            return (
              <div key={step.id} className="space-y-0.5">
                <div className="flex items-center gap-2 text-[12px]">
                  {getStepIcon(step.iconType, isRunning, isCompleted, isPending)}

                  <span
                    className={
                      isRunning
                        ? 'text-primary font-bold font-rounded'
                        : isPending
                        ? 'opacity-50 font-normal font-sans'
                        : 'text-primary font-medium font-sans'
                    }
                  >
                    {step.label}
                  </span>

                  {isCompleted && (
                    <Check className="w-3 h-3 text-blue ml-1 shrink-0 font-bold" />
                  )}

                  {step.durationMs && (
                    <span className="text-[10px] opacity-60 font-code ml-auto">
                      {step.durationMs}ms
                    </span>
                  )}
                </div>

                {step.detail && !isPending && (
                  <p className="pl-5 text-[11px] opacity-75 font-code leading-relaxed">
                    {step.detail}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
