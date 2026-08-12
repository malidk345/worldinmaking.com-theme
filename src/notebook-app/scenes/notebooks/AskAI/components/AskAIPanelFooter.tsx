import { LemonButton, LemonSelect, LemonTag, LemonTextArea } from '~nb-lib/lemon-ui/index'
import { IconArrowRight } from '@posthog/icons'
import type { PhilosopherBot } from '~nb-lib/philosophers'
import { buildBotSelectOptions } from '../utils'
import { useMemo } from 'react'

interface AskAIPanelFooterProps {
    prompt: string
    setPrompt: (v: string) => void
    isGenerating: boolean
    contentLength: number
    selectedBotId: string
    roster: PhilosopherBot[]
    activeBot: PhilosopherBot
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    onSubmit: () => void
    onBotChange: (botId: string) => void
}

export function AskAIPanelFooter({
    prompt,
    setPrompt,
    isGenerating,
    contentLength,
    selectedBotId,
    roster,
    activeBot,
    textareaRef,
    onSubmit,
    onBotChange,
}: AskAIPanelFooterProps): JSX.Element {
    const botSelectOptions = useMemo(() => buildBotSelectOptions(roster), [roster])

    return (
        <div className="p-2.5 border-t border-primary bg-primary flex-shrink-0 rounded-b">
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    if (prompt.trim() && !isGenerating) onSubmit()
                }}
                className="w-full"
            >
                <div className="input-like flex flex-col cursor-text border border-primary bg-surface-primary rounded-xl p-2.5 space-y-2 shadow-xs transition-all focus-within:border-[var(--color-border-bold)]">
                    {/* Context badge */}
                    {contentLength > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5 px-0.5">
                            <LemonTag type="completion" size="small" className="text-[10px] truncate max-w-[160px]">
                                @ Context ({contentLength} chars)
                            </LemonTag>
                        </div>
                    )}

                    {/* Textarea */}
                    <LemonTextArea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(val) => setPrompt(val)}
                        placeholder="Ask follow-up or / for commands..."
                        minRows={2}
                        maxRows={5}
                        className="!border-none !bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed p-0 shadow-none font-normal"
                        onPressEnter={() => {
                            if (prompt.trim() && !isGenerating) onSubmit()
                        }}
                    />

                    {/* Controls row */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--color-border-primary)]">
                        {/* Bot selector */}
                        <div className="flex items-center gap-1 min-w-0">
                            <LemonSelect
                                value={selectedBotId}
                                onChange={(val) => {
                                    if (val) onBotChange(val)
                                }}
                                options={botSelectOptions}
                                size="xsmall"
                                type="tertiary"
                                dropdownPlacement="top-start"
                                dropdownMatchSelectWidth={false}
                            />
                        </div>

                        {/* Send button */}
                        <div className="shrink-0">
                            <LemonButton
                                size="xsmall"
                                type="primary"
                                htmlType="submit"
                                icon={<IconArrowRight />}
                                loading={isGenerating}
                                disabled={!prompt.trim()}
                                tooltip={`Send to ${activeBot.name}`}
                                className="rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
