import React from 'react';
import { IconX } from '@posthog/icons';

export type SidePanelPaneHeaderProps = {
    title?: string | React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    onClose?: () => void;
    showCloseButton?: boolean;
}

export function SidePanelPaneHeader({
    children,
    title,
    className,
    onClose,
    showCloseButton = false,
}: SidePanelPaneHeaderProps): JSX.Element {
    return (
        <header
            className={[
                'scene-panel-pane-header border-b shrink-0 flex items-center justify-end',
                'sticky top-0 h-[40px] bg-primary border-b-0 py-0 px-2 pb-px rounded justify-between m-0 mb-5 z-60 border border-primary/30',
                className,
            ].filter(Boolean).join(' ')}
        >
            {title ? (
                <h3 className="flex items-center gap-1 font-semibold mb-0 truncate pr-1 pl-2 flex-none text-sm">
                    {title}
                </h3>
            ) : null}

            {children}

            {showCloseButton && (
                <button
                    onClick={onClose}
                    className="size-6 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <IconX className="size-3 text-tertiary" />
                </button>
            )}
        </header>
    );
}
