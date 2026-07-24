export interface ContentNode {
    fields: {
        slug: string
    }
    rawBody: string
    frontmatter?: {
        title: string
        description?: string
    }
}

export interface ContentData {
    allMdx: {
        nodes: ContentNode[]
    }
}

/**
 * Hook to fetch content from multiple directories (tutorials, product-engineers, founders)
 * for use in product pages' QuestionsSlide component
 */
export function useContentData(): ContentData {
    const data = {}

    return data
}
