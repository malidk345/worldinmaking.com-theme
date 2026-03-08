"use client"

import React from 'react'
import PublicProfile from 'components/Profile/PublicProfile'

type CorpusViewProps = {
    username: string
    startEditingProfile?: boolean
}

export default function CorpusView({ username }: CorpusViewProps) {
    return <PublicProfile username={username} />
}
