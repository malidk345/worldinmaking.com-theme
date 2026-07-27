import React from 'react'
import dynamic from 'next/dynamic'

import Inbox from '../../components/Inbox'

export default function ForumIndexPage() {
    return <Inbox path="/questions" />
}
