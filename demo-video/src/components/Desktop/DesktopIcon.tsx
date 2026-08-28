import React from "react";

interface DesktopIconProps {
  label: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({
  label,
  icon,
  isSelected = false,
}) => {
  return (
    <div
      className={`group flex flex-col items-center justify-center w-[84px] p-2 rounded-xl transition-all cursor-pointer select-none ${
        isSelected
          ? "bg-blue-500/20 border border-blue-500/40 shadow-sm"
          : "hover:bg-white/10 border border-transparent"
      }`}
    >
      <div className="w-13 h-13 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.12)] flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <span
        className={`mt-1.5 text-[11px] font-medium text-center truncate max-w-[76px] px-1.5 py-0.5 rounded ${
          isSelected
            ? "bg-blue-600 text-white"
            : "text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
};
