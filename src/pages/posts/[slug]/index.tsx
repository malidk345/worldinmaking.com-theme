import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

export const getStaticProps = () => ({ props: {} })
export const getStaticPaths = () => ({ paths: [], fallback: false })
export default PostPage
