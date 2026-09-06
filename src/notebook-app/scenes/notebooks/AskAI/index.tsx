import { IconSparkles } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
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
        <Tooltip
            trigger={
                <OSButton
                    icon={<IconSparkles />}
                    size="md"
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
                />
            }
            side="bottom"
        >
            {notebookId ? 'Edit this notebook with AI' : 'Open AI Assistant'}
        </Tooltip>
    )
}
