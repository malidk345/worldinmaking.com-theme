import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

export const getStaticProps = ({ params }: { params: { slug: string } }) => ({ props: { params } })
export const getStaticPaths = () => ({ paths: [], fallback: true })
export default PostPage
