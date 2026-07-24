import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import NewPost from 'components/Edition/NewPost'
import Layout from 'components/Layout'
import SEO from 'components/seo'
import { communityMenu } from '../../navs'
import { useUser } from 'hooks/useUser'
export default function New() {
    const { fetchUser } = useUser()
    const [loading, setLoading] = useState(true)
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
