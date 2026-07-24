import React from 'react'
import PostListing from 'templates/PostListing'

export default function BlogPage(props: any) {
    return <PostListing {...props} activeMenu="blog" root="blog" title="Blog" />
}
