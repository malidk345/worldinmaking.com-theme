import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

export const getStaticProps = ({ params }: { params: { slug: string } }) => ({
    props: { params },
    revalidate: 60,
})

// Do not prebuild every slug; resolve on demand from Supabase
export const getStaticPaths = () => ({
    paths: [],
    fallback: 'blocking',
})

export default PostPage
