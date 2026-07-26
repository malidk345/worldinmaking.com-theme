import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Provider } from '../../context/App'
import Wrapper from '../../components/Wrapper'

const Inbox = dynamic(() => import('../../components/Inbox'), { ssr: false })

export default function QuestionDetailPage() {
    const router = useRouter()
    const permalink = String(router.query.permalink || '')
    const fullPath = `/questions/${permalink}`
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: fullPath } as any)

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<Inbox path={fullPath} permalink={permalink} />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
