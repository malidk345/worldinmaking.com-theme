export const themeLogic = { values: { isDarkModeOn: false } }
export function useValues(_l: any) { return { isDarkModeOn: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') } }
