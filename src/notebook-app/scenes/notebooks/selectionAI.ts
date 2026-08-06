/**
 * Selection → Ask AI presets for the floating format toolbar.
 * Prompts ask for replacement markdown only (fills the Thinking… placeholder).
 */

export type SelectionAIActionId = 'rewrite' | 'challenge' | 'expand' | 'counter'

export type SelectionAIAction = {
    id: SelectionAIActionId
    label: string
    /** Short toolbar tooltip */
    tooltip: string
    /** Sent as the user request together with highlighted markdown */
    prompt: string
}

export const SELECTION_AI_ACTIONS: SelectionAIAction[] = [
    {
        id: 'rewrite',
        label: 'Rewrite',
        tooltip: 'Rewrite more clearly',
        prompt:
            'Rewrite the highlighted text more clearly and rigorously. Preserve meaning and intent. Return only the rewritten markdown — no preamble.',
    },
    {
        id: 'challenge',
        label: 'Challenge',
        tooltip: 'Challenge the claim',
        prompt:
            'Challenge the main claim in the highlighted text. Be precise, fair, and constructive. Return markdown only.',
    },
    {
        id: 'expand',
        label: 'Expand',
        tooltip: 'Expand with more detail',
        prompt:
            'Expand the highlighted text with more detail, nuance, and structure. Return only the expanded markdown.',
    },
    {
        id: 'counter',
        label: 'Counter',
        tooltip: 'Write a counter-position',
        prompt:
            'Write a strong counter-position to the highlighted text. Stay substantive, not dismissive. Return markdown only.',
    },
]
