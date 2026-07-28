import dynamic from 'next/dynamic'

const EditPostPage = dynamic(() => import('components/posts/EditPostPage'), {
    ssr: false,
    loading: () => null,
})

export const getStaticProps = () => ({ props: {} })
export const getStaticPaths = () => ({ paths: [], fallback: 'blocking' })
export default EditPostPage
