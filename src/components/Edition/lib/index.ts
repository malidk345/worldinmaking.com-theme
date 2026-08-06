export const fetchCategories = (query = '') => {
    const host = process.env.NEXT_PUBLIC_SQUEAK_API_HOST
    if (!host) return Promise.resolve([])
    return fetch(`${host}/api/post-categories?${query}`)
        .then((res) => res.json())
        .then((data) => {
            const categories = data?.data
            return categories || []
        })
        .catch(() => [])
}
