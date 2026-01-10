"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import UserAvatar from './UserAvatar';
import { useWindow } from '../contexts/WindowContext';

export default function InsightCard({
    id,
    title,
    type,
    ribbonColor,
    description,
    date,
    author,
    authorAvatar,
    image,
    children
}) {
    const { openWindow } = useWindow();

    // Validate required props
    if (!id) {
        return null;
    }

    const displayDate = date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const displayAuthor = author || 'Unknown';
    const displayType = type || 'General';

    const handleAuthorClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openWindow('author-profile', {
            id: `author-${displayAuthor}`,
            title: `Author: @${displayAuthor}`,
            username: displayAuthor,
            isMaximized: false,
            initialWidth: 400,
            initialHeight: 550
        });
    };

    return (
        <Link
            href={`/post?id=${id}`}
            className="relative h-full flex flex-col"
            aria-label={`Read article: ${title}`}
        >
            {/* PostHog-inspired color ribbon - spans full card height */}
            {ribbonColor && (
                <div
                    className={`CardMeta__ribbon CardMeta__ribbon--${ribbonColor}`}
                    aria-hidden="true"
                />
            )}

            <div className="CardMeta flex-1 flex flex-col">
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="CardMeta__primary min-h-0">
                        <div className="CardMeta__main flex flex-col pb-0">
                            <div className="CardMeta__top">
                                {/* Meta information */}
                                <div className="CardMeta__tag-group">
                                    <span className="CardMeta__tag-item">{displayType}</span>
                                    <span className="CardMeta__tag-separator" aria-hidden="true">•</span>
                                    <svg
                                        className="CardMeta__tag-icon"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                        aria-hidden="true"
                                    >
                                        <path
                                            clipRule="evenodd"
                                            d="M6.75 3a.75.75 0 0 1 .75.75V5h9V3.75a.75.75 0 0 1 1.5 0V5h1.25A1.75 1.75 0 0 1 21 6.75v12.5A1.75 1.75 0 0 1 19.25 21H4.75A1.75 1.75 0 0 1 3 19.25V6.75A1.75 1.75 0 0 1 4.75 5H6V3.75A.75.75 0 0 1 6.75 3ZM4.5 9.5v9.75c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25V9.5h-15Z"
                                            fillRule="evenodd"
                                        />
                                    </svg>
                                    <span className="CardMeta__tag-item">{displayDate}</span>
                                    <span className="CardMeta__tag-separator" aria-hidden="true">•</span>
                                    <div
                                        className="CardMeta__tag-avatar relative cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={handleAuthorClick}
                                    >
                                        <UserAvatar
                                            src={authorAvatar}
                                            name={displayAuthor}
                                            size={16}
                                        />
                                    </div>
                                    <span
                                        className="CardMeta__tag-item cursor-pointer hover:text-[#254b85] transition-colors"
                                        onClick={handleAuthorClick}
                                    >
                                        {displayAuthor}
                                    </span>
                                </div>
                            </div>

                            <h4
                                title={title}
                                className="leading-tight line-clamp-2 text-lg font-bold text-primary hover:text-accent transition-colors"
                                data-attr="insight-card-title"
                            >
                                {title}
                            </h4>

                            <div className="LemonMarkdown CardMeta__description mt-1">
                                <p
                                    className="line-clamp-5"
                                    style={{ fontSize: '14px', lineHeight: '21px', color: 'rgb(0, 0, 0)' }}
                                >
                                    {description || "No description available."}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Top gap */}
                    <div className="flex-1" aria-hidden="true" />
                    {/* Divider - only show when image exists */}
                    {image && <div className="CardMeta__divider" aria-hidden="true" />}
                </div>
                {/* Bottom gap - only show when image exists */}
                {image && <div className="flex-1" aria-hidden="true" />}
            </div>

            {/* Image section - only show if image exists */}
            {image && (
                <div className="InsightCard__viz px-3 pb-3 pt-0 flex-none h-[140px]">
                    <div className="w-full h-full border border-[#a8a8a8] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative group">
                        {children ? children : (
                            <Image
                                src={image}
                                alt={title ? `Image for ${title}` : "Post image"}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                unoptimized
                                onError={(e) => {
                                    // Hide image on error
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </Link>
    );
}
