export const BlogPosts = ({ render }: { render: (posts: Array<any>) => JSX.Element }) => {
    const postData = {}
    const posts = postData.allMdx.edges
        .filter((edge) => !!edge.node.frontmatter.date)
        .sort((a, b) => new Date(b.node.frontmatter.date) - new Date(a.node.frontmatter.date))

    return render(posts)
}

