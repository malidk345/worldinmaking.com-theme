import type { Metadata } from 'next'

type Props = {
    params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params
    return {
        title: `${username}'s Profile | World in Making`,
        description: `Explore the profile, digital garden, and published works of ${username}.`,
    }
}

export { default } from './page-client'
