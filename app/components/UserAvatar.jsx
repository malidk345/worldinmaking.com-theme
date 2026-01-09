import React from 'react';
import Image from 'next/image';

const UserAvatar = ({ src, name, size = 32, className = '' }) => {
    // If src exists, is valid URL, and not a placeholder/fake URL (optional check)
    // For now, assume if user provides src, it's valid. 
    // But user asked to remove "fake profile photo urls".
    // We should check if src is truthy and not a known placeholder if we had any hardcoded ones.
    // Since we are replacing hardcoded ones with this component, passing valid src or null is caller's responsibility.

    const hasImage = src && src.length > 0;

    return (
        <div
            className={`relative rounded-full overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center border border-black/5 ${className}`}
            style={{ width: size, height: size }}
        >
            {hasImage ? (
                <Image
                    src={src}
                    alt={name || 'User'}
                    fill
                    className="object-cover"
                    unoptimized
                />
            ) : (
                <span
                    className="font-bold text-gray-500 uppercase select-none"
                    style={{ fontSize: size * 0.45 }}
                >
                    {(name || 'U').charAt(0)}
                </span>
            )}
        </div>
    );
};

export default UserAvatar;
