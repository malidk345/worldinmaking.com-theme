import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic';
const EditPost = dynamic(() => import('components/Edition/EditPost'), { ssr: false });
import Layout from 'components/Layout'
import SEO from 'components/seo'
import { communityMenu } from '../../../navs'
import { useUser } from 'hooks/useUser'

export const getStaticProps = () => ({ props: {} })
export const getStaticPaths = () => ({ paths: [], fallback: true })

export default function Edit() {
    const router = useRouter()
    const state = {} as any
    const { fetchUser } = useUser()
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        fetchUser()
            .then((user) => {
                if (user?.role?.type !== 'moderator' || !state?.id || !state?.initialValues) {
                    return router.push('/posts')
                }
                setLoading(false)
            })
            .catch(() => router.push('/posts'))
    }, [])
    if (!mounted) return null
    return (
        !loading && (
            <Layout parent={communityMenu} activeInternalMenu={communityMenu.children[0]}>
                <SEO title="Edit post - PostHog" noindex />
                <section className="px-5">
                    <EditPost initialValues={state.initialValues} id={state.id} />
                </section>
            </Layout>
        )
    )
}
