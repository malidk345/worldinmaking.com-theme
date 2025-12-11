const path = require('path')
const postsData = require('./src/data/posts.json')

exports.createPages = async ({ actions }) => {
    const { createPage } = actions
    const categoryTemplate = path.resolve('./src/templates/CategoryTemplate.js')
    const postTemplate = path.resolve('./src/templates/PostTemplate.js')

    // Extract unique categories using the same logic as postsUtils.js
    const categories = new Set()

    postsData.forEach(post => {
        // Logic from postsUtils.js: post.categories?.[0]?.name || 'stories'
        const categoryName = (post.categories && post.categories[0] && post.categories[0].name)
            ? post.categories[0].name
            : 'stories'

        if (categoryName) {
            categories.add(categoryName.toLowerCase())
        }
    })

    // Create page for each category
    categories.forEach(category => {
        createPage({
            path: `/category/${category}`,
            component: categoryTemplate,
            context: {
                category,
            },
        })
    })

    // Create page for each post
    postsData.forEach(post => {
        createPage({
            path: `/post/${post.slug}`,
            component: postTemplate,
            context: {
                postId: post.id,
            },
        })
    })
}
