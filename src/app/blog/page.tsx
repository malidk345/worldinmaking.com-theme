'use client'

import React from 'react'
import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'
import PostListing from '../../templates/PostListing'

function PostListingContainer() {
    return <PostListing pageContext={{ root: 'blog', selectedTag: null }} />
}

export default function BlogPage() {
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: '/blog' } as any)

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<PostListingContainer />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
