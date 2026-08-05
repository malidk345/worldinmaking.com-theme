export const themeLogic = { values: { isDarkModeOn: false } }

/** Host site theme (body/html .dark) — do not invent a second theme store. */
function isHostDark(): boolean {
    if (typeof document === 'undefined') return false
    return (
        document.body?.classList.contains('dark') ||
        document.documentElement?.classList.contains('dark') ||
        document.documentElement?.dataset?.notebookHostTheme === 'dark'
    )
}

export function useValues(_l: any) {
    return { isDarkModeOn: isHostDark() }
}
