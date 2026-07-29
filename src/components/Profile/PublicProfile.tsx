import React from 'react'
import ProfileView from './ProfileView'

interface PublicProfileProps {
    username: string
}

export default function PublicProfile({ username }: PublicProfileProps) {
    return <ProfileView profileIdOrUsername={username} />
}
