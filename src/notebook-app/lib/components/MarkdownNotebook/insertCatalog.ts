/**
 * Single slash catalog. Native markdown blocks are hardcoded in InsertMenu.
 * Registry tags in SLASH_REGISTRY_TAGS get `/` via insertCommand.
 * Extra keys are side-effect commands that still insert a block (Page).
 * Comment / invite / philosopher are not slash items — they live on block and share chrome.
 */

export const SLASH_NATIVE_KEYS = [
    'ai-ask',
    'text-paragraph',
    'media-table',
    'text-quote',
    'text-code',
    'text-heading-1',
    'text-heading-2',
    'text-heading-3',
    'text-bullet-list',
    'text-numbered-list',
    'text-todo-list',
] as const

export const SLASH_REGISTRY_TAGS = [
    'Image',
    'Callout',
    'Toggle',
    'DatabaseTable',
    'Divider',
    'Embed',
    'Latex',
] as const

export const SLASH_EXTRA_KEYS = ['page-subpage'] as const

/** Old hardcoded media keys — must not return. Image/Embed/LaTeX go through the registry. */
export const SLASH_REMOVED_KEYS = ['media-image', 'media-iframe', 'media-latex'] as const

export function isSlashRegistryTag(tagName: string): boolean {
    return (SLASH_REGISTRY_TAGS as readonly string[]).includes(tagName)
}

export function slashCatalogKeys(): string[] {
    return [
        ...SLASH_NATIVE_KEYS,
        ...SLASH_REGISTRY_TAGS.map((tagName) => `component-${tagName}`),
        ...SLASH_EXTRA_KEYS,
    ]
}

export function findDuplicateStrings(values: string[]): string[] {
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const value of values) {
        const key = value.toLowerCase()
        if (seen.has(key)) {
            duplicates.push(value)
        }
        seen.add(key)
    }
    return duplicates
}
