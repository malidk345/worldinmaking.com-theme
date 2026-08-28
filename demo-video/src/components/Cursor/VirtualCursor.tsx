import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface VirtualCursorProps {
  x: number;
  y: number;
  clickProgress?: number; // 0 to 1 for click ripple animation
  isPointer?: boolean;
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({
  x,
  y,
  clickProgress = 0,
  isPointer = false,
}) => {
  const rippleScale = interpolate(clickProgress, [0, 0.4, 1], [0.8, 2.2, 2.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rippleOpacity = interpolate(clickProgress, [0, 0.2, 0.9, 1], [0, 0.7, 0.1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        pointerEvents: "none",
        zIndex: 99999,
        transform: "translate(-2px, -2px)",
      }}
    >
      {/* Click ripple animation */}
      {clickProgress > 0 && clickProgress < 1 && (
        <div
          style={{
            position: "absolute",
            left: 2,
            top: 2,
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: "rgba(59, 130, 246, 0.4)",
            border: "2px solid rgba(59, 130, 246, 0.8)",
            transform: `translate(-50%, -50%) scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}

      {/* SVG Mouse Cursor */}
      {isPointer ? (
        // Hand pointer cursor
        <svg
          width="22"
          height="26"
          viewBox="0 0 24 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}
        >
          <path
            d="M8.5 2.5C8.5 1.67 9.17 1 10 1C10.83 1 11.5 1.67 11.5 2.5V11.5H13C13.83 11.5 14.5 12.17 14.5 13V14H16C16.83 14 17.5 14.67 17.5 15.5V17C17.5 17.28 17.42 17.53 17.29 17.75L19.34 20.82C19.76 21.46 19.58 22.31 18.94 22.73C18.3 23.15 17.45 22.97 17.03 22.33L14.67 18.8H14V21.5C14 24.54 11.54 27 8.5 27C5.46 27 3 24.54 3 21.5V14.5C3 13.67 3.67 13 4.5 13C5.33 13 6 13.67 6 14.5V15H8.5V2.5Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // Standard macOS / Windows sleek cursor
        <svg
          width="22"
          height="26"
          viewBox="0 0 18 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}
        >
          <path
            d="M1 1L7.5 20.5L10.8 13.2L17.5 11.2L1 1Z"
            fill="#0F172A"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};
