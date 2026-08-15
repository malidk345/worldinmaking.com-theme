import { LemonButton } from '~nb-lib/lemon-ui/index'
import { IconSparkles } from '@posthog/icons'
import type { AskAIDropdownProps } from './types'
import { useAppActions, useAppSettings, useAppWindows } from '../../../../context/App'
import { bindNotebookChat } from '../../../../lib/notebook-chat-bind'
import { openAskAiWindow } from '../../../../lib/open-ask-ai-window'

export type { AskAIDropdownProps }
export type { ChatMessage, ThinkingStageView, OSActionCard } from './types'

export function AskAIDropdown({
    notebookId,
    notebookTitle,
}: AskAIDropdownProps): JSX.Element {
    const { addWindow, updateWindow, handleSnapToSide } = useAppActions()
    const { windows } = useAppWindows()
    const { isMobile } = useAppSettings()

    return (
        <LemonButton
            size="small"
            type="secondary"
            icon={<IconSparkles />}
            onClick={() => {
                if (notebookId) {
                    bindNotebookChat({ notebookId, title: notebookTitle })
                }
                openAskAiWindow({
                    notebookId,
                    notebookTitle,
                    windows,
                    isMobile,
                    addWindow,
                    updateWindow,
                    snapWindow: handleSnapToSide,
                })
            }}
            tooltip={notebookId ? 'Edit this notebook with AI' : 'Open AI Assistant'}
        >
            <span className="hidden sm:inline">Ask AI</span>
        </LemonButton>
    )
}
