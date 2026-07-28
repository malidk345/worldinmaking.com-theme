import dynamic from 'next/dynamic'

const EditPostPage = dynamic(() => import('components/posts/EditPostPage'), {
    ssr: false,
    loading: () => null,
})

export const getStaticProps = ({ params }: { params?: { slug?: string } }) => ({ props: { params: params || {} } })
export const getStaticPaths = () => ({
    paths: [{ params: { slug: 'default' } }],
    fallback: false,
})
export default EditPostPage
