import { LemonButton } from '~nb-lib/lemon-ui/index'
import { IconSparkles } from '@posthog/icons'
import type { AskAIDropdownProps } from './types'
import { useAppActions } from '../../../../context/App'

export type { AskAIDropdownProps }
export type { ChatMessage, ThinkingStageView, OSActionCard } from './types'

export function AskAIDropdown({ onInsertPromptBlock, currentNotebookContent }: AskAIDropdownProps): JSX.Element {
    const { setIsClaudeChatOpen } = useAppActions()

    return (
        <LemonButton
            size="small"
            type="secondary"
            icon={<IconSparkles />}
            onClick={() => setIsClaudeChatOpen(true)}
            tooltip="Open AI Assistant"
        >
            <span className="hidden sm:inline">Ask AI</span>
        </LemonButton>
    )
}
