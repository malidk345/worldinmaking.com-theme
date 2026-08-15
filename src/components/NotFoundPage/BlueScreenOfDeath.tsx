import React from 'react'
import Link from 'components/Link'

export default function BlueScreenOfDeath(): JSX.Element {
    return (
        <div
            className="absolute inset-0 flex items-center justify-center p-8"
            style={{ backgroundColor: '#0000aa', color: '#ffffff', fontFamily: 'monospace, "Courier New"' }}
        >
            <div className="max-w-lg w-full text-sm leading-relaxed text-center">
                <div className="mb-8">
                    <div className="text-xl font-bold mb-2">WorldInMaking</div>
                    <div>A fatal exception 404 has occurred.</div>
                    <div>The page you requested could not be found.</div>
                </div>
                <div className="mb-8">
                    <Link href="/" className="text-white underline">
                        Press here to go home
                    </Link>
                </div>
                <div className="flex items-center justify-center text-xs">
                    <span>System halted.</span>
                    <span className="ml-1 bg-white w-2 h-4 inline-block animate-pulse" />
                </div>
            </div>
        </div>
    )
}
