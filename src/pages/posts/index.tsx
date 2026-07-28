import React from 'react'
import PostListing from '../../templates/PostListing'

export default function PostsIndexPage(props: any) {
    return <PostListing {...props} activeMenu="posts" root="posts" title="Posts" />
}
