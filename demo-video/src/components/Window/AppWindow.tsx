import React from "react";
import { Minus, Square, X } from "lucide-react";

interface AppWindowProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
  isFocused?: boolean;
}

export const AppWindow: React.FC<AppWindowProps> = ({
  title,
  icon,
  children,
  width = 920,
  height = 580,
  style = {},
  className = "",
  isFocused = true,
}) => {
  return (
    <div
      className={`flex flex-col rounded-2xl bg-white/95 backdrop-blur-2xl border border-[#e5e5e5] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden font-sans ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
    >
      {/* Window Titlebar */}
      <div className="h-10.5 px-3.5 bg-[#f8f9fa]/90 border-b border-[#e5e5e5] flex items-center justify-between select-none shrink-0">
        {/* macOS Traffic lights */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center group cursor-pointer">
            <X className="w-2 h-2 text-[#4c0002] opacity-0 group-hover:opacity-100" />
          </div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center group cursor-pointer">
            <Minus className="w-2 h-2 text-[#5e3b00] opacity-0 group-hover:opacity-100" />
          </div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center group cursor-pointer">
            <Square className="w-1.5 h-1.5 text-[#003b05] opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        {/* Window Title */}
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#2d3748]">
          {icon && <span className="opacity-80">{icon}</span>}
          <span>{title}</span>
        </div>

        {/* Right side spacer / status */}
        <div className="w-12" />
      </div>

      {/* Window Body */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
};
