import postsData from './posts.json'

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Helper function to strip HTML tags for excerpt
const stripHtml = (html) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
}

// Helper function to extract sections from content
const extractSections = (content) => {
    if (!content) return []

    // Try to extract headings from content
    const headingMatches = content.matchAll(/<(h[1-6]|strong)[^>]*>([^<]+)<\/\1>/gi)
    const sections = []
    let index = 0

    for (const match of headingMatches) {
        const title = match[2].trim()
        if (title && title.length > 3 && title.length < 100) {
            sections.push({
                id: `section-${index}`,
                title: title.toLowerCase(),
                content: ''
            })
            index++
            if (index >= 6) break // Max 6 sections
        }
    }

    // If no sections found, create default ones
    if (sections.length === 0) {
        return [
            { id: 'introduction', title: 'introduction', content: stripHtml(content).substring(0, 300) }
        ]
    }

    return sections
}

// Transform WordPress posts to our format
export const posts = postsData.map((post, index) => ({
    id: post.id || index + 1,
    title: post.title,
    date: formatDate(post.postDate),
    category: post.categories?.[0]?.name || 'stories',
    excerpt: post.excerpt || stripHtml(post.content),
    author: { name: post.author || 'worldinmaking', role: 'Author' },
    featuredImage: post.featuredImage,
    slug: post.slug,
    content: post.content,
    tags: post.tags || [],
    sections: extractSections(post.content)
}))
