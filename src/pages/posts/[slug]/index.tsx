import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

export const runtime = 'experimental-edge'

export default PostPage
