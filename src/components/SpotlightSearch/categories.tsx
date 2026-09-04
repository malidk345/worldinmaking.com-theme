import React from 'react'
import { IconBook, IconNewspaper, IconPeople, IconUser } from '@posthog/icons'
import { capitalizeFirstLetter } from '../../utils'

type TypeConfig = {
    type: string
    label: string
    icon: React.ReactNode
    aliases: string[]
}

const typeConfig: TypeConfig[] = [
    {
        type: 'notebook',
        label: 'Notebooks',
        icon: <IconBook />,
        aliases: ['notebooks', 'notebook', 'defter', 'defterler', 'notes'],
    },
    {
        type: 'post',
        label: 'Posts',
        icon: <IconNewspaper />,
        aliases: ['posts', 'post', 'yazı', 'yazilar', 'essays', 'articles', 'blog'],
    },
    {
        type: 'community',
        label: 'Community',
        icon: <IconPeople />,
        aliases: ['community', 'forum', 'questions', 'threads', 'topluluk'],
    },
    {
        type: 'person',
        label: 'People',
        icon: <IconUser />,
        aliases: ['people', 'person', 'profiles', 'users', 'kişiler', 'kisiler', 'authors'],
    },
]

export const configForType = (type: string): TypeConfig =>
    typeConfig.find((config) => config.type === type) ?? {
        type,
        label: capitalizeFirstLetter(type),
        icon: <IconBook />,
        aliases: [],
    }

export const matchCategory = (query: string): string | null => {
    const q = query.trim().toLowerCase()
    if (q.length < 3) return null
    for (const config of typeConfig) {
        if (config.aliases.some((alias) => alias.startsWith(q) || (q.length >= 4 && alias.includes(q)))) {
            return config.type
        }
    }
    return null
}

export const filterOptions: (string | null)[] = [null, ...typeConfig.map(({ type }) => type)]
