import { ProfilePicture } from '~nb-lib/lemon-ui/index'
import { philosopherAsUser, type PhilosopherBot } from '~nb-lib/philosophers'
import type { ChatMessage } from './types'

/**
 * Determines whether the smart "Insert into notebook" button should appear
 * below an AI reply message.
 */
export function shouldShowInsertButton(msg: ChatMessage, allMessages: ChatMessage[]): boolean {
    if (msg.sender !== 'ai') return false
    if (msg.hasTable) return true
    if (msg.text.includes('```mermaid') || msg.text.includes('```')) return true

    const msgIdx = allMessages.findIndex((m) => m.id === msg.id)
    const userPrompt = msgIdx > 0 ? allMessages[msgIdx - 1]?.text || '' : ''

    const intentKeywords = [
        'insert', 'notebook', 'table', 'diagram', 'chart', 'schema', 'summary',
        'list', 'note', 'write', 'generate', 'create', 'tablo', 'şema', 'ekle',
        'özet', 'liste', 'kod', 'hazırla', 'döküman', 'dokuman', 'çıkar', 'cikar',
    ]

    const combined = (userPrompt + ' ' + msg.text).toLowerCase()
    return intentKeywords.some((kw) => combined.includes(kw))
}

/**
 * Builds grouped LemonSelect options from the philosopher roster.
 */
export function buildBotSelectOptions(roster: PhilosopherBot[]) {
    return [
        {
            title: 'Philosopher bots',
            options: roster.map((bot) => ({
                value: bot.id,
                label: (
                    <span className="flex items-center gap-2 py-0.5 min-w-0">
                        <ProfilePicture user={philosopherAsUser(bot)} size="sm" />
                        <span className="flex flex-col leading-tight min-w-0">
                            <span className="font-medium text-xs truncate text-primary">{bot.displayName}</span>
                            <span className="text-[10px] text-muted truncate">{bot.shortStance}</span>
                        </span>
                    </span>
                ),
            })),
        },
    ]
}

/**
 * Parses <thinking><perceive/><frame/><tension/><move/></thinking> XML tags
 * from raw LLM output and returns structured ThinkingStageView[].
 */
export function parseThinkingTags(raw: string): { stages: Array<{ id: string; label: string; text: string }> | null; cleanText: string } {
    const thinkMatch = raw.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i)
    if (!thinkMatch) {
        return { stages: null, cleanText: raw }
    }

    const thinkBody = thinkMatch[1]
    const p = (thinkBody.match(/<perceive>([\s\S]*?)(?:<\/perceive>|$)/i) || [])[1]?.trim()
    const f = (thinkBody.match(/<frame>([\s\S]*?)(?:<\/frame>|$)/i) || [])[1]?.trim()
    const t = (thinkBody.match(/<tension>([\s\S]*?)(?:<\/tension>|$)/i) || [])[1]?.trim()
    const m = (thinkBody.match(/<move>([\s\S]*?)(?:<\/move>|$)/i) || [])[1]?.trim()

    const stages: Array<{ id: string; label: string; text: string }> = []
    if (p) stages.push({ id: 'perceive', label: 'Perceive', text: p })
    if (f) stages.push({ id: 'frame', label: 'Frame', text: f })
    if (t) stages.push({ id: 'tension', label: 'Tension', text: t })
    if (m) stages.push({ id: 'move', label: 'Move', text: m })

    const cleanText = raw.replace(/<thinking>[\s\S]*?(?:<\/thinking>|$)/gi, '').trim()

    return { stages: stages.length > 0 ? stages : null, cleanText }
}
