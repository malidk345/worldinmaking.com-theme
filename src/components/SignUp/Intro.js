import Link from 'components/Link'
import WimLogo from 'components/WimLogo'
import React from 'react'
import { heading, section } from './classes'

export default function Intro({ title, children = null }) {
    return (
        <div className={section()}>
            <Link to="/">
                <WimLogo className="mx-auto size-10" />
            </Link>
            <h1 className={heading('mt-6')}>{title}</h1>
            {children}
        </div>
    )
}
