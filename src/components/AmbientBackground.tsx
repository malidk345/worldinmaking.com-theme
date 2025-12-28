'use client';
import React from 'react';

export const AmbientBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white dark:bg-black transition-colors duration-300">
            {/* Radial Gradient Glow - Deep Navy Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 dark:bg-indigo-500/10 rounded-full blur-[100px] opacity-60" />

            {/* Vignette */}
            <div className="absolute inset-0 bg-radial-gradient-vignette dark:bg-radial-gradient-vignette-dark" />
            <style>{`
        .bg-radial-gradient-vignette {
            background: radial-gradient(circle at center, transparent 0%, #ffffff 90%);
        }
        .bg-radial-gradient-vignette-dark {
            background: radial-gradient(circle at center, transparent 0%, #000000 90%);
        }
      `}</style>
        </div>
    );
};
