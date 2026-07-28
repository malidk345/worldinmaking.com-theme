import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic';
const NewPost = dynamic(() => import('components/Edition/NewPost'), { ssr: false });
import Layout from 'components/Layout'
import SEO from 'components/seo'
import { communityMenu } from '../../navs'
import { useUser } from 'hooks/useUser'

export const getStaticProps = () => ({ props: {} })

export default function New() {
    const router = useRouter()
    const { fetchUser } = useUser()
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        fetchUser()
            .then((user) => {
                if (user?.role?.type !== 'moderator') {
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
                <SEO title="New post - PostHog" noindex />
                <section className="px-5">
                    <NewPost />
                </section>
            </Layout>
        )
    )
}
