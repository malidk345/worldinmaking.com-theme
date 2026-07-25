import algoliasearch from 'algoliasearch/lite'

export const algoliaSearchClient = algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string,
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY as string
)

export const algoliaIndexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string
