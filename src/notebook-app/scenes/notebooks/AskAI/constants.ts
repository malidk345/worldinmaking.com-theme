import { IconTable, IconSparkles, IconPencil, IconList } from '@posthog/icons'

export const EDITORIAL_SUGGESTIONS = [
    {
        label: 'Comparison table',
        icon: IconTable,
        prompt: 'Convert this notebook data into a structured Markdown comparison table',
    },
    {
        label: 'Executive summary',
        icon: IconSparkles,
        prompt: 'Generate a concise Executive Summary with key takeaways for the top of this notebook',
    },
    {
        label: 'Polish & format',
        icon: IconPencil,
        prompt: 'Polish and format this notebook into clean Markdown with proper headers and bullet points',
    },
    {
        label: 'Extract tasks',
        icon: IconList,
        prompt: 'Extract an Actionable Task List (To-Do items) from this notebook',
    },
    {
        label: 'Translate to Turkish',
        icon: IconSparkles,
        prompt: 'Translate the entire notebook content into Turkish keeping all formatting',
    },
    {
        label: 'Rewrite rigorously',
        icon: IconPencil,
        prompt: 'Rewrite & refactor this notebook in a more rigorous and persuasive tone',
    },
]

/**
 * Content layout matches CollaboratorsBanner / NotebookSelectButton.
 * Shell (bg, border, radius, shadow) comes from Lemon Popover__box — do not re-chrome here.
 */
export const PANEL_CLASS_NAME =
    'w-[min(100vw-1.5rem,22.5rem)] sm:w-[28.5rem] max-h-[min(78dvh,40rem)] p-3 space-y-3 text-xs overflow-y-auto overscroll-contain bg-[var(--color-bg-surface-secondary)]'
