import React from 'react';
import '../lemon-ui.css';

export interface LemonSkeletonProps {
  className?: string;
  repeat?: number;
}

export function LemonSkeleton({ className = '', repeat = 1 }: LemonSkeletonProps) {
  const skeletons = Array.from({ length: repeat });

  return (
    <div className="flex flex-col gap-2 w-full">
      {skeletons.map((_, idx) => (
        <div
          key={idx}
          className={`LemonSkeleton h-4 rounded bg-[var(--color-accent-3000)] animate-pulse ${className}`}
        />
      ))}
    </div>
  );
}
