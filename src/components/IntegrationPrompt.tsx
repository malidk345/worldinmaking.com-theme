import React from 'react'
import Link from './Link'
import { IconTerminal } from '@posthog/icons'

const INSTALL_COMMAND = `Install PostHog in my project. Use the PostHog docs at https://posthog.com/docs to find the correct SDK for my project and install it. Also, use environment variables where possible for the API key and host.`

export default function IntegrationPrompt() {
    return (
        <>
            <h3>Install with AI in a single prompt</h3>
            <p className="text-[15px]">Paste into your terminal or code editor and make AI do the work.</p>
            <div className="relative group mt-2">
                <pre className="bg-accent rounded-md p-4 text-sm overflow-x-auto whitespace-pre-wrap break-words border border-border">
                    <code>{INSTALL_COMMAND}</code>
                </pre>
                <button
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition"
                    onClick={() => navigator.clipboard.writeText(INSTALL_COMMAND)}
                >
                    Copy
                </button>
            </div>
            <p className="text-sm text-secondary mt-2">
                Or{' '}
                <Link to="/docs/getting-started/install?tab=snippet">
                    install manually
                </Link>
                .
            </p>
        </>
    )
}
