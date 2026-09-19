import React from 'react'
import { AppIcon, type AppIconName } from 'components/OSIcons/AppIcon'
import OSButton from 'components/OSButton'
import {
    APPS_BLURB_CLASS,
    APPS_FIELDSET_CHROME_CLASS,
    APPS_ICON_CLASS,
    APPS_ROW_CLASS,
    APPS_TITLE_CLASS,
} from 'components/Home/appsCardClasses'
import type { OSActionCard as OSActionCardType } from '../types'

interface OSActionCardProps {
    action: OSActionCardType
    onExecute: () => void
    isStreaming?: boolean
}

function actionAppIcon(type: string): AppIconName {
    switch (type) {
        case 'create_forum_topic':
        case 'publish_to_forum':
            return 'forums'
        case 'manage_windows':
        case 'open_window':
            return 'home'
        case 'set_system_appearance':
            return 'page'
        case 'create_notebook':
        case 'insert_notebook_block':
        case 'rewrite_notebook_document':
        case 'replace_notebook_selection':
        case 'update_notebook_title':
        case 'annotate_notebook':
        case 'add_notebook_footnote':
            return 'notebook'
        default:
            return 'wimAi'
    }
}

/**
 * WIM AI executable action card — visual tokens match Home → Apps rows
 * (`APPS_*` from `components/Home/appsCardClasses`).
 */
export function OSActionCard({ action, onExecute, isStreaming }: OSActionCardProps): JSX.Element {
    const content = action.payload?.content?.trim()
    let buttonLabel = 'Apply'
    if (action.type === 'annotate_notebook') buttonLabel = 'Annotate'
    else if (action.type === 'add_notebook_footnote') buttonLabel = 'Add footnote'
    else if (action.type === 'insert_notebook_block') buttonLabel = 'Add to notebook'
    else if (action.type === 'rewrite_notebook_document') buttonLabel = 'Rewrite notebook'
    else if (action.type === 'replace_notebook_selection') buttonLabel = 'Replace selection'

    const title = action.title || buttonLabel
    const blurb = action.description?.trim()

    return (
        <div className={`mt-2 ${APPS_FIELDSET_CHROME_CLASS}`}>
            <div className={APPS_ROW_CLASS}>
                <AppIcon name={actionAppIcon(action.type)} className={APPS_ICON_CLASS} />
                <span className="min-w-0 flex-1">
                    <span className={`${APPS_TITLE_CLASS} truncate`}>{title}</span>
                    {blurb && blurb !== title ? <span className={APPS_BLURB_CLASS}>{blurb}</span> : null}
                </span>

                <div className="shrink-0">
                    {action.executed ? (
                        <span className="text-xs text-muted font-medium">Added ✓</span>
                    ) : isStreaming ? (
                        <span className="text-xs text-muted animate-pulse">Preparing…</span>
                    ) : (
                        <OSButton
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                                e.stopPropagation()
                                onExecute()
                            }}
                        >
                            {buttonLabel}
                        </OSButton>
                    )}
                </div>
            </div>

            {content ? (
                <div className="mt-1 border-t border-primary pt-2 text-xs leading-relaxed text-secondary whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {content}
                </div>
            ) : null}
        </div>
    )
}
