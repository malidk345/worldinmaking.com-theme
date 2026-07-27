import React from 'react'
import dynamic from 'next/dynamic'

import Inbox from '../../components/Inbox'

export default function QuestionsIndexPage() {
    return <Inbox path="/questions" />
}
