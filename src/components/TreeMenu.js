import React from 'react'
import { IconDocument } from './Icons'

// TreeMenu - PostHog exact style sidebar navigation with active bar
function TreeMenu({ items, activeItem, onItemClick }) {
    const handleClick = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        if (onItemClick) {
            onItemClick(item);
        }
    };

    return (
        <div className="not-prose flex flex-col space-y-0.5">
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={(e) => handleClick(e, item)}
                    type="button"
                    className={`
            relative w-full text-left pl-4 pr-2 py-2 text-[15px] leading-tight
            transition-opacity flex items-center gap-1.5 cursor-pointer
            ${activeItem === item.id
                            ? 'font-bold text-primary dark:text-primary-dark opacity-100'
                            : 'text-secondary dark:text-primary-dark/75 opacity-60 hover:opacity-100 hover:text-primary dark:hover:text-primary-dark hover:bg-accent/50'
                        }
          `}
                >
                    {/* PostHog active bar indicator */}
                    {activeItem === item.id && (
                        <div className="absolute left-0 top-px bottom-px w-[3px] bg-red rounded-sm" />
                    )}
                    <IconDocument className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                </button>
            ))}
        </div>
    )
}

export default TreeMenu
