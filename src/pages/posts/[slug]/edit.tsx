import dynamic from 'next/dynamic'

const EditPostPage = dynamic(() => import('components/posts/EditPostPage'), {
    ssr: false,
    loading: () => null,
})

export const runtime = 'experimental-edge'

export default EditPostPage
