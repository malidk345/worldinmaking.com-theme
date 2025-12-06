import React from 'react'

// Table of Contents - PostHog exact style with active indicator
function TableOfContents({ sections, activeSection, onSectionClick, contentRef }) {
    const handleClick = (e, sectionId) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSectionClick) {
            onSectionClick(sectionId);
        }
    };

    return (
        <div className="not-prose">
            <h4 className="font-semibold text-muted m-0 mb-2 text-xs uppercase tracking-wider">On this page</h4>
            <ul className="list-none m-0 p-0 flex flex-col relative">
                {sections.map((section, index) => (
                    <li key={section.id} className="relative leading-none m-0 pl-3">
                        {/* PostHog active indicator bar */}
                        {activeSection === section.id && (
                            <div className="absolute left-0 top-px bottom-px w-[3px] bg-red rounded-sm" />
                        )}
                        <button
                            type="button"
                            onClick={(e) => handleClick(e, section.id)}
                            className={`
                block w-full text-left py-2 pr-2 text-[15px] transition-colors leading-tight cursor-pointer
                ${activeSection === section.id
                                    ? 'font-bold text-primary dark:text-primary-dark'
                                    : 'text-secondary dark:text-primary-dark/60 hover:text-primary dark:hover:text-primary-dark hover:bg-accent/50'
                                }
              `}
                        >
                            {section.title}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default TableOfContents
