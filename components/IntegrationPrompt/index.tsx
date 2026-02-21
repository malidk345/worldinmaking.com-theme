import React, { useState } from 'react'
import OSButton from 'components/OSButton'

export default function IntegrationPrompt(): JSX.Element {
    const [apiKey, setApiKey] = useState('')

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Get started with PostHog</h3>
            <p className="text-sm text-secondary">
                Enter your project API key to continue, or create a new account.
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="phc_..."
                    className="flex-1 px-3 py-2 border border-input rounded bg-white dark:bg-dark text-primary dark:text-primary-dark text-sm font-mono"
                />
                <OSButton variant="primary" type="button" size="sm">
                    Continue
                </OSButton>
            </div>
            <p className="text-xs text-muted">
                Don't have an account?{' '}
                <a href="https://app.posthog.com/signup" className="text-blue underline">
                    Sign up for free
                </a>
            </p>
        </div>
    )
}
