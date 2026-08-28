import React from "react";
import {
  Sparkles,
  ChevronDown,
  ArrowUp,
  Plus,
  Compass,
  FileCode,
  Layout,
  BarChart3,
  Bot,
  Copy,
  Eye,
  FileInput,
  BrainCircuit,
} from "lucide-react";

interface WorkspaceChatProps {
  typedPrompt?: string;
  isStreaming?: boolean;
  streamProgress?: number; // 0 to 1
  isArtifactVisible?: boolean;
  onArtifactClick?: () => void;
}

export const WorkspaceChat: React.FC<WorkspaceChatProps> = ({
  typedPrompt = "",
  isStreaming = false,
  streamProgress = 0,
  isArtifactVisible = false,
}) => {
  return (
    <div className="flex h-full w-full bg-white text-[#111111] font-sans">
      {/* Sidebar */}
      <div className="w-56 h-full border-r border-[#e5e7eb] bg-[#f9fafb]/80 flex flex-col p-3 select-none shrink-0">
        <button className="flex items-center justify-between w-full px-3 py-2 bg-white border border-[#e5e7eb] rounded-xl text-[13px] font-medium text-[#1f2937] shadow-xs hover:bg-[#f3f4f6]">
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>New Chat</span>
          </span>
          <span className="text-[11px] text-[#9ca3af] font-mono">⌘N</span>
        </button>

        <div className="mt-4 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider px-1">
          Recent Chats
        </div>

        <div className="mt-2 space-y-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50/70 text-blue-700 text-[12.5px] font-medium border border-blue-200/50">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate">System Analytics Architecture</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#4b5563] text-[12.5px] hover:bg-[#f3f4f6] transition-colors">
            <BarChart3 className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="truncate">PostHog SQL queries</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#4b5563] text-[12.5px] hover:bg-[#f3f4f6] transition-colors">
            <FileCode className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="truncate">Supabase RLS Policy rules</span>
          </div>
        </div>

        {/* Model Selector at bottom */}
        <div className="mt-auto pt-3 border-t border-[#e5e7eb]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5e7eb] text-[12px] shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px]">
                N
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[#111111] leading-tight">Nietzsche</span>
                <span className="text-[10px] text-[#6b7280]">Claude 3.5 Sonnet</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#9ca3af]" />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Message */}
          {typedPrompt && (
            <div className="flex justify-end">
              <div className="max-w-[70%] px-4 py-2.5 rounded-2xl bg-[#111111] text-white text-[13.5px] leading-relaxed shadow-sm font-sans">
                {typedPrompt}
              </div>
            </div>
          )}

          {/* AI Response Stream */}
          {isStreaming && (
            <div className="flex flex-col space-y-3 max-w-[85%]">
              {/* Thinking Block Accordion */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-200/60 text-purple-700 text-[12px] font-medium w-fit shadow-2xs">
                <BrainCircuit className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                <span>Thought for 1.8 seconds (Analyzing system architecture & telemetry data)</span>
                <ChevronDown className="w-3 h-3 text-purple-400 ml-1" />
              </div>

              {/* Assistant Message Bubble */}
              <div className="text-[14px] leading-relaxed text-[#1f2937] space-y-2">
                <p>
                  I've designed an end-to-end <strong>Real-time Analytics Dashboard & Pipeline Architecture</strong> tailored for your workspace.
                </p>
                <p className="text-[#4b5563] text-[13px]">
                  Here is the interactive component artifact and visual flow diagram ready for your notebook:
                </p>
              </div>

              {/* Artifact Card */}
              {isArtifactVisible && (
                <div className="mt-3 p-3.5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-purple-50/40 shadow-[0_4px_16px_rgba(59,130,246,0.12)] flex items-center justify-between group hover:border-blue-300 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Layout className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-[#111827] group-hover:text-blue-600 transition-colors">
                        AnalyticsDashboard.tsx
                      </div>
                      <div className="text-[11.5px] text-[#6b7280]">
                        Interactive React UI · Live Metrics & Charts · v1.2
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-[#e5e7eb] text-[12px] font-medium text-[#374151] flex items-center gap-1.5 shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open Preview</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#e5e7eb] bg-white">
          <div className="relative flex items-center bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-2 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <input
              type="text"
              placeholder="Ask anything or generate an interactive artifact..."
              value={typedPrompt}
              readOnly
              className="w-full bg-transparent px-3 py-1.5 text-[13.5px] text-[#111827] outline-none placeholder-[#9ca3af]"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button className="w-8 h-8 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-xs hover:bg-[#333333] transition-colors">
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
