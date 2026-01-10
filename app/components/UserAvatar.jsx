"use client";

import React from 'react';
import Image from 'next/image';

/**
 * UserAvatar Component
 * Displays user profile image or initial fallback
 * 
 * @param {string} src - Image URL (optional)
 * @param {string} name - User name for initial fallback
 * @param {number} size - Avatar size in pixels (default: 32)
 * @param {string} className - Additional CSS classes
 */
const UserAvatar = React.memo(({ src, name = 'User', size = 32, className = '' }) => {
    // Check for valid image source
    const hasValidImage = src && typeof src === 'string' && src.length > 0;

    // Get the initial letter
    const initial = (name || 'U').charAt(0).toUpperCase();

    // Calculate font size based on avatar size
    const fontSize = Math.round(size * 0.45);

    return (
        <div
            className={`relative rounded-full overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center border border-black/15 ${className}`}
            style={{ width: size, height: size }}
            role="img"
            aria-label={`${name}'s avatar`}
        >
            {hasValidImage ? (
                <Image
                    src={src}
                    alt={`${name}'s avatar`}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={(e) => {
                        // Hide broken image and show initial instead
                        e.currentTarget.style.display = 'none';
                    }}
                />
            ) : null}

            {/* Initial fallback - always rendered but hidden when image loads */}
            <span
                className={`font-bold text-gray-500 uppercase select-none ${hasValidImage ? 'hidden' : ''}`}
                style={{ fontSize }}
                aria-hidden="true"
            >
                {initial}
            </span>
        </div>
    );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;

