import dynamic from 'next/dynamic'

const NewPostPage = dynamic(() => import('components/posts/NewPostPage'), {
    ssr: false,
    loading: () => null,
})

export const getStaticProps = () => ({ props: {} })
export default NewPostPage
