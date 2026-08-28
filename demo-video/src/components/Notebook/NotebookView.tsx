import React from "react";
import {
  FileText,
  Plus,
  Share2,
  MoreHorizontal,
  CheckCircle2,
  Sparkles,
  BarChart,
  Layout,
} from "lucide-react";

interface NotebookViewProps {
  isBlockInserted?: boolean;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  isBlockInserted = true,
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-white text-[#111111] font-sans">
      {/* Notebook Toolbar */}
      <div className="h-11 px-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa] select-none shrink-0">
        <div className="flex items-center gap-2 text-xs text-[#4b5563]">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-[#111827]">
            System_Architecture_2026.nb
          </span>
          <span className="text-[#9ca3af]">·</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Saved</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#e5e7eb] text-xs font-medium text-[#374151] shadow-2xs hover:bg-[#f3f4f6]">
            <Share2 className="w-3.5 h-3.5 text-[#6b7280]" />
            <span>Share</span>
          </button>
          <button className="p-1 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notebook Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-6">
        {/* Document Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            Real-time Edge Architecture & Analytics
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Autonomous system telemetry, AI co-authoring notes, and live telemetry widgets.
          </p>
        </div>

        {/* Text paragraph */}
        <div className="text-sm leading-relaxed text-[#374151] space-y-3">
          <p>
            The new edge routing layer orchestrates high-concurrency event ingestion across all active regions. Below is the live telemetry component connected directly to the data stream:
          </p>
        </div>

        {/* Live Rendered Block */}
        {isBlockInserted && (
          <div className="p-4 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-purple-50/30 shadow-[0_4px_20px_rgba(59,130,246,0.08)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e7eb]/60 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <Layout className="w-4 h-4 text-blue-600" />
                <span>Live Interactive Component Block</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                wim-ui
              </span>
            </div>

            {/* Rendered Metric Pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#e5e7eb] shadow-2xs">
                <div className="text-xs text-[#6b7280]">Live Ingestion Rate</div>
                <div className="text-lg font-bold text-[#111827]">148.5k / sec</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#e5e7eb] shadow-2xs">
                <div className="text-xs text-[#6b7280]">Global Edge P99</div>
                <div className="text-lg font-bold text-emerald-600">18.2 ms</div>
              </div>
            </div>
          </div>
        )}

        {/* Trailing Note */}
        <div className="p-3 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] text-xs text-[#6b7280] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Co-authored with Nietzsche AI Bot · Synced with Supabase RLS DB</span>
        </div>
      </div>
    </div>
  );
};
