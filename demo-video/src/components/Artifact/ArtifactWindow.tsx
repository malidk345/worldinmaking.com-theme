import React from "react";
import {
  Play,
  Code2,
  FileInput,
  Copy,
  TrendingUp,
  Activity,
  Users,
  Zap,
  ArrowUpRight,
} from "lucide-react";

interface ArtifactWindowProps {
  activeTab?: "preview" | "code";
  onTabChange?: (tab: "preview" | "code") => void;
  onAddToNotebook?: () => void;
}

export const ArtifactWindow: React.FC<ArtifactWindowProps> = ({
  activeTab = "preview",
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-white text-[#111111] font-sans">
      {/* Top Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-[#f9fafb]/90 backdrop-blur-md px-3.5 py-2 z-10 select-none">
        {/* Preview / Code switcher */}
        <div className="flex items-center gap-1 bg-[#ebebeb] rounded-lg p-0.5 border border-[#e5e7eb] text-xs">
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
              activeTab === "preview"
                ? "bg-white text-[#111111] shadow-2xs"
                : "text-[#6b7280]"
            }`}
          >
            <Play className="h-3 w-3" />
            <span>Preview</span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
              activeTab === "code"
                ? "bg-white text-[#111111] shadow-2xs"
                : "text-[#6b7280]"
            }`}
          >
            <Code2 className="h-3 w-3" />
            <span>Code</span>
          </div>
        </div>

        {/* Action Button: Add to Notebook */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer transition-all shadow-2xs">
            <FileInput className="h-3.5 w-3.5 text-blue-600" />
            <span>Add to notebook</span>
          </div>
        </div>
      </div>

      {/* Main Preview / Code Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-[#fafafa]">
        {activeTab === "preview" ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Live Interactive Analytics Card */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs">
                <div className="flex items-center justify-between text-[#6b7280] text-xs">
                  <span>Daily Active Users</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
                  48,290
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+14.2% from last week</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs">
                <div className="flex items-center justify-between text-[#6b7280] text-xs">
                  <span>Telemetry Latency</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
                  24ms
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>P99 Real-time Stream</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs">
                <div className="flex items-center justify-between text-[#6b7280] text-xs">
                  <span>Pipeline Health</span>
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
                  99.98%
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-blue-600">
                  <span>All 12 clusters green</span>
                </div>
              </div>
            </div>

            {/* Live Chart Area */}
            <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#111827]">
                    Throughput & Event Stream
                  </h4>
                  <p className="text-xs text-[#6b7280]">
                    Events processed per second across distributed edge nodes
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-[#f3f4f6] text-[11px] font-medium text-[#4b5563]">
                  Live 60s window
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-36 flex items-end gap-2 pt-4 border-b border-[#f3f4f6]">
                {[45, 62, 58, 80, 95, 72, 88, 110, 98, 125, 140, 130, 155, 148, 168].map(
                  (val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-sm hover:opacity-90 transition-all relative group"
                      style={{ height: `${(val / 180) * 100}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#111111] text-white text-[9px] px-1 rounded pointer-events-none transition-opacity">
                        {val}k
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#111827] text-[#f9fafb] rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
            <pre>{`export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState({ dau: 48290, latency: 24 })
  return (
    <div className="p-6 bg-white rounded-2xl border">
      <MetricCard title="Daily Active Users" value={metrics.dau} />
      <LatencyTracker latency={metrics.latency} />
    </div>
  )
}`}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
