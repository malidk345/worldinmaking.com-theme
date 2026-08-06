import dynamic from 'next/dynamic'

const PostPage = dynamic(() => import('components/posts/PostPage'), {
    ssr: false,
    loading: () => null,
})

/**
 * Edge SSR instead of ISR (getStaticPaths fallback: 'blocking' + revalidate).
 * next-on-pages rejects Node-runtime on-demand prerender for this route
 * ("Invalid prerender config" + missing Edge Runtime).
 */
export const runtime = 'edge'
/** Pages Router also reads `config.runtime` for getServerSideProps. */
export const config = { runtime: 'edge' as const }

export const getServerSideProps = ({ params }: { params: { slug: string } }) => ({
    props: { params: params || {} },
})
export default PostPage
