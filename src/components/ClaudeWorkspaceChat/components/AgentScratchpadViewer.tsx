import React, { useState } from 'react';
import { ToolTrace } from '../types';
import { BookOpen, CheckCircle2, Circle, Clock, ChevronDown, FileText, Sparkles, ExternalLink } from 'lucide-react';
import { useApp } from '../../../context/App';

interface AgentScratchpadViewerProps {
  toolTrace?: ToolTrace[];
}

interface ParsedTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface ParsedNote {
  content: string;
  source?: string;
}

export const AgentScratchpadViewer: React.FC<AgentScratchpadViewerProps> = ({ toolTrace }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { addWindow } = useApp();

  if (!toolTrace || toolTrace.length === 0) return null;

  const notes: ParsedNote[] = [];
  let tasks: ParsedTask[] = [];

  for (const trace of toolTrace) {
    if (trace.name === 'write_scratchpad' || trace.name === 'scratchpad' || trace.name === 'take_notes') {
      try {
        const parsed = JSON.parse(trace.arguments || '{}');
        if (parsed.content || parsed.note) {
          notes.push({
            content: parsed.content || parsed.note,
            source: parsed.source || trace.detail,
          });
        }
      } catch {
        if (trace.detail) {
          notes.push({ content: trace.detail });
        }
      }
    }

    if (trace.name === 'todo_write' || trace.name === 'plan_task' || trace.name === 'tasks') {
      try {
        const parsed = JSON.parse(trace.arguments || '{}');
        if (Array.isArray(parsed.tasks)) {
          tasks = parsed.tasks;
        }
      } catch {
        /* ignore parsing fallback */
      }
    }
  }

  if (notes.length === 0 && tasks.length === 0) return null;

  const handleOpenWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    addWindow({ path: '/scratchpad', title: 'Scratchpad' });
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-primary/20 bg-accent/30 text-primary transition-all">
      {/* Header / Summary Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-accent/50 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[#1E3A8A] dark:text-blue-400 font-medium">
            <Sparkles className="size-3.5" />
            <span>AI Working Memory & Plan</span>
          </div>

          {notes.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <BookOpen className="size-3" />
              {notes.length} {notes.length === 1 ? 'Note' : 'Notes'} in Scratchpad
            </span>
          )}

          {tasks.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-700 dark:text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="size-3" />
              {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} Tasks
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenWindow}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[#1E3A8A] dark:text-blue-400 hover:bg-primary/10 border border-[#1E3A8A]/20 cursor-pointer"
            title="Open dedicated Scratchpad desktop window"
          >
            <ExternalLink className="size-3" />
            <span>Open Window</span>
          </button>
          <ChevronDown className={`size-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-primary/10 px-3 py-2.5 space-y-3 text-xs">
          {/* Active Tasks / Plan */}
          {tasks.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 font-semibold text-[11px] text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                <span>Execution Plan</span>
              </div>
              <div className="space-y-1">
                {tasks.map((task, idx) => (
                  <div
                    key={task.id || idx}
                    className="flex items-start gap-2 rounded px-2 py-1 bg-background/60 border border-primary/10"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="size-3.5 mt-0.5 text-emerald-600 shrink-0" />
                    ) : task.status === 'in_progress' ? (
                      <Clock className="size-3.5 mt-0.5 text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <Circle className="size-3.5 mt-0.5 text-stone-400 shrink-0" />
                    )}
                    <span
                      className={`text-[12px] leading-tight ${
                        task.status === 'completed'
                          ? 'line-through text-stone-500 dark:text-stone-400'
                          : task.status === 'in_progress'
                          ? 'font-medium text-primary'
                          : 'text-secondary'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Working Memory Scratchpad */}
          {notes.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 font-semibold text-[11px] text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                <BookOpen className="size-3 text-amber-600" />
                <span>Scratchpad Working Memory</span>
              </div>
              <div className="space-y-1.5">
                {notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-2 text-[12px] leading-relaxed text-stone-800 dark:text-stone-200"
                  >
                    <p className="whitespace-pre-wrap break-words">{note.content}</p>
                    {note.source && (
                      <div className="mt-1 flex items-center gap-1 text-[10.5px] font-medium text-amber-700 dark:text-amber-400">
                        <FileText className="size-3 shrink-0" />
                        <span>Source: {note.source}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
