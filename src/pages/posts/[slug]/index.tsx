import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

/**
 * Edge SSR instead of ISR (getStaticPaths fallback: 'blocking' + revalidate).
 * Pages Router + getServerSideProps requires `experimental-edge` (not `edge`).
 * next-on-pages treats experimental-edge as valid Cloudflare Edge.
 */
export const config = {
    runtime: 'experimental-edge',
}

export const getServerSideProps = ({ params }: { params: { slug: string } }) => ({
    props: { params: params || {} },
})

export default PostPage
