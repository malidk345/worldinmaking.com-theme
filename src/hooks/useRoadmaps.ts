/**
 * Roadmaps — PostHog Squeak feature. Stubbed for WIM (Supabase-only).
 * Keeps export shapes so UI does not crash; data is empty until a WIM table exists.
 */

export type EmojiReaction = {
    emoji: string
    count: number
    reacted?: boolean
}

export const useRoadmaps = ({ params = {}, limit }: { params?: any; limit?: number } = {}) => {
    return {
        roadmaps: [] as any[],
        isLoading: false,
        isValidating: false,
        error: undefined as Error | undefined,
        size: 0,
        setSize: (_n: number) => {},
        mutate: async () => undefined,
        hasMore: false,
        fetchMore: () => {},
        params,
        limit,
    }
}

export const fetchRoadmapReactions = async (_roadmapId: number | string): Promise<EmojiReaction[]> => {
    return []
}

export const addRoadmapEmojiReaction = async (_args: {
    roadmapId: number | string
    emoji: string
    jwt?: string | null
}): Promise<void> => {
    /* no-op on WIM */
}

export default useRoadmaps
