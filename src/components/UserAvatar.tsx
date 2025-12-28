'use client';
import React, { useState } from 'react';
import Image from 'next/image';

interface UserAvatarProps {
    src?: string | null;
    name: string;
    size?: number; // width/height in px
    className?: string;
}

export const UserAvatar = ({ src, name, size = 32, className = '' }: UserAvatarProps) => {
    const [hasError, setHasError] = useState(false);

    // Check if src is a valid URL string AND not a known fake avatar service
    const isValidSrc = src &&
        typeof src === 'string' &&
        (src.startsWith('http') || src.startsWith('/')) &&
        !src.includes('pravatar.cc') &&
        !src.includes('ui-avatars.com') &&
        !hasError; // Also check if image failed to load

    // Fallback: Show Initial
    const initial = (name && name.length > 0) ? name.charAt(0).toUpperCase() : '?';

    if (isValidSrc) {
        return (
            <div
                className={`relative rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shrink-0 ${className}`}
                style={{ width: size, height: size }}
            >
                <Image
                    src={src!}
                    alt={name || 'user'}
                    fill
                    className="object-cover"
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    // Fallback Avatar - inline JSX instead of component
    return (
        <div
            className={`rounded-full flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-200 dark:bg-white/10 border border-black/5 dark:border-white/5 shrink-0 ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
            {initial}
        </div>
    );
};
