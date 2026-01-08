import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function InsightCard({ id, title, type, ribbonColor, description, date, author, image, children }) {
    return (
        <Link href={`/post?id=${id}`} className="relative h-full flex flex-col">
            {/* PostHog-inspired color ribbon - now spans full card height */}
            {ribbonColor && (
                <div className={`CardMeta__ribbon CardMeta__ribbon--${ribbonColor}`} />
            )}
            <div className="CardMeta flex-1 flex flex-col">
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="CardMeta__primary min-h-0">
                        {/* pb-0 is critical here to remove the 12px bottom padding that would skew the vertical centering of the gap */}
                        <div className="CardMeta__main flex flex-col pb-0">
                            <div className="CardMeta__top">
                                {/* Single combined meta container */}
                                <div className="CardMeta__tag-group">
                                    <span className="CardMeta__tag-item">{type || 'Category'}</span>
                                    <span className="CardMeta__tag-separator">•</span>
                                    <svg className="CardMeta__tag-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path clipRule="evenodd" d="M6.75 3a.75.75 0 0 1 .75.75V5h9V3.75a.75.75 0 0 1 1.5 0V5h1.25A1.75 1.75 0 0 1 21 6.75v12.5A1.75 1.75 0 0 1 19.25 21H4.75A1.75 1.75 0 0 1 3 19.25V6.75A1.75 1.75 0 0 1 4.75 5H6V3.75A.75.75 0 0 1 6.75 3ZM4.5 9.5v9.75c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25V9.5h-15Z" fillRule="evenodd"></path>
                                    </svg>
                                    <span className="CardMeta__tag-item">{date || '20 Jan 2025'}</span>
                                    <span className="CardMeta__tag-separator">•</span>
                                    <div className="CardMeta__tag-avatar relative">
                                        <Image
                                            src="https://i.pravatar.cc/150?u=wim"
                                            alt="Author"
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                            unoptimized={true}
                                        />
                                    </div>
                                    <span className="CardMeta__tag-item">{author || 'Wim Author'}</span>
                                </div>
                            </div>
                            <h4 title={title} className="leading-tight line-clamp-2 text-lg font-bold text-primary hover:text-accent transition-colors" data-attr="insight-card-title">
                                {title}
                            </h4>
                            <div className="LemonMarkdown CardMeta__description mt-1">
                                <p className="line-clamp-5" style={{ fontSize: '14px', lineHeight: '21px', color: 'rgb(101, 103, 94)' }}>
                                    {description || "Retention is the lifeblood of any SaaS application. Explore key metrics driving user engagement and optimize your product to keep users coming back. We cover cohort analysis, churn prediction, and actionable strategies to improve customer lifetime value and reduce churn rates effectively."}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Top gap */}
                    <div className="flex-1" />
                    {/* The divider line is the terminal point for the ribbon */}
                    <div className="CardMeta__divider" />
                </div>
                {/* Bottom gap - exactly equal to top gap due to dual flex-1 siblings */}
                <div className="flex-1" />
            </div>
            <div className="InsightCard__viz px-3 pb-3 pt-0 flex-none h-[140px]">
                <div className="w-full h-full border border-primary rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative group">
                    {children ? children : (
                        <Image
                            src={image || "https://placehold.co/600x400/EEE/313438"}
                            alt="Post Visual"
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized={true}
                        />
                    )}
                </div>
            </div>
        </Link >
    );
}


