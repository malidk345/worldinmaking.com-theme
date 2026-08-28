import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Video,
} from "remotion";

export const MainDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Smooth camera pan & zoom over the real screen recording
  const scale = interpolate(
    frame,
    [0, 120, 300, 600, 1000, 1400, 1800],
    [1.0, 1.0, 1.06, 1.12, 1.08, 1.02, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const panX = interpolate(
    frame,
    [0, 120, 300, 600, 1000, 1400, 1800],
    [0, 0, -40, -80, -30, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const panY = interpolate(
    frame,
    [0, 120, 300, 600, 1000, 1400, 1800],
    [0, 0, -20, -40, -10, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Outro overlay fade in at the end
  const outroOpacity = interpolate(frame, [1650, 1750], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#0c0d12] font-sans select-none"
      style={{ width, height }}
    >
      {/* ── 100% Real Site Screen Recording ── */}
      <div
        className="w-full h-full origin-center"
        style={{
          transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
        }}
      >
        <Video
          src={staticFile("recordings/real-site-demo.webm")}
          className="w-full h-full object-cover"
        />
      </div>

      {/* ── Spotlight / Feature Callout Pills ── */}
      {frame >= 180 && frame <= 420 && (
        <div className="absolute top-16 right-8 px-4 py-2 rounded-2xl bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <span className="font-semibold">Claude Workspace AI</span>
          <span className="text-slate-400">· Multi-persona Bot System</span>
        </div>
      )}

      {frame >= 600 && frame <= 950 && (
        <div className="absolute top-16 right-8 px-4 py-2 rounded-2xl bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span className="font-semibold">Live Artifact Engine</span>
          <span className="text-slate-400">· Interactive UI & Mermaid Diagrams</span>
        </div>
      )}

      {frame >= 1100 && frame <= 1500 && (
        <div className="absolute top-16 right-8 px-4 py-2 rounded-2xl bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold">Markdown Notebooks</span>
          <span className="text-slate-400">· 1-Click Pure Live Preview Blocks</span>
        </div>
      )}

      {/* ── Outro Branding Overlay ── */}
      {frame >= 1650 && (
        <div
          className="absolute inset-0 z-50 bg-[#0b0c10]/90 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-8 select-none"
          style={{ opacity: outroOpacity }}
        >
          <div className="w-20 h-20 rounded-3xl bg-[#111111] border border-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            W
          </div>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white">
            WorldInMaking OS
          </h2>
          <p className="mt-3 text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
            The Autonomous Desktop Workspace with Live Interactive Artifacts, Markdown Notebooks, and AI Co-Authoring.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="px-6 py-3 rounded-xl bg-white text-[#111111] font-semibold text-sm shadow-lg">
              Explore Live Workspace
            </div>
            <div className="px-6 py-3 rounded-xl bg-white/10 text-white border border-white/20 font-semibold text-sm backdrop-blur-md">
              worldinmaking.com
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
