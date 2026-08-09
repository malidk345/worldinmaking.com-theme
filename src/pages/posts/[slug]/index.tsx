import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

export const getServerSideProps = ({ params }: { params: { slug: string } }) => ({
    props: { params: params || {} },
})

export default PostPage
