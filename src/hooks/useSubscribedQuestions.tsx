/**
 * Topic/question subscriptions — not yet on Supabase.
 * Returns empty list so UI never hits Squeak.
 */
export function useSubscribedQuestions() {
    return {
        questions: [] as any[],
        isLoading: false,
        refresh: async () => {},
    }
}

export default useSubscribedQuestions
