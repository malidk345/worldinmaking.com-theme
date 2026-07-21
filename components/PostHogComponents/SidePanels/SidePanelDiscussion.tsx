/**
 * SidePanelDiscussion — 1-to-1 PostHog markup port
 * Original: posthog/frontend/src/layout/navigation-3000/sidepanel/panels/discussion/SidePanelDiscussion.tsx
 * kea (useValues/useActions) replaced with React props/state.
 * CommentsList, CommentComposer, SidePanelContentContainer replaced structurally.
 */
import React, { useState } from 'react';
import { IconChat } from '@posthog/icons';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { SidePanelPaneHeader } from './SidePanelPaneHeader';

export interface Comment {
    id: string;
    created_by?: { first_name?: string; email?: string; hedgehog_config?: { color?: string } };
    content: string;
    created_at: string;
    source_comment?: string | null;
}

export interface SidePanelDiscussionProps {
    isOpen: boolean;
    onClose: () => void;
    /** e.g. 'Dashboard', 'Insight' */
    scope?: string;
    /** If scoped to a specific item */
    itemId?: string;
    comments?: Comment[];
    commentCount?: number;
    onAddComment?: (text: string) => Promise<void> | void;
    disabled?: boolean;
}

function CommentBubble({ comment }: { comment: Comment }) {
    const name = comment.created_by?.first_name ?? comment.created_by?.email ?? 'Unknown';
    const initial = name[0]?.toUpperCase() ?? '?';
    return (
        <div className="flex gap-3 items-start">
            {/* Avatar */}
            <div className="size-6 rounded-full bg-accent-3000 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {initial}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-primary">{name}</span>
                    <span className="text-[9px] text-muted-alt font-mono">{comment.created_at}</span>
                </div>
                <p className="text-xs text-primary leading-relaxed bg-fill-secondary border border-primary/10 rounded-lg px-2.5 py-1.5">
                    {comment.content}
                </p>
            </div>
        </div>
    );
}

export function SidePanelDiscussion({
    isOpen,
    onClose,
    scope,
    itemId,
    comments = [],
    commentCount = 0,
    onAddComment,
    disabled = false,
}: SidePanelDiscussionProps): JSX.Element {
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!draft.trim() || submitting) return;
        setSubmitting(true);
        await onAddComment?.(draft.trim());
        setDraft('');
        setSubmitting(false);
    };

    /* PostHog original title construction */
    const discussionTitle = (
        <div className="flex space-x-2">
            <span>
                Discussion{' '}
                {scope ? (
                    <span className="font-normal text-secondary">
                        about {itemId ? 'this' : ''} {scope.toLowerCase()}
                    </span>
                ) : null}
            </span>
        </div>
    );

    return (
        <SidePanel isOpen={isOpen} onClose={onClose} title={null} width="26rem">
            {/* SidePanelContentContainer equivalent */}
            <div className="flex flex-col overflow-hidden flex-1">

                {disabled ? (
                    /* Disabled state from PostHog original */
                    <>
                        <SidePanelPaneHeader title={discussionTitle} showCloseButton onClose={onClose} />
                        <div className="mx-auto p-8 max-w-160 mt-8">
                            <h2>Discussions aren&apos;t supported here yet...</h2>
                            <p>
                                This is a beta feature that is currently only available when viewing things like an
                                Insight, Dashboard or Notebook.
                            </p>
                        </div>
                    </>
                ) : (
                    /* Active discussion */
                    <>
                        {/* Header */}
                        <SidePanelPaneHeader title={discussionTitle} showCloseButton onClose={onClose} />

                        {/* CommentsList equivalent — scrollable */}
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
                            {comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-alt">
                                    <IconChat className="size-8 opacity-30" />
                                    <span className="text-xs">No comments yet. Start the discussion!</span>
                                </div>
                            ) : (
                                comments.map((c) => <CommentBubble key={c.id} comment={c} />)
                            )}
                        </div>

                        {/* CommentComposer equivalent */}
                        <div className="border-t border-primary/10 px-3 pb-3 pt-2 flex flex-col gap-2">
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        void handleSubmit();
                                    }
                                }}
                                placeholder="Write a comment… (⌘+Enter to send)"
                                rows={3}
                                className="w-full rounded border border-primary/15 bg-fill-secondary text-primary text-xs px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-alt"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={() => void handleSubmit()}
                                    disabled={!draft.trim() || submitting}
                                    className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-primary-inverse hover:opacity-90 disabled:opacity-40 transition-opacity"
                                >
                                    {submitting ? 'Posting…' : 'Post comment'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </SidePanel>
    );
}
