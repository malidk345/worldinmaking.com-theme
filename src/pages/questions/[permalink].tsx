import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

import Inbox from '../../components/Inbox'

export default function QuestionDetailPage() {
    const router = useRouter()
    const permalink = String(router.query.permalink || '')
    const fullPath = `/questions/${permalink}`

    return <Inbox path={fullPath} permalink={permalink} />
}
