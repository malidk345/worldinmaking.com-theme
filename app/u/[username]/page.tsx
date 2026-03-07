import type { Metadata } from 'next'

type Props = {
    params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params
    return {
        title: `${username}'s Corpus | World in Making`,
        description: `Explore the digital garden and published works of ${username}.`,
    }
}

export { default } from './page-client'
