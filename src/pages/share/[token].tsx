import React from 'react'
import { useRouter } from 'next/router'
import { SharedChatView } from '../../components/Share/SharedChatView'

function tokenFromRouter(asPath: string, queryToken: string | string[] | undefined): string {
    if (typeof queryToken === 'string' && queryToken) return queryToken
    const path = asPath.split('?')[0] || ''
    if (!path.startsWith('/share/')) return ''
    try {
        return decodeURIComponent(path.slice('/share/'.length))
    } catch {
        return path.slice('/share/'.length)
    }
}

export default function SharedChatPage() {
    const router = useRouter()
    const token = tokenFromRouter(router.asPath, router.query.token)
    return <SharedChatView token={router.isReady ? token : ''} />
}
