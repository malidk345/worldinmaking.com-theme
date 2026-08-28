import React from "react";
import {
  Search,
  Wifi,
  Volume2,
  Battery,
  Bell,
  Sparkles,
  Command,
  LayoutGrid,
} from "lucide-react";

interface TaskbarProps {
  activeTitle?: string;
}

export const Taskbar: React.FC<TaskbarProps> = ({ activeTitle = "WorldInMaking" }) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-[42px] z-50 flex items-center justify-between px-3 bg-[#ffffff]/85 backdrop-blur-xl border-b border-[#e5e5e5]/80 text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none text-[13px] font-sans">
      {/* Left items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-primary">
          <div className="w-5 h-5 rounded-md bg-[#111111] text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
            W
          </div>
          <span>WorldInMaking</span>
        </div>

        <span className="text-[#d1d5db]">/</span>

        <div className="flex items-center gap-1.5 font-medium text-[#4b5563]">
          <span className="truncate max-w-[200px]">{activeTitle}</span>
        </div>
      </div>

      {/* Center Search Pill */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#f3f4f6]/80 rounded-full border border-[#e5e7eb] text-[#6b7280] text-[12px] shadow-2xs">
        <Search className="w-3.5 h-3.5" />
        <span>Search apps, notebooks, or commands...</span>
        <span className="ml-2 px-1.5 py-0.2 bg-[#ffffff] rounded border border-[#d1d5db] text-[10px] font-mono text-[#4b5563]">
          ⌘K
        </span>
      </div>

      {/* Right System Indicators */}
      <div className="flex items-center gap-3 text-[#4b5563]">
        <div className="flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online</span>
        </div>

        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5" />
          <Volume2 className="w-3.5 h-3.5" />
          <Battery className="w-3.5 h-3.5" />
        </div>

        <div className="w-px h-3.5 bg-[#e5e7eb]" />

        <div className="flex items-center gap-1 font-medium text-[12px]">
          <span>Thu Aug 27</span>
          <span className="font-semibold text-[#111111]">14:30</span>
        </div>
      </div>
    </div>
  );
};
