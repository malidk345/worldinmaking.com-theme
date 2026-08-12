import * as Portal from '@radix-ui/react-portal'
import { AnimatePresence, motion } from 'framer-motion'
import { AskAIPanelHeader } from './AskAIPanelHeader'
import { AskAIPanelBody } from './AskAIPanelBody'
import { AskAIPanelFooter } from './AskAIPanelFooter'
import type { ChatMessage, OSActionCard } from '../types'
import type { PhilosopherBot } from '~nb-lib/philosophers'

interface AskAIPanelProps {
    isOpen: boolean
    isDark: boolean
    panelRef: React.RefObject<HTMLDivElement | null>
    panelStyle: React.CSSProperties | undefined
    // header
    activeBot: PhilosopherBot
    contentLength: number
    hasThread: boolean
    onClear: () => void
    onClose: () => void
    // body
    messages: ChatMessage[]
    isGenerating: boolean
    roster: PhilosopherBot[]
    chatEndRef: React.RefObject<HTMLDivElement | null>
    onInsert: (text: string) => void
    onExecuteOSAction: (msgId: string, action: OSActionCard) => void
    onSendPrompt: (prompt: string) => void
    // footer
    prompt: string
    setPrompt: (v: string) => void
    selectedBotId: string
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    onSubmit: () => void
    onBotChange: (botId: string) => void
}

export function AskAIPanel({
    isOpen, isDark, panelRef, panelStyle,
    activeBot, contentLength, hasThread, onClear, onClose,
    messages, isGenerating, roster, chatEndRef, onInsert, onExecuteOSAction, onSendPrompt,
    prompt, setPrompt, selectedBotId, textareaRef, onSubmit, onBotChange,
}: AskAIPanelProps): JSX.Element {
    return (
        <Portal.Root>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={panelRef}
                        data-scheme="primary"
                        initial={{ translateX: '100%' }}
                        animate={{ translateX: 0 }}
                        exit={{ translateX: '100%' }}
                        transition={{ duration: 0.3, type: 'tween' }}
                        style={panelStyle}
                        className={`fixed w-96 max-w-[calc(100vw-1rem)] bg-primary border border-primary rounded shadow-xl z-50 text-primary flex flex-col notebook-app-scope ${isDark ? 'dark' : ''}`}
                    >
                        <div className="h-full flex flex-col min-h-0">
                            <AskAIPanelHeader
                                activeBot={activeBot}
                                contentLength={contentLength}
                                hasThread={hasThread}
                                onClear={onClear}
                                onClose={onClose}
                            />
                            <AskAIPanelBody
                                messages={messages}
                                isGenerating={isGenerating}
                                roster={roster}
                                activeBot={activeBot}
                                hasThread={hasThread}
                                chatEndRef={chatEndRef}
                                onInsert={onInsert}
                                onExecuteOSAction={onExecuteOSAction}
                                onSendPrompt={onSendPrompt}
                            />
                            <AskAIPanelFooter
                                prompt={prompt}
                                setPrompt={setPrompt}
                                isGenerating={isGenerating}
                                contentLength={contentLength}
                                selectedBotId={selectedBotId}
                                roster={roster}
                                activeBot={activeBot}
                                textareaRef={textareaRef}
                                onSubmit={onSubmit}
                                onBotChange={onBotChange}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Portal.Root>
    )
}
