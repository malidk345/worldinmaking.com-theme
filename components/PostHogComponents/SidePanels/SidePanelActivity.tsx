/**
 * SidePanelActivity — 1-to-1 PostHog markup port
 * Original: posthog/frontend/src/layout/navigation-3000/sidepanel/panels/activity/SidePanelActivity.tsx
 * kea (useValues/useActions) replaced with React props/state.
 */
import React, { useRef } from 'react';
import { IconList, IconNotification } from '@posthog/icons';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { LemonSkeleton } from '../../LemonUI/LemonSkeleton/LemonSkeleton';
import { LemonTabs } from '../../LemonUI/LemonTabs/LemonTabs';
import { SidePanelPaneHeader } from './SidePanelPaneHeader';

const SCROLL_TRIGGER_OFFSET = 100;

export type SidePanelActivityTab = 'activity' | 'analytics';

export interface ActivityLogItem {
    id: string;
    scope: string;
    activity: string;
    detail?: { name?: string };
    user?: { first_name?: string; email?: string };
    created_at: string;
}

export interface SidePanelActivityProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab?: SidePanelActivityTab;
    onSetActiveTab?: (tab: SidePanelActivityTab) => void;
    allActivity?: ActivityLogItem[];
    allActivityResponseLoading?: boolean;
    allActivityHasNext?: boolean;
    onLoadOlderActivity?: () => void;
    hasContext?: boolean;
    contextLabel?: string;
    hasAccess?: boolean;
    showAnalyticsTab?: boolean;
    unreadCount?: number;
}

function ActivityRow({ item }: { item: ActivityLogItem }) {
    const name = item.user?.first_name ?? item.user?.email ?? 'Someone';
    const initial = name[0]?.toUpperCase() ?? '?';
    return (
        <div className="flex items-start gap-2 px-2 py-2 rounded hover:bg-fill-secondary transition-colors">
            <div className="size-6 rounded-full bg-accent-3000 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {initial}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-primary leading-snug">
                    <span className="font-semibold">{name}</span>
                    {' '}{item.activity}{' '}
                    {item.detail?.name && <span className="font-medium">{item.detail.name}</span>}
                </p>
                <span className="text-[10px] text-muted-alt font-mono">{item.created_at}</span>
            </div>
        </div>
    );
}

export function SidePanelActivity({
    isOpen,
    onClose,
    activeTab = 'activity',
    onSetActiveTab,
    allActivity = [],
    allActivityResponseLoading = false,
    allActivityHasNext = false,
    onLoadOlderActivity,
    hasContext = true,
    contextLabel,
    hasAccess = true,
    showAnalyticsTab = false,
}: SidePanelActivityProps): JSX.Element {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const lastScrollPositionRef = useRef(0);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
        if (e.currentTarget.scrollTop > lastScrollPositionRef.current) {
            const scrollPosition = e.currentTarget.scrollTop + e.currentTarget.clientHeight;
            if (e.currentTarget.scrollHeight - scrollPosition < SCROLL_TRIGGER_OFFSET) {
                onLoadOlderActivity?.();
            }
        }
        lastScrollPositionRef.current = e.currentTarget.scrollTop;
    };

    const tabs = [
        { key: 'activity' as const, label: 'Activity' },
        ...(showAnalyticsTab ? [{ key: 'analytics' as const, label: 'Analytics' }] : []),
    ];

    return (
        <SidePanel isOpen={isOpen} onClose={onClose} title={null} width="24rem">
            {!hasAccess ? (
                <>
                    <SidePanelPaneHeader title="Team activity" showCloseButton onClose={onClose} />
                    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
                        <IconNotification className="text-5xl text-muted" />
                        <div>
                            <div className="font-semibold mb-1">Access denied</div>
                            <div className="text-xs text-muted-alt">
                                You don&apos;t have sufficient permissions to view activity logs. Please contact your project
                                administrator.
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <SidePanelPaneHeader title="Team activity" showCloseButton onClose={onClose} />
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="mx-2 shrink-0">
                            <LemonTabs
                                activeKey={activeTab}
                                onChange={(key) => onSetActiveTab?.(key as SidePanelActivityTab)}
                                tabs={tabs}
                            />
                        </div>

                        {activeTab === 'activity' && hasContext && contextLabel && (
                            <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xs">
                                Activity on <strong>{contextLabel}</strong>
                            </div>
                        )}

                        <div
                            className="flex flex-col flex-1 overflow-y-auto"
                            ref={contentRef}
                            onScroll={handleScroll}
                        >
                            <div className="p-2 space-y-px">
                                {activeTab === 'activity' ? (
                                    hasContext ? (
                                        <>
                                            {allActivityResponseLoading ? (
                                                <LemonSkeleton className="h-12 my-2" repeat={10} />
                                            ) : allActivity.length ? (
                                                <>
                                                    {allActivity.map((logItem) => (
                                                        <ActivityRow item={logItem} key={logItem.id} />
                                                    ))}
                                                    <div className="flex items-center justify-center h-10 gap-2 m-4 text-secondary text-xs">
                                                        {allActivityHasNext ? (
                                                            <LemonButton
                                                                type="secondary"
                                                                fullWidth
                                                                onClick={() => onLoadOlderActivity?.()}
                                                            >
                                                                Load more
                                                            </LemonButton>
                                                        ) : (
                                                            'No more results'
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-center pt-1">
                                                        <a href="/activity" onClick={onClose} className="text-muted-alt text-xs hover:underline">
                                                            or browse all activity logs
                                                        </a>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 p-6 text-center border border-dashed rounded">
                                                    <span className="text-sm">No activity yet</span>
                                                    <LemonButton size="small" type="secondary" onClick={onClose}>
                                                        Browse all activity logs
                                                    </LemonButton>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
                                            <IconList className="text-5xl text-muted" />
                                            <div>
                                                <div className="font-semibold mb-1">Activity is context-aware</div>
                                                <div className="text-xs text-muted-alt">
                                                    Navigate to a page like dashboards or a specific dashboard to see
                                                    activity in this panel
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-alt">
                                                <div className="border-t flex-1" />
                                                <span>or</span>
                                                <div className="border-t flex-1" />
                                            </div>
                                            <LemonButton size="small" type="secondary" onClick={onClose}>
                                                Browse all activity logs
                                            </LemonButton>
                                        </div>
                                    )
                                ) : null}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SidePanel>
    );
}
